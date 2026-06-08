/**
 * Schemas Zod de Alert / Recommendation.
 * Fuente: `specs/02-domain/domain-model.md` (Alert, Recommendation).
 */
import { z } from 'zod';
import { clpAmount, isoTimestamp, uuid } from './common.js';
import {
  alertSeverityValues,
  alertStatusValues,
  alertTypeValues,
  recommendationSourceValues,
} from '../domain/enums.js';

export const createAlert = z.object({
  installationId: uuid,
  deviceId: uuid.optional(),
  type: z.enum(alertTypeValues as [string, ...string[]]),
  severity: z.enum(alertSeverityValues as [string, ...string[]]),
  message: z.string().min(1),
  context: z.unknown().optional(),
  estimatedImpactClp: clpAmount.optional(),
});
export type CreateAlert = z.infer<typeof createAlert>;

/** Transición de estado de una alerta (review / dismiss). */
export const updateAlertStatus = z.object({
  status: z.enum(alertStatusValues as [string, ...string[]]),
});
export type UpdateAlertStatus = z.infer<typeof updateAlertStatus>;

export const createRecommendation = z.object({
  installationId: uuid,
  alertId: uuid.optional(),
  source: z.enum(recommendationSourceValues as [string, ...string[]]),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  estimatedSavingClp: clpAmount.optional(), // omitido si no hay base tarifaria
  priority: z.number().int().nonnegative(),
});
export type CreateRecommendation = z.infer<typeof createRecommendation>;

export const updateRecommendationStatus = z.object({
  status: z.enum(['new', 'applied', 'dismissed']),
});
export type UpdateRecommendationStatus = z.infer<
  typeof updateRecommendationStatus
>;

// ---------------------------------------------------------------------------
// Fase 5 — Contrato del API de Alertas.
//
// RECONCILIACIÓN (docs/audit/phase-5-spec-readiness.md): el canon/Prisma persiste
// AlertType con 4 valores (anomaly | high_device | over_budget | offline). El API
// expone EXACTAMENTE esos 4. Las reglas de evaluación (5) mapean al canon y el
// detalle fino del subtipo viaja en `context.subtype`:
//   anomaly          -> anomaly
//   device_high      -> high_device
//   high_consumption -> over_budget  (context.subtype='high_consumption')
//   projection_risk  -> over_budget  (context.subtype='projection_risk')
//   offline          -> offline
//
// Mapeo de campos API <-> persistencia:
//   detected_at = created_at
//   metadata    = context (jsonb)
//   title       = derivado (no existe columna; label por type/subtype)
//   message     = columna message
// ---------------------------------------------------------------------------

/** Tipo de alerta expuesto por el API (4 valores canónicos). */
export const alertApiType = z.enum(
  alertTypeValues as [string, ...string[]],
);
export type AlertApiType = z.infer<typeof alertApiType>;

/** Item de alerta serializado para el API. */
export const alertResponseItem = z.object({
  id: uuid,
  type: alertApiType,
  severity: z.enum(alertSeverityValues as [string, ...string[]]), // info | warning | critical
  status: z.enum(alertStatusValues as [string, ...string[]]), // open | reviewed | dismissed
  title: z.string(),
  message: z.string(),
  device_id: uuid.nullable(),
  detected_at: isoTimestamp,
  reviewed_at: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});
export type AlertResponseItem = z.infer<typeof alertResponseItem>;

/** Respuesta de GET /installations/:installationId/alerts. */
export const alertsListResponse = z.object({
  installation_id: uuid,
  items: z.array(alertResponseItem),
  total: z.number().int().nonnegative(),
});
export type AlertsListResponse = z.infer<typeof alertsListResponse>;

/** Query string de GET /installations/:installationId/alerts. */
export const alertsQuery = z.object({
  status: z.enum(['open', 'reviewed', 'dismissed', 'all']).optional(),
  severity: z.enum(alertSeverityValues as [string, ...string[]]).optional(),
  from: isoTimestamp.optional(),
  to: isoTimestamp.optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});
export type AlertsQuery = z.infer<typeof alertsQuery>;

/** Body de PATCH /alerts/:id/review. */
export const reviewAlertRequest = z.object({
  status: z.enum(['reviewed', 'dismissed']),
  note: z.string().max(1000).optional(),
});
export type ReviewAlertRequest = z.infer<typeof reviewAlertRequest>;

/** Respuesta de PATCH /alerts/:id/review. */
export const reviewAlertResponse = z.object({
  id: uuid,
  status: z.enum(['reviewed', 'dismissed']),
  reviewed_at: isoTimestamp,
});
export type ReviewAlertResponse = z.infer<typeof reviewAlertResponse>;
