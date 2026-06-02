/**
 * Schemas Zod de Alert / Recommendation.
 * Fuente: `specs/02-domain/domain-model.md` (Alert, Recommendation).
 */
import { z } from 'zod';
import { clpAmount, uuid } from './common.js';
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
