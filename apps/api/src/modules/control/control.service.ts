/**
 * ControlService (Fase 6 — dry-run). Funciones puras `(prisma, ...args)`.
 * Sin Fastify. Lanza errores con `Errors.*`.
 *
 * RECONCILIACIÓN canon ↔ API (docs/audit/phase-6-control-data-model-audit.md):
 *   - control-action: toda acción es dry-run → persiste status='success' + dry_run=true,
 *     resolvedAt=now, result={dry_run:true,...}; el API expone status='dry_run'.
 *     value/source/reason viven en payload jsonb.
 *   - schedule: action solo turn_on|turn_off (set_limit-as-schedule → 422 diferido);
 *     name/value/cron/starts_at/ends_at en rule jsonb; enabled columna.
 *   - limit: limit_type power_w→limitPowerW; energy_kwh_day→limitKwh+window=day;
 *     energy_kwh_month→limitKwh+window=month. action notify→'alert'|turn_off→'turn_off'
 *     (set_limit-as-limit → 422 diferido).
 *
 * REGLAS DURAS Fase 6:
 *   - NO MQTT/downlink físico, NO scheduler ejecutor, NO automatización.
 *   - Schedules y limits SOLO persisten política; NO ejecutan acciones.
 *   - NUNCA crear alerts/recommendations ni reaccionar a ellas.
 *   - RBAC: mutaciones operate+ (viewer prohibido); lectura read.
 *   - Idempotencia por (deviceId, idempotencyKey): misma → devuelve la existente.
 */
import {
  Prisma,
  type PrismaClient,
  type ControlAction,
  type ControlSchedule,
  type ConsumptionLimit,
  type Device,
} from '@smartsense/db';
import { ROLES, assertDeviceAccess } from '../../lib/access.js';
import { Errors } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type {
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
} from './control.schemas.js';

const DEFAULT_ACTION_LIMIT = 100;
const MAX_ACTION_LIMIT = 500;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Un device es controlable si sus capabilities exponen `switch === true`.
 * (capability lógica; no implica conectividad física real en Fase 6.)
 */
export function isControllable(device: Pick<Device, 'capabilities'>): boolean {
  const caps = device.capabilities;
  if (caps && typeof caps === 'object' && !Array.isArray(caps)) {
    return (caps as Record<string, unknown>).switch === true;
  }
  return false;
}

function jsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function decimalToNumber(d: Prisma.Decimal | null): number | null {
  return d == null ? null : Number(d);
}

// --------------------------------------------------------------------------
// Serializadores
// --------------------------------------------------------------------------

/**
 * Mapea una ControlAction de Prisma al contrato API. Toda acción Fase 6 es
 * dry-run, por lo que el status expuesto se fuerza a 'dry_run' cuando dryRun=true.
 */
export function serializeAction(action: ControlAction): ControlActionResponse {
  return {
    id: action.id,
    device_id: action.deviceId,
    action: action.type,
    status: action.dryRun ? 'dry_run' : action.status,
    requested_by: action.userId,
    requested_at: action.requestedAt.toISOString(),
    resolved_at: action.resolvedAt ? action.resolvedAt.toISOString() : null,
    idempotency_key: action.idempotencyKey ?? null,
    dry_run: action.dryRun,
  };
}

/** Mapea un ControlSchedule (rule jsonb expandido) al contrato API. */
export function serializeSchedule(schedule: ControlSchedule): ControlScheduleResponse {
  const rule = jsonObject(schedule.rule);
  return {
    id: schedule.id,
    device_id: schedule.deviceId,
    action: schedule.action,
    name: rule.name != null ? String(rule.name) : null,
    value: toNumber(rule.value),
    cron: rule.cron != null ? String(rule.cron) : null,
    starts_at: rule.starts_at != null ? String(rule.starts_at) : null,
    ends_at: rule.ends_at != null ? String(rule.ends_at) : null,
    enabled: schedule.enabled,
    created_by: schedule.createdBy,
    created_at: schedule.createdAt.toISOString(),
    updated_at: schedule.updatedAt.toISOString(),
  };
}

