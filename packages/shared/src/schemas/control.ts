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
