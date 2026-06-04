/**
 * Tests del módulo dashboard (Fase 4) contra la DB real (Neon dev).
 *
 * dashboardRoutes aún NO se registra en buildApp() (el usuario lo agrega a app.ts).
 * Por eso el test registra la ruta sobre la app de test para ser autocontenido.
 *
 * Datos únicos por test (randomUUID) → aserciones acotadas al tenant creado.
 * Invariantes verificadas: costo sólo vía tarifa (BR-031), alerts_pending_count===0
 * literal, y CERO side-effects (no se crean alerts/recommendations/control).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import {
  createInstallationForUser,
  createKitAndDevice,
  insertReading,
  createDemoTariff,
  linkTariff,
} from '../../../tests/helpers/energy-fixtures.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

/** GET /installations/:id/dashboard con el token dado. */
function getDashboard(installationId: string, token: string) {
  return app.inject({
    method: 'GET',
    url: `/installations/${installationId}/dashboard`,
    headers: authHeader(token),
  });
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  // Registrar la ruta del dashboard (aún no está en buildApp).
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('dashboard — happy path con lecturas', () => {
  it('devuelve potencia/energía/device_count y data_status live', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);

    const recent = new Date(Date.now() - 60 * 1000); // 1 min atrás → live
    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: recent,
      activePowerW: 1500,
      energyWhDelta: 2500, // 2.5 kWh
    });

    const res = await getDashboard(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.installation_id).toBe(inst.id);
    expect(body.current_power_w).toBe(1500);
    expect(body.today_energy_kwh).toBeGreaterThan(0);
    expect(body.device_count).toBe(1);
    expect(body.data_status).toBe('live');
    expect(body.latest_reading_timestamp).toBeTruthy();
    expect(body.alerts_pending_count).toBe(0);
  });
});

describe('dashboard — empty state', () => {
  it('installation nueva sin lecturas → data_status empty, power null, energy 0', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);

    const res = await getDashboard(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.data_status).toBe('empty');
    expect(body.current_power_w).toBeNull();
    expect(body.today_energy_kwh).toBe(0);
    expect(body.month_energy_kwh).toBe(0);
    expect(body.latest_reading_timestamp).toBeNull();
    expect(body.device_count).toBe(0);
    // Sin tarifa → costos null (BR-031).
    expect(body.today_cost_clp).toBeNull();
    expect(body.month_cost_clp).toBeNull();
    expect(body.alerts_pending_count).toBe(0);
  });
});

describe('dashboard — tenant ajeno', () => {
  it('owner accediendo a installation de otra org → 403', async () => {
    const otherInst = await createInstallationForUser(prisma, other.organizationId);

    const res = await getDashboard(otherInst.id, owner.token);
    expect(res.statusCode).toBe(403);
  });

  it('sin token → 401', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/dashboard`,
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('dashboard — costos vía tarifa (BR-031)', () => {
  it('sin tarifa → today_cost_clp null; con tarifa → number', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);

    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: new Date(Date.now() - 2 * 60 * 1000),
      activePowerW: 800,
      energyWhDelta: 3000, // 3 kWh
    });

    // Sin tarifa: costo null aunque haya energía > 0.
    const before = await getDashboard(inst.id, owner.token);
    expect(before.statusCode).toBe(200);
    const beforeBody = before.json();
    expect(beforeBody.today_energy_kwh).toBeGreaterThan(0);
    expect(beforeBody.today_cost_clp).toBeNull();
    expect(beforeBody.month_cost_clp).toBeNull();

    // Con tarifa válida: costo numérico calculado por BillingService.
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, inst.id, tariff.id);

    const after = await getDashboard(inst.id, owner.token);
    expect(after.statusCode).toBe(200);
    const afterBody = after.json();
    expect(typeof afterBody.today_cost_clp).toBe('number');
    expect(afterBody.today_cost_clp).toBeGreaterThan(0);
    expect(typeof afterBody.month_cost_clp).toBe('number');
  });
});

describe('dashboard — sin side-effects (Fase 5 no implementada)', () => {
  it('alerts_pending_count===0 y no se crean alerts/recommendations/control', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);

    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: new Date(Date.now() - 60 * 1000),
      activePowerW: 1200,
      energyWhDelta: 1000,
    });

    const res = await getDashboard(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    expect(res.json().alerts_pending_count).toBe(0);

    const [alerts, recs, actions] = await Promise.all([
      prisma.alert.count({ where: { installationId: inst.id } }),
      prisma.recommendation.count({ where: { installationId: inst.id } }),
      prisma.controlAction.count({ where: { deviceId: device.id } }),
    ]);
    expect(alerts).toBe(0);
    expect(recs).toBe(0);
    expect(actions).toBe(0);
  });
});

describe('dashboard — data_status stale', () => {
  it('última lectura > 15 min → stale', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);

    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: new Date(Date.now() - 20 * 60 * 1000), // 20 min atrás
      activePowerW: 500,
      energyWhDelta: 100,
    });

    const res = await getDashboard(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    expect(res.json().data_status).toBe('stale');
  });
});
