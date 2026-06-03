/**
 * Reenvío del DTO de telemetría a la API SmartSense.
 *
 * POST `${apiUrl}/iot/telemetry` con `Authorization: Bearer <token>` (si hay
 * token) y `content-type: application/json`. Usa el `fetch` global.
 *
 * NUNCA imprime el token. En error de red propaga un error claro.
 */
import type { TelemetryIngest } from './telemetry-contract.js';

export interface ForwardOptions {
  readonly apiUrl: string;
  readonly token?: string | undefined;
  /** Inyectable para testing; por defecto usa el fetch global. */
  readonly fetchImpl?: typeof fetch;
}

export interface ForwardResult {
  readonly status: number;
  readonly body: unknown;
}

export class ForwardError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ForwardError';
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

const TELEMETRY_PATH = '/iot/telemetry';

function buildUrl(apiUrl: string): string {
  const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  return `${base}${TELEMETRY_PATH}`;
}

export async function forward(
  dto: TelemetryIngest,
  options: ForwardOptions,
): Promise<ForwardResult> {
  const { apiUrl, token, fetchImpl = fetch } = options;
  const url = buildUrl(apiUrl);

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token !== undefined && token.length > 0) {
    headers.authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    });
  } catch (cause) {
    // No incluir token ni headers en el mensaje.
    throw new ForwardError(
      `error de red al reenviar a ${url}: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }

  let body: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body };
}
