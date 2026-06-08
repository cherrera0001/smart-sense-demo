/**
 * Contrato de ingesta de telemetría para el iot-bridge.
 *
 * Valida un payload (DTO plano de POST /iot/telemetry) usando
 * `telemetryIngestSchema` de @smartsense/shared. Reexpone `computeEventHash`
 * para el cálculo determinista de idempotencia.
 */
import {
  telemetryIngestSchema,
  computeEventHash,
  type TelemetryIngest,
} from '@smartsense/shared';

export { computeEventHash };
export type { TelemetryIngest };

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ValidateIngestResult =
  | { readonly ok: true; readonly data: TelemetryIngest }
  | { readonly ok: false; readonly errors: ValidationIssue[] };

/**
 * Valida un payload contra el contrato de ingesta. No lanza: devuelve un
 * resultado discriminado con los errores formateados cuando es inválido.
 */
export function validateIngest(payload: unknown): ValidateIngestResult {
  const parsed = telemetryIngestSchema.safeParse(payload);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const errors: ValidationIssue[] = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
  return { ok: false, errors };
}
