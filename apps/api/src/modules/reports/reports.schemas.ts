/**
 * Schemas Zod del módulo reports (Fase 4).
 * El shape de respuesta es el contrato compartido (`reportResponse` de
 * @smartsense/shared); aquí se re-exporta y se definen los schemas locales de
 * path param y query de rango.
 */
import { z } from 'zod';
import { reportResponse } from '@smartsense/shared';

export { reportResponse };
export type { ReportResponse, ReportPeriod, ReportDataStatus, ReportPoint } from '@smartsense/shared';

/** Path param de GET /installations/:installationId/reports/*. */
export const installationIdParamSchema = z.object({
  installationId: z.string().uuid(),
});
export type InstallationIdParam = z.infer<typeof installationIdParamSchema>;

/**
 * Query del reporte. `date` (YYYY-MM-DD o ISO-8601) ancla el rango cuando aplica
 * (hoy para daily, mes actual para monthly). Opcional → el backend usa "ahora" UTC.
 */
export const reportsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'date debe ser YYYY-MM-DD o ISO-8601')
    .optional(),
});
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
