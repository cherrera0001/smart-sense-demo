/**
 * Schemas Zod de ControlAction / ControlSchedule / ConsumptionLimit.
 * Fuente: `specs/02-domain/domain-model.md` (ControlAction, ControlSchedule, ConsumptionLimit).
 * Control remoto requiere rol operator|admin|owner (validado en backend, no aquí).
 */
import { z } from 'zod';
import { powerW, uuid } from './common.js';
import { controlActionTypeValues } from '../domain/enums.js';

export const createControlAction = z.object({
  deviceId: uuid,
  type: z.enum(controlActionTypeValues as [string, ...string[]]),
  payload: z.unknown().optional(),
});
export type CreateControlAction = z.infer<typeof createControlAction>;

const scheduleAction = z.enum(['turn_on', 'turn_off']);

export const createControlSchedule = z.object({
  deviceId: uuid,
  action: scheduleAction,
  cronOrRule: z.record(z.unknown()), // jsonb
  enabled: z.boolean().default(true),
});
export type CreateControlSchedule = z.infer<typeof createControlSchedule>;

export const updateControlSchedule = z.object({
  action: scheduleAction.optional(),
  cronOrRule: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});
export type UpdateControlSchedule = z.infer<typeof updateControlSchedule>;

export const createConsumptionLimit = z
  .object({
    deviceId: uuid,
    limitKwh: z.number().positive().optional(),
    limitPowerW: powerW.refine((v) => v > 0, {
      message: 'limit_power_w must be positive',
    }).optional(),
    window: z.enum(['day', 'month']),
    preAlertPct: z.number().min(0).max(100).optional(),
    actionOnExceed: z.enum(['alert', 'turn_off']),
    enabled: z.boolean().default(true),
  })
  .refine((l) => l.limitKwh != null || l.limitPowerW != null, {
    message: 'at least one of limit_kwh or limit_power_w is required',
    path: ['limitKwh'],
  });
export type CreateConsumptionLimit = z.infer<typeof createConsumptionLimit>;

// ---------------------------------------------------------------------------
// Fase 6 — Contrato API (request/response) del módulo control (dry-run).
//
// Reconciliación canon ↔ API (docs/audit/phase-6-control-data-model-audit.md):
//   - control-action: toda acción dry-run persiste status='success'+dry_run=true;
//     el API expone status='dry_run'. value/source/reason viven en payload jsonb.
//   - schedule: action solo turn_on|turn_off (set_limit-as-schedule → 422 diferido);
//     name/value/cron/starts_at/ends_at viven en rule jsonb; enabled es columna.
//   - limit: limit_type power_w→limitPowerW; energy_kwh_day→limitKwh+window=day;
//     energy_kwh_month→limitKwh+window=month. action notify→'alert'|turn_off→'turn_off'.
// ---------------------------------------------------------------------------

/** Acción de control solicitada por el API (incluye set_limit). */
export const controlActionApiAction = z.enum(['turn_on', 'turn_off', 'set_limit']);
export type ControlActionApiAction = z.infer<typeof controlActionApiAction>;

/** Estado del API: derivado. Toda acción Fase 6 resuelve a 'dry_run'. */
export const controlActionApiStatus = z.enum([
  'pending',
  'success',
  'failed',
  'rejected',
  'dry_run',
]);
export type ControlActionApiStatus = z.infer<typeof controlActionApiStatus>;

/** Origen lógico de la acción (manual por defecto). */
export const controlActionSource = z.enum(['manual', 'schedule', 'limit', 'recommendation']);
export type ControlActionSource = z.infer<typeof controlActionSource>;

/** POST /devices/:deviceId/control-actions — request. */
export const controlActionRequest = z.object({
  action: controlActionApiAction,
  value: z.number().nullable().optional(),
  reason: z.string().max(500).optional(),
  source: controlActionSource.default('manual'),
});
export type ControlActionRequest = z.infer<typeof controlActionRequest>;

