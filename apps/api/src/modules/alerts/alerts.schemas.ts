/**
 * Schemas Zod del módulo alerts (Fase 5).
 * El contrato de request/response es compartido (@smartsense/shared). Aquí se
 * re-exporta y se definen los path/query params locales del módulo.
 *
 * Ver docs/audit/phase-5-spec-readiness.md (reconciliación canon ↔ API).
 */
import { z } from 'zod';
import {
  alertApiType,
  alertResponseItem,
  alertsListResponse,
  alertsQuery,
  reviewAlertRequest,
  reviewAlertResponse,
} from '@smartsense/shared';

export {
  alertApiType,
  alertResponseItem,
  alertsListResponse,
  alertsQuery,
  reviewAlertRequest,
  reviewAlertResponse,
};
export type {
  AlertApiType,
  AlertResponseItem,
  AlertsListResponse,
  AlertsQuery,
  ReviewAlertRequest,
  ReviewAlertResponse,
} from '@smartsense/shared';

/** Path param de GET /installations/:installationId/alerts. */
export const installationIdParam = z.object({
  installationId: z.string().uuid(),
});
export type InstallationIdParam = z.infer<typeof installationIdParam>;

/** Path param de PATCH /alerts/:id/review. */
export const alertIdParam = z.object({
  id: z.string().uuid(),
});
export type AlertIdParam = z.infer<typeof alertIdParam>;
