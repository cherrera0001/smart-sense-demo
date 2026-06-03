/**
 * API client scaffold — PREPARATORIO Fase 2. NO se usa en la UI todavía.
 * La demo sigue 100% bajo DEMO_MODE (lib/fixtures). Este cliente se activará por módulo
 * en una fase posterior, solo cuando exista paridad verde y autorización explícita.
 * Ver docs/architecture/frontend-transition-plan.md y backend-transition-plan.md §9.
 */
import { isDemoMode } from '@/lib/config/demo-mode';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  traceId?: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
}

/**
 * Fetch tipado contra la API. En DEMO_MODE NO debe invocarse (la UI usa fixtures); si se
 * llama bajo demo, falla ruidoso para evitar acoplar mock con red por accidente.
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (isDemoMode) {
    throw new Error(`apiFetch llamado bajo DEMO_MODE (${path}). La demo usa lib/fixtures.`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & Partial<ApiError>;
  if (!res.ok) {
    throw new ApiClientError(res.status, json as ApiError);
  }
  return json as T;
}
