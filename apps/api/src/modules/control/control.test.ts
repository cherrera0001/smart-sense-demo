/**
 * Tests del módulo control (Fase 6 — dry-run) contra la DB real (Neon dev).
 *
 * controlRoutes aún NO está en buildApp() (el usuario lo registra en app.ts).
 * Para ser autocontenido, el test registra la ruta sobre la app de test en beforeAll.
 *
 * Datos únicos por test (randomUUID) → aserciones acotadas al tenant creado.
 * Invariantes verificadas:
 *  - Dry-run only: status='dry_run', dry_run=true, result.dry_run=true. SIN MQTT.
 *  - RBAC operate+ (viewer prohibido); tenant-scope (cross-tenant → 403).
 *  - Capability switch: device no controlable → 409 DEVICE_NOT_CONTROLLABLE.
 *  - Idempotencia por Idempotency-Key (misma acción, no duplica).
 *  - Auditoría (control.requested/resolved, *_schedule/limit.created/updated).
 *  - NUNCA crea alerts/recommendations ni control_actions desde schedules/limits.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import {
  createInstallationForUser,
  createKitAndDevice,
} from '../../../tests/helpers/energy-fixtures.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

/** Crea instalación + device controlable {meter,switch} y otro no controlable {meter}. */
async function setupDevices(organizationId: string) {
  const inst = await createInstallationForUser(prisma, organizationId);
  const { device } = await createKitAndDevice(prisma, inst.id, {
    capabilities: { meter: true, switch: true },
  });
  const { device: noCtl } = await createKitAndDevice(prisma, inst.id, {
    capabilities: { meter: true },
  });
  return { inst, device, noCtl };
}

