/**
 * Tests del módulo alerts (Fase 5) contra la DB real (Neon dev).
 *
 * alertsRoutes aún NO está en buildApp() (el usuario lo registra en app.ts). Para
 * ser autocontenido, el test registra la ruta sobre la app de test en beforeAll.
 *
 * Datos únicos por test (randomUUID) → aserciones acotadas al tenant creado.
 * Invariantes verificadas:
 *  - Evaluación basada en EVIDENCIA (sin baseline suficiente → NO alerta).
 *  - Dedup de alertas open equivalentes.
 *  - Tenant-scope estricto (GET/PATCH cross-tenant → 403).
 *  - RBAC review: viewer NO revisa (403).
 *  - Review audita (`alert.review`) y NO crea control_actions.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import {
  createInstallationForUser,
  createKitAndDevice,
  insertAggregate,
  insertReading,
} from '../../../tests/helpers/energy-fixtures.js';
import { evaluateInstallationAlerts } from './alert-evaluation.service.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inicio del día UTC. */
function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function getAlerts(installationId: string, token: string, qs = '') {
  return app.inject({
    method: 'GET',
    url: `/installations/${installationId}/alerts${qs}`,
    headers: authHeader(token),
  });
}

function reviewAlert(alertId: string, token: string, body: object) {
  return app.inject({
    method: 'PATCH',
    url: `/alerts/${alertId}/review`,
    headers: authHeader(token),
    payload: body,
  });
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  // Registrar la ruta de alerts (aún no está en buildApp).
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('GET alerts — empty state', () => {
  it('instalación sin alertas → items vacío, total 0', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const res = await getAlerts(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.installation_id).toBe(inst.id);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('sin token → 401', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/alerts`,
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('evaluación high_consumption (→ over_budget) con evidencia', () => {
  it('baseline 7 días + hoy alto → 1 alerta over_budget warning', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const now = new Date();
    const todayStart = utcDayStart(now);

    // 7 días de baseline (~10 kWh/día) en energy_aggregates (granularity day).
    for (let i = 1; i <= 7; i++) {
      await insertAggregate(prisma, {
        installationId: inst.id,
        granularity: 'day',
        bucketStart: new Date(todayStart.getTime() - i * DAY_MS),
        energyKwh: 10,
      });
    }
    // Hoy: 25 kWh (ratio 2.5 > 1.3).
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: todayStart,
      energyKwh: 25,
    });

    const created = await evaluateInstallationAlerts(prisma, inst.id, { now });
    const overBudget = created.filter(
      (a) =>
        a.type === 'over_budget' &&
        (a.context as Record<string, unknown>)?.subtype === 'high_consumption',
    );
    expect(overBudget).toHaveLength(1);
    expect(overBudget[0].severity).toBe('warning');
    const ctx = overBudget[0].context as Record<string, unknown>;
    expect(Number(ctx.today_kwh)).toBeCloseTo(25, 1);
    expect(Number(ctx.baseline_kwh)).toBeCloseTo(10, 1);
    expect(Number(ctx.ratio)).toBeGreaterThan(1.3);

    // Visible vía API (status open por defecto).
    const res = await getAlerts(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    const item = res.json().items.find((x: { id: string }) => x.id === overBudget[0].id);
    expect(item).toBeTruthy();
    expect(item.type).toBe('over_budget');
    expect(item.status).toBe('open');
    expect(item.title).toBeTruthy();
    expect(item.detected_at).toBeTruthy();
    expect(item.metadata.subtype).toBe('high_consumption');
  });

  it('sin baseline suficiente (<3 días) → NO crea alerta de consumo', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const now = new Date();
    const todayStart = utcDayStart(now);

    // Sólo 2 días de baseline + hoy alto: insuficiente.
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: new Date(todayStart.getTime() - DAY_MS),
      energyKwh: 8,
    });
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: new Date(todayStart.getTime() - 2 * DAY_MS),
      energyKwh: 9,
    });
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: todayStart,
      energyKwh: 50,
    });

    const created = await evaluateInstallationAlerts(prisma, inst.id, { now });
    const highConsumption = created.filter(
      (a) => (a.context as Record<string, unknown>)?.subtype === 'high_consumption',
    );
    expect(highConsumption).toHaveLength(0);
  });
});

describe('evaluación offline con evidencia', () => {
  it('device con lectura vieja (>60 min) → alerta offline info', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);

    // Evidencia de que estuvo online: lectura de hace 2 horas.
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: old,
      activePowerW: 100,
      energyWhDelta: 50,
    });

    const created = await evaluateInstallationAlerts(prisma, inst.id);
    const offline = created.filter((a) => a.type === 'offline' && a.deviceId === device.id);
    expect(offline).toHaveLength(1);
    expect(offline[0].severity).toBe('info');
    expect((offline[0].context as Record<string, unknown>).subtype).toBe('offline');
  });

  it('device que nunca transmitió (sin evidencia) → NO alerta offline', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    await createKitAndDevice(prisma, inst.id); // sin lecturas ni lastSeenAt

    const created = await evaluateInstallationAlerts(prisma, inst.id);
    const offline = created.filter((a) => a.type === 'offline');
    expect(offline).toHaveLength(0);
  });
});

describe('dedup — no duplica alerta open equivalente', () => {
  it('evaluar 2 veces → no duplica', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: old,
      activePowerW: 100,
      energyWhDelta: 50,
    });

    const first = await evaluateInstallationAlerts(prisma, inst.id);
    expect(first.filter((a) => a.type === 'offline')).toHaveLength(1);

    // Segunda evaluación: la alerta open ya existe → no se crea otra.
    const second = await evaluateInstallationAlerts(prisma, inst.id);
    expect(second.filter((a) => a.type === 'offline')).toHaveLength(0);

    const total = await prisma.alert.count({
      where: { installationId: inst.id, type: 'offline', deviceId: device.id, status: 'open' },
    });
    expect(total).toBe(1);
  });
});

describe('tenant ajeno', () => {
  it('GET alerts de otra org → 403', async () => {
    const otherInst = await createInstallationForUser(prisma, other.organizationId);
    const res = await getAlerts(otherInst.id, owner.token);
    expect(res.statusCode).toBe(403);
  });

  it('PATCH review de alerta de otra org → 403', async () => {
    const otherInst = await createInstallationForUser(prisma, other.organizationId);
    const alert = await prisma.alert.create({
      data: {
        installationId: otherInst.id,
        type: 'offline',
        severity: 'info',
        status: 'open',
        message: 'foreign',
        context: { subtype: 'offline' },
      },
    });
    const res = await reviewAlert(alert.id, owner.token, { status: 'reviewed' });
    expect(res.statusCode).toBe(403);
  });

  it('PATCH review de alerta inexistente → 404', async () => {
    const res = await reviewAlert(
      '00000000-0000-0000-0000-000000000000',
      owner.token,
      { status: 'reviewed' },
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH review — happy path + audit + RBAC', () => {
  it('review OK → status reviewed, reviewed_at, audit creado, sin control_actions', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { device } = await createKitAndDevice(prisma, inst.id);
    const alert = await prisma.alert.create({
      data: {
        installationId: inst.id,
        deviceId: device.id,
        type: 'high_device',
        severity: 'warning',
        status: 'open',
        message: 'top device',
        context: { subtype: 'device_high' },
      },
    });

    const res = await reviewAlert(alert.id, owner.token, { status: 'reviewed', note: 'ok' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(alert.id);
    expect(body.status).toBe('reviewed');
    expect(body.reviewed_at).toBeTruthy();

    // Persistido.
    const fresh = await prisma.alert.findUnique({ where: { id: alert.id } });
    expect(fresh?.status).toBe('reviewed');
    expect(fresh?.reviewedBy).toBe(owner.userId);
    expect(fresh?.reviewedAt).toBeTruthy();

    // Audit creado.
    const audits = await prisma.auditLog.count({
      where: { action: 'alert.review', entityType: 'alert', entityId: alert.id },
    });
    expect(audits).toBe(1);

    // NO crea control_actions.
    const actions = await prisma.controlAction.count({ where: { deviceId: device.id } });
    expect(actions).toBe(0);
  });

  it('dismiss OK → status dismissed', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const alert = await prisma.alert.create({
      data: {
        installationId: inst.id,
        type: 'anomaly',
        severity: 'info',
        status: 'open',
        message: 'anom',
        context: { subtype: 'anomaly' },
      },
    });
    const res = await reviewAlert(alert.id, owner.token, { status: 'dismissed' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('dismissed');
  });

  it('viewer NO puede revisar → 403', async () => {
    // `other` recibe membership viewer en la org de `owner`.
    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: other.userId,
          organizationId: owner.organizationId,
        },
      },
      create: {
        userId: other.userId,
        organizationId: owner.organizationId,
        role: 'viewer',
        status: 'active',
      },
      update: { role: 'viewer', status: 'active' },
    });

    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const alert = await prisma.alert.create({
      data: {
        installationId: inst.id,
        type: 'over_budget',
        severity: 'warning',
        status: 'open',
        message: 'over',
        context: { subtype: 'high_consumption' },
      },
    });

    const res = await reviewAlert(alert.id, other.token, { status: 'reviewed' });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('FORBIDDEN');
  });
});