/** Respuesta de una control-action (status mapeado a 'dry_run'). */
export const controlActionResponse = z.object({
  id: uuid,
  device_id: uuid,
  action: controlActionApiAction,
  status: controlActionApiStatus,
  requested_by: uuid,
  requested_at: z.string(),
  resolved_at: z.string().nullable(),
  idempotency_key: z.string().nullable(),
  dry_run: z.boolean(),
});
export type ControlActionResponse = z.infer<typeof controlActionResponse>;

/** GET /devices/:deviceId/control-state — estado lógico/simulado del device. */
export const controlStateResponse = z.object({
  device_id: uuid,
  controllable: z.boolean(),
  current_state: z.enum(['on', 'off', 'unknown']),
  last_action: controlActionResponse.nullable(),
  dry_run: z.boolean(),
});
export type ControlStateResponse = z.infer<typeof controlStateResponse>;

/** Query de listado de control-actions. */
export const controlActionsQuery = z.object({
  status: controlActionApiStatus.optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});
export type ControlActionsQuery = z.infer<typeof controlActionsQuery>;

// --- Schedules (solo persisten política; NO ejecutan) ---

const controlScheduleApiAction = z.enum(['turn_on', 'turn_off', 'set_limit']);

/** POST /devices/:deviceId/control-schedules — request. */
export const controlScheduleRequest = z.object({
  name: z.string().min(1).max(200),
  action: controlScheduleApiAction,
  value: z.number().nullable().optional(),
  cron: z.string().max(200).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type ControlScheduleRequest = z.infer<typeof controlScheduleRequest>;

/** Respuesta de un control-schedule (rule jsonb expandido). */
export const controlScheduleResponse = z.object({
  id: uuid,
  device_id: uuid,
  action: z.enum(['turn_on', 'turn_off']),
  name: z.string().nullable(),
  value: z.number().nullable(),
  cron: z.string().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  enabled: z.boolean(),
  created_by: uuid,
  created_at: z.string(),
  updated_at: z.string(),
});
export type ControlScheduleResponse = z.infer<typeof controlScheduleResponse>;

/** PATCH /control-schedules/:id — request parcial. */
export const controlSchedulePatch = z
  .object({
    name: z.string().min(1).max(200).optional(),
    action: z.enum(['turn_on', 'turn_off']).optional(),
    value: z.number().nullable().optional(),
    cron: z.string().max(200).optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, {
    message: 'al menos un campo es requerido',
  });
export type ControlSchedulePatch = z.infer<typeof controlSchedulePatch>;

// --- Consumption limits (solo persisten política; NO ejecutan) ---

/** Tipo de límite del API (mapea a limitPowerW / limitKwh+window). */
export const consumptionLimitType = z.enum([
  'power_w',
  'energy_kwh_day',
  'energy_kwh_month',
]);
export type ConsumptionLimitType = z.infer<typeof consumptionLimitType>;

/** Acción del API ante exceso (notify→alert | turn_off | set_limit diferido). */
export const consumptionLimitApiAction = z.enum(['notify', 'turn_off', 'set_limit']);
export type ConsumptionLimitApiAction = z.infer<typeof consumptionLimitApiAction>;

/** POST /devices/:deviceId/consumption-limits — request. */
export const consumptionLimitRequest = z.object({
  limit_type: consumptionLimitType,
  threshold: z.number().positive(),
  action: consumptionLimitApiAction,
  enabled: z.boolean().default(true),
});
export type ConsumptionLimitRequest = z.infer<typeof consumptionLimitRequest>;

/** Respuesta de un consumption-limit. */
export const consumptionLimitResponse = z.object({
  id: uuid,
  device_id: uuid,
  limit_type: consumptionLimitType,
  threshold: z.number(),
  action: z.enum(['notify', 'turn_off']),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ConsumptionLimitResponse = z.infer<typeof consumptionLimitResponse>;

/** PATCH /consumption-limits/:id — request parcial. */
export const consumptionLimitPatch = z
  .object({
    threshold: z.number().positive().optional(),
    action: consumptionLimitApiAction.optional(),
    enabled: z.boolean().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, {
    message: 'al menos un campo es requerido',
  });
export type ConsumptionLimitPatch = z.infer<typeof consumptionLimitPatch>;
