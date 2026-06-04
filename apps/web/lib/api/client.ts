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

/**
 * Métodos de Fase 4 (dashboard/reportes/desglose). PREPARATORIOS: NO se usan en páginas
 * todavía. La conexión visual real (conmutar DEMO_MODE=false por pantalla) queda para una
 * subfase controlada con paridad verde. Bajo DEMO_MODE estas llamadas fallan a propósito.
 */
export const energyApi = {
  getDashboard: (installationId: string, token?: string) =>
    apiFetch(`/installations/${installationId}/dashboard`, { token }),
  getReportsDaily: (installationId: string, token?: string) =>
    apiFetch(`/installations/${installationId}/reports/daily`, { token }),
  getReportsWeekly: (installationId: string, token?: string) =>
    apiFetch(`/installations/${installationId}/reports/weekly`, { token }),
  getReportsMonthly: (installationId: string, token?: string) =>
    apiFetch(`/installations/${installationId}/reports/monthly`, { token }),
  getReportsLastThreeMonths: (installationId: string, token?: string) =>
    apiFetch(`/installations/${installationId}/reports/last-three-months`, { token }),
  getBreakdown: (installationId: string, query?: string, token?: string) =>
    apiFetch(`/installations/${installationId}/breakdown${query ? `?${query}` : ''}`, { token }),
};

/** Métodos de Fase 5 (alertas/recomendaciones). PREPARATORIOS: no usados en UI; DEMO_MODE. */
export const insightsApi = {
  getAlerts: (installationId: string, query?: string, token?: string) =>
    apiFetch(`/installations/${installationId}/alerts${query ? `?${query}` : ''}`, { token }),
  reviewAlert: (alertId: string, body: { status: 'reviewed' | 'dismissed'; note?: string }, token?: string) =>
    apiFetch(`/alerts/${alertId}/review`, { method: 'PATCH', body, token }),
  getRecommendations: (installationId: string, query?: string, token?: string) =>
    apiFetch(`/installations/${installationId}/recommendations${query ? `?${query}` : ''}`, { token }),
};
