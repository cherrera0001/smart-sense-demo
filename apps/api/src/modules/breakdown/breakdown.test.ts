/**
 * Tests del módulo breakdown (Fase 4) contra la DB real (Neon dev).
 *
 * breakdownRoutes NO está registrada en buildApp() (no se toca app.ts en esta fase),
 * así que se registra sobre la instancia de test tras makeTestApp(). Datos únicos por
 * test (randomUUID) → aserciones acotadas al tenant creado.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import {
  createInstallationForUser,
  createKitAndDevice,
  ensureCategory,
  insertAggregate,
  insertReading,
  createDemoTariff,
  linkTariff,
} from '../../../tests/helpers/energy-fixtures.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

interface BreakdownItem {
  id: string;
  name: string;
  category: string | null;
  energy_kwh: number;
  cost_clp: number | null;
  percentage: number;
}
interface BreakdownResponse {
  installation_id: string;
  from: string;
  to: string;
  group_by: 'device' | 'category';
  items: BreakdownItem[];
  total_energy_kwh: number;
  total_cost_clp: number | null;
  data_status: 'complete' | 'partial' | 'empty';
}

async function getBreakdown(
  installationId: string,
  token: string,
  qs = '',
): Promise<{ status: number; body: BreakdownResponse }> {
  const res = await app.inject({
    method: 'GET',
    url: `/installations/${installationId}/breakdown${qs}`,
    headers: authHeader(token),
  });
  return { status: res.statusCode, body: res.json() as BreakdownResponse };
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  // Registrar la ruta de breakdown sobre la app de test (no está en buildApp en Fase 4).
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('GET /installations/:installationId/breakdown', () => {
  it('agrupa por device (default) con energía y nombres correctos, % suman ~100', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const catA = await ensureCategory(prisma, `cat-a-${randomUUID()}`, 'Refrigeración');
    const catB = await ensureCategory(prisma, `cat-b-${randomUUID()}`, 'Climatización');

    const d1 = await createKitAndDevice(prisma, inst.id, { categoryId: catA.id, name: 'Refri' });
    const d2 = await createKitAndDevice(prisma, inst.id, { categoryId: catB.id, name: 'Aire' });
    const d3 = await createKitAndDevice(prisma, inst.id, { categoryId: catA.id, name: 'Freezer' });

    const bucket = new Date(Date.now() - 24 * 60 * 60 * 1000); // ayer, dentro de 7d
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d1.device.id, categoryId: catA.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 5,
    });
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d2.device.id, categoryId: catB.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 3,
    });
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d3.device.id, categoryId: catA.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 2,
    });

    const { status, body } = await getBreakdown(inst.id, owner.token);
    expect(status).toBe(200);
    expect(body.group_by).toBe('device');
    expect(body.installation_id).toBe(inst.id);
    expect(body.items).toHaveLength(3);

    const byId = new Map(body.items.map((i) => [i.id, i]));
    expect(byId.get(d1.device.id)?.energy_kwh).toBe(5);
    expect(byId.get(d1.device.id)?.name).toBe('Refri');
    expect(byId.get(d1.device.id)?.category).toBe('Refrigeración');
    expect(byId.get(d2.device.id)?.energy_kwh).toBe(3);
    expect(byId.get(d2.device.id)?.category).toBe('Climatización');
    expect(byId.get(d3.device.id)?.energy_kwh).toBe(2);

    expect(body.total_energy_kwh).toBe(10);
    const sumPct = body.items.reduce((acc, i) => acc + i.percentage, 0);
    expect(Math.abs(sumPct - 100)).toBeLessThanOrEqual(0.5);
  });

  it('agrupa por category sumando devices de la misma categoría', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const catA = await ensureCategory(prisma, `cat-a-${randomUUID()}`, 'Refrigeración');
    const catB = await ensureCategory(prisma, `cat-b-${randomUUID()}`, 'Climatización');

    const d1 = await createKitAndDevice(prisma, inst.id, { categoryId: catA.id });
    const d2 = await createKitAndDevice(prisma, inst.id, { categoryId: catB.id });
    const d3 = await createKitAndDevice(prisma, inst.id, { categoryId: catA.id });

    const bucket = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d1.device.id, categoryId: catA.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 4,
    });
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d2.device.id, categoryId: catB.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 6,
    });
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d3.device.id, categoryId: catA.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 2,
    });

    const { status, body } = await getBreakdown(inst.id, owner.token, '?group_by=category');
    expect(status).toBe(200);
    expect(body.group_by).toBe('category');
    expect(body.items).toHaveLength(2); // catA + catB

    const byId = new Map(body.items.map((i) => [i.id, i]));
    expect(byId.get(catA.id)?.energy_kwh).toBe(6); // 4 + 2
    expect(byId.get(catA.id)?.name).toBe('Refrigeración');
    expect(byId.get(catA.id)?.category).toBe('Refrigeración');
    expect(byId.get(catB.id)?.energy_kwh).toBe(6);

    expect(body.total_energy_kwh).toBe(12);
    const sumPct = body.items.reduce((acc, i) => acc + i.percentage, 0);
    expect(Math.abs(sumPct - 100)).toBeLessThanOrEqual(0.5);
  });

  it('empty state: sin datos → items vacíos, total 0, percentages N/A, data_status empty', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    // device sin mediciones: NO debe aparecer (no se inventan devices con 0).
    await createKitAndDevice(prisma, inst.id);

    const { status, body } = await getBreakdown(inst.id, owner.token);
    expect(status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.total_energy_kwh).toBe(0);
    expect(body.total_cost_clp).toBeNull();
    expect(body.data_status).toBe('empty');
  });

  it('cost_clp es null sin tarifa y number con tarifa', async () => {
    // Sin tarifa.
    const instNoTariff = await createInstallationForUser(prisma, owner.organizationId);
    const dn = await createKitAndDevice(prisma, instNoTariff.id);
    const bucket = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await insertAggregate(prisma, {
      installationId: instNoTariff.id, deviceId: dn.device.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 10,
    });
    const noTariff = await getBreakdown(instNoTariff.id, owner.token);
    expect(noTariff.body.items[0].cost_clp).toBeNull();
    expect(noTariff.body.total_cost_clp).toBeNull();

    // Con tarifa (165 CLP/kWh).
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    const instTariff = await createInstallationForUser(prisma, owner.organizationId, {
      tariffId: tariff.id,
    });
    await linkTariff(prisma, instTariff.id, tariff.id);
    const dt = await createKitAndDevice(prisma, instTariff.id);
    await insertAggregate(prisma, {
      installationId: instTariff.id, deviceId: dt.device.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 10,
    });
    const withTariff = await getBreakdown(instTariff.id, owner.token);
    expect(withTariff.body.items[0].cost_clp).toBe(1650); // 10 * 165
    expect(typeof withTariff.body.total_cost_clp).toBe('number');
    expect(withTariff.body.total_cost_clp).toBe(1650);
  });

  it('deriva de telemetría cuando no hay agregados en el rango', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const d1 = await createKitAndDevice(prisma, inst.id, { name: 'TelDev' });
    const ts = new Date(Date.now() - 2 * 60 * 60 * 1000); // hace 2h, dentro de 7d
    // 2000 Wh + 1000 Wh = 3000 Wh = 3 kWh
    await insertReading(prisma, {
      deviceId: d1.device.id, kitId: d1.kit.id, installationId: inst.id,
      sourceTimestamp: ts, energyWhDelta: 2000,
    });
    await insertReading(prisma, {
      deviceId: d1.device.id, kitId: d1.kit.id, installationId: inst.id,
      sourceTimestamp: new Date(ts.getTime() + 60_000), energyWhDelta: 1000,
    });

    const { status, body } = await getBreakdown(inst.id, owner.token);
    expect(status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(d1.device.id);
    expect(body.items[0].energy_kwh).toBeCloseTo(3, 5);
    expect(body.total_energy_kwh).toBeCloseTo(3, 5);
    expect(body.data_status).toBe('partial'); // vino de telemetría cruda
  });

  it('respeta from/to explícitos (excluye datos fuera del rango)', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const d1 = await createKitAndDevice(prisma, inst.id);
    const inRange = new Date('2026-03-15T12:00:00.000Z');
    const outRange = new Date('2026-01-01T12:00:00.000Z');
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d1.device.id,
      granularity: 'day', bucketStart: inRange, energyKwh: 7,
    });
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d1.device.id,
      granularity: 'day', bucketStart: outRange, energyKwh: 99,
    });

    const qs = '?from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.000Z';
    const { body } = await getBreakdown(inst.id, owner.token, qs);
    expect(body.total_energy_kwh).toBe(7); // 99 queda fuera
    expect(body.items[0].energy_kwh).toBe(7);
  });

  it('tenant ajeno → 403', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/breakdown`,
      headers: authHeader(other.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('sin token → 401', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/breakdown`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('NO produce side-effects: 0 recommendations / 0 alerts para la instalación', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const d1 = await createKitAndDevice(prisma, inst.id);
    const bucket = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await insertAggregate(prisma, {
      installationId: inst.id, deviceId: d1.device.id,
      granularity: 'day', bucketStart: bucket, energyKwh: 5,
    });

    await getBreakdown(inst.id, owner.token);
    await getBreakdown(inst.id, owner.token, '?group_by=category');

    const [recs, alerts] = await Promise.all([
      prisma.recommendation.count({ where: { installationId: inst.id } }),
      prisma.alert.count({ where: { installationId: inst.id } }),
    ]);
    expect(recs).toBe(0);
    expect(alerts).toBe(0);
  });
});