/** Mapea un ConsumptionLimit (columnas canónicas → limit_type/threshold). */
export function serializeLimit(limit: ConsumptionLimit): ConsumptionLimitResponse {
  let limit_type: ConsumptionLimitResponse['limit_type'];
  let threshold: number;
  if (limit.limitPowerW != null) {
    limit_type = 'power_w';
    threshold = decimalToNumber(limit.limitPowerW) ?? 0;
  } else {
    limit_type = limit.window === 'day' ? 'energy_kwh_day' : 'energy_kwh_month';
    threshold = decimalToNumber(limit.limitKwh) ?? 0;
  }
  // actionOnExceed canónico 'alert' → API 'notify' (turn_off se mantiene).
  const action: ConsumptionLimitResponse['action'] =
    limit.actionOnExceed === 'alert' ? 'notify' : 'turn_off';
  return {
    id: limit.id,
    device_id: limit.deviceId,
    limit_type,
    threshold,
    action,
    enabled: limit.enabled,
    created_at: limit.createdAt.toISOString(),
    updated_at: limit.updatedAt.toISOString(),
  };
}

// --------------------------------------------------------------------------
// Control actions
// --------------------------------------------------------------------------

/**
 * Crea (o devuelve idempotente) una acción de control dry-run.
 * RBAC operate (viewer→403). Device no controlable (capabilities.switch≠true)
 * → 409 DEVICE_NOT_CONTROLLABLE. Idempotencia por (deviceId, idempotencyKey):
 * si ya existe, devuelve la acción existente (no duplica).
 *
 * Persistencia canon: status='success', dryRun=true, resolvedAt=now,
 * result={dry_run:true,...}; value/source/reason en payload. NO downlink físico.
 */
export async function createControlAction(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
  dto: ControlActionRequest,
  idempotencyKey?: string | null,
  ip?: string | null,
): Promise<ControlActionResponse> {
  const access = await assertDeviceAccess(prisma, userId, deviceId, ROLES.operate);

  const device = await prisma.device.findUniqueOrThrow({
    where: { id: deviceId },
    select: { capabilities: true },
  });

  // turn_on / turn_off / set_limit requieren switch=true (capability lógica).
  if (!isControllable(device)) {
    throw Errors.conflict(
      'DEVICE_NOT_CONTROLLABLE',
      'El dispositivo no es controlable (capabilities.switch != true)',
    );
  }

  // Idempotencia: misma (deviceId, idempotencyKey) → devuelve la existente.
  const key = idempotencyKey?.trim() || null;
  if (key) {
    const existing = await prisma.controlAction.findFirst({
      where: { deviceId, idempotencyKey: key },
    });
    if (existing) {
      return serializeAction(existing);
    }
  }

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'control.requested',
    entityType: 'control_action',
    entityId: deviceId,
    after: { action: dto.action, value: dto.value ?? null, source: dto.source, dry_run: true },
    ip: ip ?? null,
  });

  const now = new Date();
  const created = await prisma.controlAction.create({
    data: {
      deviceId,
      userId,
      type: dto.action,
      status: 'success', // resuelta lógicamente (dry-run), sin downlink
      dryRun: true,
      idempotencyKey: key,
      payload: {
        value: dto.value ?? null,
        source: dto.source ?? 'manual',
        reason: dto.reason ?? null,
      },
      result: { dry_run: true, message: 'simulado, sin downlink' },
      resolvedAt: now,
    },
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'control.resolved',
    entityType: 'control_action',
    entityId: created.id,
    after: { status: 'dry_run', dry_run: true, resolved_at: now.toISOString() },
    ip: ip ?? null,
  });

  return serializeAction(created);
}

/**
 * Lista las control-actions de un device (tenant-scoped, ROLES.read).
 * Orden: requestedAt desc; limit default 100 (máx 500).
 * Filtro status: como todas las acciones son dry-run (status DB='success'),
 * un filtro status='dry_run' NO restringe por columna status (equivale a "todas").
 * Otros valores se filtran contra la columna ControlActionStatus de la DB.
 */
export async function listControlActions(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
  query: ControlActionsQuery,
): Promise<ControlActionResponse[]> {
  await assertDeviceAccess(prisma, userId, deviceId, ROLES.read);

  const where: Prisma.ControlActionWhereInput = { deviceId };
  if (query.status && query.status !== 'dry_run') {
    where.status = query.status;
  }

  const limit = Math.min(query.limit ?? DEFAULT_ACTION_LIMIT, MAX_ACTION_LIMIT);

  const actions = await prisma.controlAction.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    take: limit,
  });

  return actions.map(serializeAction);
}

