/**
 * Tests de reports (Fase 4) contra la DB real (Neon dev).
 *
 * reportsRoutes NO se registra en buildApp() (app.ts no se modifica en esta fase),
 * por lo que aquí se registra explícitamente sobre el app de test. Usa app.inject().
 *
 * Datos únicos por test (randomUUID): aserciones acotadas al tenant/instalación creada.
 * Buckets en UTC controlados; se valida que totals cuadren con la suma de points.
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
  createDemoTariff,
  linkTariff,
} from '../../../tests/helpers/energy-fixtures.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

/** Inicio del día UTC de una fecha. */
function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addUtcMonths(monthStart: Date, n: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + n, 1));
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface ReportBody {
  installation_id: string;
  period: string;
  from: string;
  to: string;
  points: { bucket_start: string; energy_kwh: number; cost_clp: number | null; peak_power_w: number | null }[];
  totals: { energy_kwh: number; cost_clp: number | null; peak_power_w: number | null };
  data_status: string;
}

/** Aserción central: totals cuadran con la suma/máximo de points. */
function assertTotalsConsistent(body: ReportBody): void {
  const sumEnergy = body.points.reduce((s, p) => s + p.energy_kwh, 0);
  expect(body.totals.energy_kwh).toBeCloseTo(sumEnergy, 6);

  const peaks = body.points.map((p) => p.peak_power_w).filter((v): v is number => v != null);
  if (peaks.length === 0) {
    expect(body.totals.peak_power_w).toBeNull();
  } else {
    expect(body.totals.peak_power_w).toBe(Math.max(...peaks));
  }

  const costs = body.points.map((p) => p.cost_clp);
  if (costs.every((c) => c == null)) {
    expect(body.totals.cost_clp).toBeNull();
  } else {
    const sumCost = costs.reduce<number>((s, c) => s + (c ?? 0), 0);
    expect(body.totals.cost_clp).toBe(sumCost);
  }
}

async function get(url: string, token: string) {
  return app.inject({ method: 'GET', url, headers: authHeader(token) });
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  // app.ts no registra reports en esta fase: se monta aquí para los tests.
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('GET reports/daily', () => {
  it('agrega por hora del día (UTC) desde energy_aggregates', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    await createKitAndDevice(prisma, inst.id);

    // Ancla un día fijo en el pasado para control total del rango.
    const day = utcDayStart(new Date('2026-05-10T00:00:00.000Z'));
    // Dos buckets-hora con datos: 02:00 (1.5 kWh, peak 800) y 05:00 (2.0 kWh, peak 1200).
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'hour',
      bucketStart: new Date(day.getTime() + 2 * 60 * 60 * 1000),
      energyKwh: 1.5,
      peakPowerW: 800,
    });
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'hour',
      bucketStart: new Date(day.getTime() + 5 * 60 * 60 * 1000),
      energyKwh: 2.0,
      peakPowerW: 1200,
    });

    const res = await get(
      `/installations/${inst.id}/reports/daily?date=2026-05-10`,
      owner.token,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as ReportBody;

    expect(body.period).toBe('daily');
    expect(body.installation_id).toBe(inst.id);
    expect(body.from).toBe(day.toISOString());
    expect(body.points).toHaveLength(24); // buckets vacíos incluidos
    expect(body.points[0].bucket_start).toBe(day.toISOString());

    const h2 = body.points[2];
    const h5 = body.points[5];
    expect(h2.energy_kwh).toBeCloseTo(1.5, 6);
    expect(h2.peak_power_w).toBe(800);
    expect(h5.energy_kwh).toBeCloseTo(2.0, 6);
    expect(h5.peak_power_w).toBe(1200);

    // Buckets sin datos → 0 / null.
    expect(body.points[0].energy_kwh).toBe(0);
    expect(body.points[0].peak_power_w).toBeNull();

    expect(body.totals.energy_kwh).toBeCloseTo(3.5, 6);
    expect(body.totals.peak_power_w).toBe(1200);
    expect(body.data_status).toBe('partial');
    assertTotalsConsistent(body);
  });
});

