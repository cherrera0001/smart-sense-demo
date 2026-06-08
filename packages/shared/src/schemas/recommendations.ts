/**
 * Schemas Zod del contrato de API de Recommendation (Fase 5).
 *
 * RECONCILIACIÓN (docs/audit/phase-5-spec-readiness.md): la persistencia (canon/Prisma)
 * y el API divergen en vocabulario. Estos schemas describen la VISTA del API; el mapeo
 * desde la persistencia ocurre en el service (`serialize`):
 *  - status:   DB new→'active', applied→'applied', dismissed→'dismissed'.
 *  - priority: DB int → 'low'(0) | 'medium'(1) | 'high'(>=2).
 *  - message:  = columna `description`.
 *  - type:     columna `type` (migración 0002), validada por este enum.
 *
 * REGLA DURA (BR-031): el ahorro CLP/kWh es estimado, nunca garantizado. Ambos pueden
 * ser null cuando no hay base (sin tarifa → estimated_saving_clp null).
 */
import { z } from 'zod';
import { uuid, isoTimestamp } from './common.js';

/** Vocabulario de recomendación expuesto por el API (columna `type`). */
export const recommendationApiType = z.enum([
  'reduce_usage',
  'schedule_shift',
  'inspect_device',
  'tariff_review',
  'standby_reduction',
]);
export type RecommendationApiType = z.infer<typeof recommendationApiType>;

/** Estado expuesto por el API (alias de canon: new↔active). */
export const recommendationApiStatus = z.enum(['active', 'dismissed', 'applied']);
export type RecommendationApiStatus = z.infer<typeof recommendationApiStatus>;

/** Prioridad expuesta por el API (mapeo desde int del canon). */
export const recommendationApiPriority = z.enum(['low', 'medium', 'high']);
export type RecommendationApiPriority = z.infer<typeof recommendationApiPriority>;

/** Item de respuesta saneado. `message` = columna `description` del canon. */
export const recommendationResponseItem = z.object({
  id: uuid,
  alert_id: uuid.nullable(),
  type: recommendationApiType,
  priority: recommendationApiPriority,
  title: z.string(),
  message: z.string(),
  estimated_saving_clp: z.number().int().nullable(),
  estimated_saving_kwh: z.number().nullable(),
  status: recommendationApiStatus,
  created_at: isoTimestamp,
});
export type RecommendationResponseItem = z.infer<typeof recommendationResponseItem>;

/** Respuesta de GET /installations/:installationId/recommendations. */
export const recommendationsListResponse = z.object({
  installation_id: uuid,
  items: z.array(recommendationResponseItem),
  total: z.number().int().nonnegative(),
});
export type RecommendationsListResponse = z.infer<typeof recommendationsListResponse>;

/**
 * Query de listado. `status` filtra por estado API; 'all' = sin filtro.
 * Default 'active' (= DB new). `limit` por defecto 100.
 */
export const recommendationsQuery = z.object({
  status: z.enum(['active', 'dismissed', 'applied', 'all']).default('active'),
  limit: z.coerce.number().int().positive().max(200).default(100),
});
export type RecommendationsQuery = z.infer<typeof recommendationsQuery>;
