import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import { Prisma } from '@smartsense/db';
// telemetryRoutes ya se registra en buildApp()/makeTestApp(); no re-registrar aquí.

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

async function createInstallation(organizationId: string) {
  return prisma.installation.create({
    data: { organizationId, name: `Inst ${randomUUID()}`, segment: 'home' },
  });
}

async function createKit(installationId: string) {
  return prisma.energyKit.create({
    data: {
      installationId,
      qrCode: `qr-${randomUUID()}`,
      serial: `sn-${randomUUID()}`,
      status: 'active',
    },
  });
}

async function createDevice(
  kitId: string,
  installationId: string,
  capabilities: Prisma.InputJsonValue = { meter: true },
) {
  return prisma.device.create({
    data: {
      kitId,
      installationId,
      name: `Dev ${randomUUID()}`,
      externalRef: `ext-${randomUUID()}`,
      capabilities,
      state: 'unknown',
    },
  });
}

/** Construye un payload de ingesta válido para un device/kit/installation dados. */
function ingestPayload(
  device: { id: string; kitId: string; installationId: string },
  overrides: Record<string, unknown> = {},
) {
  return {
    device_id: device.id,
    kit_id: device.kitId,
    installation_id: device.installationId,
    source_timestamp: new Date().toISOString(),
    active_power_w: 1200.5,
    energy_wh_delta: 50.25,
    power_factor: 0.95,
    ...overrides,
  };
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('telemetry ingest', () => {
  it('acepta una lectura válida (200 accepted, event_hash)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('accepted');
    expect(body.event_hash).toBeTruthy();
    expect(body.reading_id).toBeTruthy();
    expect(body.received_timestamp).toBeTruthy();

    // device marcado online + last_seen_at.
    const updated = await prisma.device.findUnique({ where: { id: device.id } });
    expect(updated?.state).toBe('online');
    expect(updated?.lastSeenAt).not.toBeNull();
  });

  it('reenvío del mismo event_hash → 200 duplicate, no duplica filas', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);
    const payload = ingestPayload(device, { event_hash: `eh-${randomUUID()}` });

    const first = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload,
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().status).toBe('accepted');

    const second = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().status).toBe('duplicate');
    expect(second.json().reading_id).toBe(first.json().reading_id);

    const count = await prisma.telemetryReading.count({
      where: { eventHash: first.json().event_hash },
    });
    expect(count).toBe(1);
  });

  it('rechaza device inexistente (404)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload({
        id: randomUUID(),
        kitId: kit.id,
        installationId: inst.id,
      }),
    });
    expect(res.statusCode).toBe(404);
  });

  it('rechaza device de otra installation/tenant (403/404)', async () => {
    // device vive en el tenant `other`; owner intenta ingerir usando su propio installation_id.
    const otherInst = await createInstallation(other.organizationId);
    const otherKit = await createKit(otherInst.id);
    const otherDevice = await createDevice(otherKit.id, otherInst.id);

    const ownInst = await createInstallation(owner.organizationId);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload({
        id: otherDevice.id,
        kitId: otherKit.id,
        installationId: ownInst.id,
      }),
    });
    // owner no accede al installation ajeno; si declara el propio, el device no coincide.
    expect([403, 404, 409]).toContain(res.statusCode);

    // Caso directo cross-tenant: owner intenta ingerir contra installation ajena.
    const direct = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload({
        id: otherDevice.id,
        kitId: otherKit.id,
        installationId: otherInst.id,
      }),
    });
    expect(direct.statusCode).toBe(403);
  });

  it('rechaza mismatch kit/installation (409)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { kit_id: randomUUID() }),
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('DEVICE_KIT_MISMATCH');
  });

  it('rechaza active_power_w negativo (422 zod)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { active_power_w: -1 }),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rechaza energy_wh_delta negativo (422)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { energy_wh_delta: -5 }),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rechaza power_factor > 1 (422)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { power_factor: 1.5 }),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rechaza source_timestamp futuro (422 INVALID_TIMESTAMP)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { source_timestamp: future }),
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('INVALID_TIMESTAMP');
  });

  it('sin token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/iot/telemetry', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});

describe('telemetry latest', () => {
  it('devuelve la última lectura (200)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { active_power_w: 999 }),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/telemetry/latest`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.installationId).toBe(inst.id);
    expect(body.latestReading).not.toBeNull();
    expect(body.latestReading.active_power_w).toBe(999);
    expect(body.deviceCount).toBeGreaterThanOrEqual(1);
    expect(body.receivedTimestamp).toBeTruthy();
  });

  it('empty state: installation nueva sin lecturas → latestReading null', async () => {
    const inst = await createInstallation(owner.organizationId);

    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/telemetry/latest`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.latestReading).toBeNull();
    expect(body.receivedTimestamp).toBeNull();
    expect(body.deviceCount).toBe(0);
  });
});

describe('telemetry range', () => {
  it('devuelve lecturas del rango (200)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device),
    });

    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 60 * 1000).toISOString();
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/telemetry/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.installationId).toBe(inst.id);
    expect(Array.isArray(body.readings)).toBe(true);
    expect(body.readings.length).toBeGreaterThanOrEqual(1);
  });

  it('from > to → 422', async () => {
    const inst = await createInstallation(owner.organizationId);
    const from = new Date(Date.now()).toISOString();
    const to = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/telemetry/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(422);
  });

  it('device_id ajeno → 4xx', async () => {
    const inst = await createInstallation(owner.organizationId);
    const otherInst = await createInstallation(other.organizationId);
    const otherKit = await createKit(otherInst.id);
    const otherDevice = await createDevice(otherKit.id, otherInst.id);

    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();
    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/telemetry/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&device_id=${otherDevice.id}`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
  });
});

describe('telemetry aggregation & side-effects', () => {
  it('tras ingest existe energy_aggregate (hour) con energyKwh > 0', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device, { energy_wh_delta: 2000 }), // 2 kWh
    });

    const aggregates = await prisma.energyAggregate.findMany({
      where: { installationId: inst.id, deviceId: device.id, granularity: 'hour' },
    });
    expect(aggregates.length).toBe(1);
    expect(Number(aggregates[0].energyKwh)).toBeCloseTo(2, 3);
    expect(aggregates[0].costClp).toBeNull();
  });

  it('NO crea alerts/recommendations/control (0 filas)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const device = await createDevice(kit.id, inst.id);

    await app.inject({
      method: 'POST',
      url: '/iot/telemetry',
      headers: authHeader(owner.token),
      payload: ingestPayload(device),
    });

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