/**
 * Estado LÓGICO/simulado de control del device (tenant-scoped, ROLES.read).
 * current_state se deriva de la última acción (turn_on→'on', turn_off→'off',
 * else 'unknown'); sin acciones → 'unknown'. NO refleja estado físico real.
 */
export async function getControlState(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
): Promise<ControlStateResponse> {
  await assertDeviceAccess(prisma, userId, deviceId, ROLES.read);

  const device = await prisma.device.findUniqueOrThrow({
    where: { id: deviceId },
    select: { capabilities: true },
  });

  const last = await prisma.controlAction.findFirst({
    where: { deviceId },
    orderBy: { requestedAt: 'desc' },
  });

  let current_state: ControlStateResponse['current_state'] = 'unknown';
  if (last) {
    if (last.type === 'turn_on') current_state = 'on';
    else if (last.type === 'turn_off') current_state = 'off';
    else current_state = 'unknown'; // set_limit no cambia on/off lógico
  }

  return {
    device_id: deviceId,
    controllable: isControllable(device),
    current_state,
    last_action: last ? serializeAction(last) : null,
    dry_run: true,
  };
}

// --------------------------------------------------------------------------
// Control schedules (solo persisten política; NO ejecutan)
// --------------------------------------------------------------------------

/**
 * Crea un schedule de control. RBAC operate. set_limit-as-schedule → 422
 * (diferido; solapa con consumption-limits). name/value/cron/starts_at/ends_at
 * van a rule jsonb; enabled columna. NO ejecuta nada (sin scheduler).
 */
export async function createControlSchedule(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
  dto: ControlScheduleRequest,
  ip?: string | null,
): Promise<ControlScheduleResponse> {
  const access = await assertDeviceAccess(prisma, userId, deviceId, ROLES.operate);

  if (dto.action === 'set_limit') {
    throw Errors.validation('set_limit-as-schedule no soportado en Fase 6');
  }

  const created = await prisma.controlSchedule.create({
    data: {
      deviceId,
      action: dto.action,
      rule: {
        name: dto.name,
        value: dto.value ?? null,
        cron: dto.cron ?? null,
        starts_at: dto.starts_at ?? null,
        ends_at: dto.ends_at ?? null,
      },
      enabled: dto.enabled,
      createdBy: userId,
    },
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'control_schedule.created',
    entityType: 'control_schedule',
    entityId: created.id,
    after: { action: created.action, enabled: created.enabled },
    ip: ip ?? null,
  });

  return serializeSchedule(created);
}

/** Lista los schedules de un device (tenant-scoped, ROLES.read). */
export async function listControlSchedules(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
): Promise<ControlScheduleResponse[]> {
  await assertDeviceAccess(prisma, userId, deviceId, ROLES.read);

  const schedules = await prisma.controlSchedule.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
  });

  return schedules.map(serializeSchedule);
}

/**
 * Actualiza un schedule (parcial). Resuelve device→assertDeviceAccess(operate).
 * Aplica enabled/action y reescribe campos de rule jsonb. Audita
 * `control_schedule.updated`. set_limit-as-schedule → 422.
 */
export async function updateControlSchedule(
  prisma: PrismaClient,
  userId: string,
  scheduleId: string,
  patch: ControlSchedulePatch,
  ip?: string | null,
): Promise<ControlScheduleResponse> {
  const schedule = await prisma.controlSchedule.findFirst({
    where: { id: scheduleId },
  });
  if (!schedule) throw Errors.notFound('Schedule');

  const access = await assertDeviceAccess(prisma, userId, schedule.deviceId, ROLES.operate);

  // patch.action ya está restringido por zod a turn_on|turn_off (set_limit no es
  // patcheable; el contrato de schedule difiere set_limit-as-schedule).

  // Merge de rule jsonb (solo campos presentes en el patch).
  const rule = jsonObject(schedule.rule);
  if (patch.name !== undefined) rule.name = patch.name;
  if (patch.value !== undefined) rule.value = patch.value;
  if (patch.cron !== undefined) rule.cron = patch.cron;
  if (patch.starts_at !== undefined) rule.starts_at = patch.starts_at;
  if (patch.ends_at !== undefined) rule.ends_at = patch.ends_at;

  const data: Prisma.ControlScheduleUpdateInput = { rule: rule as Prisma.InputJsonValue };
  if (patch.action !== undefined) data.action = patch.action;
  if (patch.enabled !== undefined) data.enabled = patch.enabled;

  const updated = await prisma.controlSchedule.update({
    where: { id: scheduleId },
    data,
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'control_schedule.updated',
    entityType: 'control_schedule',
    entityId: scheduleId,
    before: { action: schedule.action, enabled: schedule.enabled },
    after: { action: updated.action, enabled: updated.enabled },
    ip: ip ?? null,
  });

  return serializeSchedule(updated);
}

