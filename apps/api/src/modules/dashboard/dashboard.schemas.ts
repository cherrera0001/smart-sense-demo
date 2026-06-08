/**
 * Schemas Zod del módulo dashboard (Fase 4).
 * El shape de respuesta es el contrato compartido (`dashboardResponse` de
 * @smartsense/shared); aquí se re-exporta y se define el path param local.
 */
import { z } from 'zod';
import { dashboardResponse } from '@smartsense/shared';

export { dashboardResponse };
export type { DashboardResponse } from '@smartsense/shared';

/** Path param de GET /installations/:installationId/dashboard. */
export const installationIdParamSchema = z.object({
  installationId: z.string().uuid(),
});

export type InstallationIdParam = z.infer<typeof installationIdParamSchema>;