describe('GET reports/weekly', () => {
  it('agrega por día los últimos 7 días', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const anchor = new Date('2026-05-10T12:00:00.000Z');
    const todayStart = utcDayStart(anchor);
    const from = new Date(todayStart.getTime() - 6 * DAY_MS);

    // Dato en el primer día y en el último día del rango.
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: from,
      energyKwh: 10,
      peakPowerW: 2000,
    });
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: todayStart,
      energyKwh: 5,
      peakPowerW: 1500,
    });

    const res = await get(
      `/installations/${inst.id}/reports/weekly?date=2026-05-10`,
      owner.token,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as ReportBody;

    expect(body.period).toBe('weekly');
    expect(body.points).toHaveLength(7);
    expect(body.points[0].bucket_start).toBe(from.toISOString());
    expect(body.points[0].energy_kwh).toBeCloseTo(10, 6);
    expect(body.points[6].energy_kwh).toBeCloseTo(5, 6);
    expect(body.totals.energy_kwh).toBeCloseTo(15, 6);
    expect(body.totals.peak_power_w).toBe(2000);
    assertTotalsConsistent(body);
  });
});

describe('GET reports/monthly', () => {
  it('agrega por día del mes actual', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const anchor = new Date('2026-05-15T00:00:00.000Z');
    const monthStart = utcMonthStart(anchor);
    const daysInMonth = Math.round((addUtcMonths(monthStart, 1).getTime() - monthStart.getTime()) / DAY_MS);

    // Dato en el día 3 y día 15 del mes.
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: new Date(monthStart.getTime() + 2 * DAY_MS),
      energyKwh: 7,
      peakPowerW: 900,
    });
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'day',
      bucketStart: new Date(monthStart.getTime() + 14 * DAY_MS),
      energyKwh: 3,
      peakPowerW: 1100,
    });

    const res = await get(
      `/installations/${inst.id}/reports/monthly?date=2026-05-15`,
      owner.token,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as ReportBody;

    expect(body.period).toBe('monthly');
    expect(body.points).toHaveLength(daysInMonth); // mayo = 31
    expect(body.points[2].energy_kwh).toBeCloseTo(7, 6);
    expect(body.points[14].energy_kwh).toBeCloseTo(3, 6);
    expect(body.totals.energy_kwh).toBeCloseTo(10, 6);
    expect(body.totals.peak_power_w).toBe(1100);
    assertTotalsConsistent(body);
  });
});

describe('GET reports/last-three-months', () => {
  it('agrega por mes los últimos 3 meses', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const anchor = new Date('2026-05-15T00:00:00.000Z');
    const currentMonth = utcMonthStart(anchor);
    const m0 = addUtcMonths(currentMonth, -2); // marzo
    const m1 = addUtcMonths(currentMonth, -1); // abril
    const m2 = currentMonth; // mayo

    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'month',
      bucketStart: m0,
      energyKwh: 100,
      peakPowerW: 3000,
    });
    await insertAggregate(prisma, {
      installationId: inst.id,
      granularity: 'month',
      bucketStart: m2,
      energyKwh: 50,
      peakPowerW: 2500,
    });

    const res = await get(
      `/installations/${inst.id}/reports/last-three-months?date=2026-05-15`,
      owner.token,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as ReportBody;

    expect(body.period).toBe('last_three_months');
    expect(body.points).toHaveLength(3);
    expect(body.points[0].bucket_start).toBe(m0.toISOString());
    expect(body.points[1].bucket_start).toBe(m1.toISOString());
    expect(body.points[2].bucket_start).toBe(m2.toISOString());
    expect(body.points[0].energy_kwh).toBeCloseTo(100, 6);
    expect(body.points[1].energy_kwh).toBe(0); // mes sin datos
    expect(body.points[2].energy_kwh).toBeCloseTo(50, 6);
    expect(body.totals.energy_kwh).toBeCloseTo(150, 6);
    expect(body.totals.peak_power_w).toBe(3000);
    expect(body.data_status).toBe('partial');
    assertTotalsConsistent(body);
  });
});