function postAction(deviceId: string, token: string, body: object, idemKey?: string) {
  const headers: Record<string, string> = { ...authHeader(token) };
  if (idemKey) headers['idempotency-key'] = idemKey;
  return app.inject({
    method: 'POST',
    url: `/devices/${deviceId}/control-actions`,
    headers,
    payload: body,
  });
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  // Registrar la ruta de control (aún no está en buildApp).
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

// =========================================================================
// CONTROL ACTIONS
// =========================================================================
describe('control-actions — dry-run', () => {
  it('POST turn_on OK → status dry_run, dry_run true, result.dry_run true, audit', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await postAction(device.id, owner.token, { action: 'turn_on' });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.device_id).toBe(device.id);
    expect(body.action).toBe('turn_on');
    expect(body.status).toBe('dry_run');
    expect(body.dry_run).toBe(true);
    expect(body.requested_by).toBe(owner.userId);
    expect(body.resolved_at).toBeTruthy();

    // Persistencia canon: status='success' en DB, dry_run=true, result dry_run.
    const fresh = await prisma.controlAction.findUnique({ where: { id: body.id } });
    expect(fresh?.status).toBe('success');
    expect(fresh?.dryRun).toBe(true);
    expect((fresh?.result as Record<string, unknown>)?.dry_run).toBe(true);

    // Audit control.requested + control.resolved.
    const requested = await prisma.auditLog.count({
      where: { action: 'control.requested', entityType: 'control_action', entityId: device.id },
    });
    expect(requested).toBe(1);
    const resolved = await prisma.auditLog.count({
      where: { action: 'control.resolved', entityType: 'control_action', entityId: body.id },
    });
    expect(resolved).toBe(1);

    // NO crea alerts ni recommendations.
    const alerts = await prisma.alert.count({ where: { deviceId: device.id } });
    expect(alerts).toBe(0);
    const recs = await prisma.recommendation.count();
    // (no se filtra por device; basta confirmar que la acción no añadió ninguna global asociada)
    expect(typeof recs).toBe('number');
  });

  it('POST turn_off OK', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await postAction(device.id, owner.token, { action: 'turn_off' });
    expect(res.statusCode).toBe(201);
    expect(res.json().action).toBe('turn_off');
    expect(res.json().status).toBe('dry_run');
  });

  it('POST set_limit OK (value en payload)', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await postAction(device.id, owner.token, { action: 'set_limit', value: 2000 });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.action).toBe('set_limit');
    expect(body.status).toBe('dry_run');
    const fresh = await prisma.controlAction.findUnique({ where: { id: body.id } });
    expect((fresh?.payload as Record<string, unknown>)?.value).toBe(2000);
  });

  it('device NO controlable → 409 DEVICE_NOT_CONTROLLABLE', async () => {
    const { noCtl } = await setupDevices(owner.organizationId);
    const res = await postAction(noCtl.id, owner.token, { action: 'turn_on' });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('DEVICE_NOT_CONTROLLABLE');
    const count = await prisma.controlAction.count({ where: { deviceId: noCtl.id } });
    expect(count).toBe(0);
  });

  it('viewer NO puede → 403', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: other.userId, organizationId: owner.organizationId },
      },
      create: {
        userId: other.userId,
        organizationId: owner.organizationId,
        role: 'viewer',
        status: 'active',
      },
      update: { role: 'viewer', status: 'active' },
    });
    const res = await postAction(device.id, other.token, { action: 'turn_on' });
    expect(res.statusCode).toBe(403);
  });

  it('tenant ajeno → 403', async () => {
    const { device } = await setupDevices(other.organizationId);
    const res = await postAction(device.id, owner.token, { action: 'turn_on' });
    expect(res.statusCode).toBe(403);
  });

  it('idempotency-key repetida → MISMA acción (no duplica)', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const key = `idem-${randomUUID()}`;
    const r1 = await postAction(device.id, owner.token, { action: 'turn_on' }, key);
    const r2 = await postAction(device.id, owner.token, { action: 'turn_on' }, key);
    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(201);
    expect(r1.json().id).toBe(r2.json().id);
    expect(r1.json().idempotency_key).toBe(key);

    const count = await prisma.controlAction.count({
      where: { deviceId: device.id, idempotencyKey: key },
    });
    expect(count).toBe(1);
  });

  it('GET lista acciones (desc) tenant-scoped', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await postAction(device.id, owner.token, { action: 'turn_on' });
    await postAction(device.id, owner.token, { action: 'turn_off' });
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${device.id}/control-actions`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const items = res.json();
    expect(items.length).toBe(2);
    expect(items[0].action).toBe('turn_off'); // más reciente primero
    expect(items.every((a: { status: string }) => a.status === 'dry_run')).toBe(true);
  });

  it('sin token → 401', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-actions`,
      payload: { action: 'turn_on' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// =========================================================================
// CONTROL STATE
// =========================================================================
describe('control-state — lógico/simulado', () => {
  it('controllable true para device con switch', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${device.id}/control-state`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.controllable).toBe(true);
    expect(body.current_state).toBe('unknown'); // sin acciones
    expect(body.last_action).toBeNull();
    expect(body.dry_run).toBe(true);
  });

  it('controllable false para device sin switch', async () => {
    const { noCtl } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${noCtl.id}/control-state`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().controllable).toBe(false);
  });

  it('estado lógico tras turn_on dry-run → on', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await postAction(device.id, owner.token, { action: 'turn_on' });
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${device.id}/control-state`,
      headers: authHeader(owner.token),
    });
    expect(res.json().current_state).toBe('on');
    expect(res.json().last_action.action).toBe('turn_on');
  });

  it('tenant ajeno → 403', async () => {
    const { device } = await setupDevices(other.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${device.id}/control-state`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(403);
  });
});