// --------------------------------------------------------------------------
// Consumption limits (solo persisten política; NO ejecutan)
// --------------------------------------------------------------------------

/** Mapea action del API → actionOnExceed canónico. set_limit → 422 (diferido). */
function mapLimitAction(action: ConsumptionLimitRequest['action']): 'alert' | 'turn_off' {
  if (action === 'notify') return 'alert';
  if (action === 'turn_off') return 'turn_off';
  throw Errors.validation('set_limit-as-limit no soportado en Fase 6');
}

/**
 * Crea un consumption-limit. RBAC operate. Mapea limit_type→columnas
 * (power_w→limitPowerW; energy_kwh_day→limitKwh+window=day; energy_kwh_month→
 * limitKwh+window=month) y action→actionOnExceed. threshold>0 (zod). NO ejecuta.
 */
export async function createConsumptionLimit(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
  dto: ConsumptionLimitRequest,
  ip?: string | null,
): Promise<ConsumptionLimitResponse> {
  const access = await assertDeviceAccess(prisma, userId, deviceId, ROLES.operate);

  const actionOnExceed = mapLimitAction(dto.action);

  const data: Prisma.ConsumptionLimitUncheckedCreateInput = {
    deviceId,
    window: dto.limit_type === 'energy_kwh_month' ? 'month' : 'day',
    actionOnExceed,
    enabled: dto.enabled,
  };
  if (dto.limit_type === 'power_w') {
    data.limitPowerW = new Prisma.Decimal(dto.threshold);
    // window es requerido por el schema; usa 'day' como placeholder neutro.
    data.window = 'day';
  } else {
    data.limitKwh = new Prisma.Decimal(dto.threshold);
  }

  const created = await prisma.consumptionLimit.create({ data });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'consumption_limit.created',
    entityType: 'consumption_limit',
    entityId: created.id,
    after: { limit_type: dto.limit_type, threshold: dto.threshold, action: actionOnExceed },
    ip: ip ?? null,
  });

  return serializeLimit(created);
}

/** Lista los consumption-limits de un device (tenant-scoped, ROLES.read). */
export async function listConsumptionLimits(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
): Promise<ConsumptionLimitResponse[]> {
  await assertDeviceAccess(prisma, userId, deviceId, ROLES.read);

  const limits = await prisma.consumptionLimit.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
  });

  return limits.map(serializeLimit);
}

/**
 * Actualiza un consumption-limit (parcial). Resuelve device del límite →
 * assertDeviceAccess(operate). Aplica threshold (sobre la columna activa),
 * action y enabled. Audita `consumption_limit.updated`. NO ejecuta.
 */
export async function updateConsumptionLimit(
  prisma: PrismaClient,
  userId: string,
  limitId: string,
  patch: ConsumptionLimitPatch,
  ip?: string | null,
): Promise<ConsumptionLimitResponse> {
  const limit = await prisma.consumptionLimit.findFirst({ where: { id: limitId } });
  if (!limit) throw Errors.notFound('Límite');

  const access = await assertDeviceAccess(prisma, userId, limit.deviceId, ROLES.operate);

  const data: Prisma.ConsumptionLimitUpdateInput = {};
  if (patch.action !== undefined) data.actionOnExceed = mapLimitAction(patch.action);
  if (patch.enabled !== undefined) data.enabled = patch.enabled;
  if (patch.threshold !== undefined) {
    // El threshold se aplica sobre la columna activa (la que el límite usa).
    if (limit.limitPowerW != null) {
      data.limitPowerW = new Prisma.Decimal(patch.threshold);
    } else {
      data.limitKwh = new Prisma.Decimal(patch.threshold);
    }
  }

  const updated = await prisma.consumptionLimit.update({
    where: { id: limitId },
    data,
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'consumption_limit.updated',
    entityType: 'consumption_limit',
    entityId: limitId,
    before: { actionOnExceed: limit.actionOnExceed, enabled: limit.enabled },
    after: { actionOnExceed: updated.actionOnExceed, enabled: updated.enabled },
    ip: ip ?? null,
  });

  return serializeLimit(updated);
}