describe('empty state', () => {
  it('sin datos → points con energy 0, totals 0, data_status empty', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);

    const res = await get(
      `/installations/${inst.id}/reports/daily?date=2026-05-10`,
      owner.token,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as ReportBody;

    expect(body.points).toHaveLength(24);
    expect(body.points.every((p) => p.energy_kwh === 0)).toBe(true);
    expect(body.points.every((p) => p.peak_power_w === null)).toBe(true);
    expect(body.totals.energy_kwh).toBe(0);
    expect(body.totals.peak_power_w).toBeNull();
    expect(body.data_status).toBe('empty');
    assertTotalsConsistent(body);
  });
});

describe('telemetry fallback', () => {
  it('sin agregados deriva de telemetry_readings (SUM/1000, MAX power)', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { kit, device } = await createKitAndDevice(prisma, inst.id);
    const day = utcDayStart(new Date('2026-05-11T00:00:00.000Z'));

    // Dos lecturas en la hora 03:00 UTC: 1500 + 500 Wh = 2 kWh; peak max 1300 W.
    const h3 = new Date(day.getTime() + 3 * 60 * 60 * 1000 + 5 * 60 * 1000);
    const h3b = new Date(day.getTime() + 3 * 60 * 60 * 1000 + 30 * 60 * 1000);
    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: h3,
      energyWhDelta: 1500,
      activePowerW: 1000,
    });
    await insertReading(prisma, {
      deviceId: device.id,
      kitId: kit.id,
      installationId: inst.id,
      sourceTimestamp: h3b,
      energyWhDelta: 500,
      activePowerW: 1300,
    });

    const res = await get(
      `/installations/${inst.id}/reports/daily?date=2026-05-11`,
      owner.token,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as ReportBody;

    expect(body.points[3].energy_kwh).toBeCloseTo(2, 6);
    expect(body.points[3].peak_power_w).toBe(1300);
    expect(body.totals.energy_kwh).toBeCloseTo(2, 6);
    expect(body.totals.peak_power_w).toBe(1300);
    assertTotalsConsistent(body);
  });
});

describe('cost_clp via BillingService', () => {
  it('null sin tarifa; number con tarifa vinculada', async () => {
    // Sin tarifa.
    const instNoTariff = await createInstallationForUser(prisma, owner.organizationId);
    await insertAggregate(prisma, {
      installationId: instNoTariff.id,
      granularity: 'hour',
      bucketStart: new Date(Date.UTC(2026, 4, 12, 4)),
      energyKwh: 2,
      peakPowerW: 500,
    });
    const resNo = await get(
      `/installations/${instNoTariff.id}/reports/daily?date=2026-05-12`,
      owner.token,
    );
    const bodyNo = resNo.json() as ReportBody;
    expect(bodyNo.points.every((p) => p.cost_clp === null)).toBe(true);
    expect(bodyNo.totals.cost_clp).toBeNull();
    assertTotalsConsistent(bodyNo);

    // Con tarifa (165 CLP/kWh).
    const instTariff = await createInstallationForUser(prisma, owner.organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, instTariff.id, tariff.id);
    await insertAggregate(prisma, {
      installationId: instTariff.id,
      granularity: 'hour',
      bucketStart: new Date(Date.UTC(2026, 4, 12, 4)),
      energyKwh: 2, // 2 * 165 = 330
      peakPowerW: 500,
    });
    const resYes = await get(
      `/installations/${instTariff.id}/reports/daily?date=2026-05-12`,
      owner.token,
    );
    const bodyYes = resYes.json() as ReportBody;
    expect(bodyYes.points[4].cost_clp).toBe(330);
    expect(bodyYes.totals.cost_clp).toBe(330);
    assertTotalsConsistent(bodyYes);
  });
});

describe('access control', () => {
  it('sin token → 401', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/reports/daily`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('tenant ajeno → 403', async () => {
    const otherInst = await createInstallationForUser(prisma, other.organizationId);
    const res = await get(
      `/installations/${otherInst.id}/reports/daily`,
      owner.token,
    );
    expect(res.statusCode).toBe(403);
  });
});
