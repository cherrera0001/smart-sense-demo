/**
 * Schemas Zod del módulo control (Fase 6 — dry-run).
 * El contrato request/response es compartido (@smartsense/shared). Aquí se
 * re-exporta y se definen los path params locales del módulo.
 *
 * Ver docs/audit/phase-6-spec-readiness.md y
 * docs/audit/phase-6-control-data-model-audit.md (reconciliación canon ↔ API).
 */
import { z } from 'zod';
import {
  controlActionRequest,
  controlActionResponse,
  controlActionsQuery,
  controlStateResponse,
  controlScheduleRequest,
  controlScheduleResponse,
  controlSchedulePatch,
  consumptionLimitRequest,
  consumptionLimitResponse,
  consumptionLimitPatch,
} from '@smartsense/shared';

export {
  controlActionRequest,
  controlActionResponse,
  controlActionsQuery,
  controlStateResponse,
  controlScheduleRequest,
  controlScheduleResponse,
  controlSchedulePatch,
  consumptionLimitRequest,
  consumptionLimitResponse,
  consumptionLimitPatch,
};
export type {
  ControlActionRequest,
  ControlActionResponse,
  ControlActionsQuery,
  ControlStateResponse,
  ControlScheduleRequest,
  ControlScheduleResponse,
  ControlSchedulePatch,
  ConsumptionLimitRequest,
  ConsumptionLimitResponse,
  ConsumptionLimitPatch,
} from '@smartsense/shared';

/** Path param de rutas /devices/:deviceId/... */
export const deviceIdParam = z.object({
  deviceId: z.string().uuid(),
});
export type DeviceIdParam = z.infer<typeof deviceIdParam>;

/** Path param de PATCH /control-schedules/:id. */
export const scheduleIdParam = z.object({
  id: z.string().uuid(),
});
export type ScheduleIdParam = z.infer<typeof scheduleIdParam>;

/** Path param de PATCH /consumption-limits/:id. */
export const limitIdParam = z.object({
  id: z.string().uuid(),
});
export type LimitIdParam = z.infer<typeof limitIdParam>;