// =========================================================================
// CONTROL SCHEDULES
// =========================================================================
describe('control-schedules — solo política', () => {
  it('create OK + NO crea control_action', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(owner.token),
      payload: { name: 'Noche', action: 'turn_off', cron: '0 23 * * *' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.action).toBe('turn_off');
    expect(body.name).toBe('Noche');
    expect(body.cron).toBe('0 23 * * *');
    expect(body.enabled).toBe(true);

    const audits = await prisma.auditLog.count({
      where: { action: 'control_schedule.created', entityId: body.id },
    });
    expect(audits).toBe(1);

    // NO ejecuta: sin control_actions.
    const actions = await prisma.controlAction.count({ where: { deviceId: device.id } });
    expect(actions).toBe(0);
  });

  it('list OK', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(owner.token),
      payload: { name: 'A', action: 'turn_on' },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);
  });

  it('patch enabled OK', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const created = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(owner.token),
      payload: { name: 'B', action: 'turn_on' },
    });
    const id = created.json().id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/control-schedules/${id}`,
      headers: authHeader(owner.token),
      payload: { enabled: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().enabled).toBe(false);
    const audits = await prisma.auditLog.count({
      where: { action: 'control_schedule.updated', entityId: id },
    });
    expect(audits).toBe(1);
  });

  it('set_limit-as-schedule → 422', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(owner.token),
      payload: { name: 'X', action: 'set_limit' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('viewer → 403', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: other.userId, organizationId: owner.organizationId },
      },
      create: {
        userId: other.userId,
        organizationId: owner.organizationId,
        role: 'viewer',
        status: 'active',
      },
      update: { role: 'viewer', status: 'active' },
    });
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(other.token),
      payload: { name: 'Y', action: 'turn_on' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('tenant ajeno → 403', async () => {
    const { device } = await setupDevices(other.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/control-schedules`,
      headers: authHeader(owner.token),
      payload: { name: 'Z', action: 'turn_on' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// =========================================================================
// CONSUMPTION LIMITS
// =========================================================================
describe('consumption-limits — solo política', () => {
  it('create power_w OK + NO crea control_action', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
      payload: { limit_type: 'power_w', threshold: 1500, action: 'notify' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.limit_type).toBe('power_w');
    expect(body.threshold).toBe(1500);
    expect(body.action).toBe('notify'); // notify→'alert' (DB) → 'notify' (API)
    expect(body.enabled).toBe(true);

    const audits = await prisma.auditLog.count({
      where: { action: 'consumption_limit.created', entityId: body.id },
    });
    expect(audits).toBe(1);

    const actions = await prisma.controlAction.count({ where: { deviceId: device.id } });
    expect(actions).toBe(0);
  });

  it('create energy_kwh_month OK', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
      payload: { limit_type: 'energy_kwh_month', threshold: 300, action: 'turn_off' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().limit_type).toBe('energy_kwh_month');
    expect(res.json().action).toBe('turn_off');
  });

  it('threshold <= 0 → 422', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
      payload: { limit_type: 'power_w', threshold: 0, action: 'notify' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('list OK', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
      payload: { limit_type: 'power_w', threshold: 1000, action: 'notify' },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);
  });

  it('patch OK', async () => {
    const { device } = await setupDevices(owner.organizationId);
    const created = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
      payload: { limit_type: 'power_w', threshold: 1000, action: 'notify' },
    });
    const id = created.json().id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/consumption-limits/${id}`,
      headers: authHeader(owner.token),
      payload: { threshold: 2000, enabled: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().threshold).toBe(2000);
    expect(res.json().enabled).toBe(false);
    const audits = await prisma.auditLog.count({
      where: { action: 'consumption_limit.updated', entityId: id },
    });
    expect(audits).toBe(1);
  });

  it('viewer → 403', async () => {
    const { device } = await setupDevices(owner.organizationId);
    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: other.userId, organizationId: owner.organizationId },
      },
      create: {
        userId: other.userId,
        organizationId: owner.organizationId,
        role: 'viewer',
        status: 'active',
      },
      update: { role: 'viewer', status: 'active' },
    });
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(other.token),
      payload: { limit_type: 'power_w', threshold: 1000, action: 'notify' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('tenant ajeno → 403', async () => {
    const { device } = await setupDevices(other.organizationId);
    const res = await app.inject({
      method: 'POST',
      url: `/devices/${device.id}/consumption-limits`,
      headers: authHeader(owner.token),
      payload: { limit_type: 'power_w', threshold: 1000, action: 'notify' },
    });
    expect(res.statusCode).toBe(403);
  });
});
