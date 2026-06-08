import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

/** Crea una instalación vía prisma directo bajo la org dada. */
async function createInstallation(organizationId: string) {
  return prisma.installation.create({
    data: {
      organizationId,
      name: `Inst ${randomUUID()}`,
      segment: 'home',
    },
  });
}

/** Crea un EnergyKit activo asociado a una instalación (qrCode/serial únicos). */
async function createKit(installationId: string | null, status: 'active' | 'retired' = 'active') {
  return prisma.energyKit.create({
    data: {
      installationId,
      qrCode: `qr-${randomUUID()}`,
      serial: `sn-${randomUUID()}`,
      status,
    },
  });
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('devices', () => {
  it('crea un device con kit válido (201)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Heladera',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.device.installationId).toBe(inst.id);
    expect(body.device.kitId).toBe(kit.id);
    expect(body.device.state).toBe('unknown');
    expect(body.device.capabilities).toEqual({});
  });

  it('resuelve categoryKey a categoryId (201)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const category = await prisma.deviceCategory.create({
      data: { key: `cat-${randomUUID()}`, name: 'Refrigeración' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Freezer',
        externalRef: `ext-${randomUUID()}`,
        categoryKey: category.key,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().device.categoryId).toBe(category.id);
  });

  it('rechaza device sin kit existente (404)', async () => {
    const inst = await createInstallation(owner.organizationId);

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: randomUUID(),
        name: 'Fantasma',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rechaza device con kit de otra instalación (409)', async () => {
    const instA = await createInstallation(owner.organizationId);
    const instB = await createInstallation(owner.organizationId);
    const kitB = await createKit(instB.id);

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: instA.id,
        kitId: kitB.id,
        name: 'Cruzado',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('rechaza device con kit retired (409)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id, 'retired');

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Retirado',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('duplicado (kitId, externalRef) → 409', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const externalRef = `ext-${randomUUID()}`;
    const payload = { installationId: inst.id, kitId: kit.id, name: 'Dup', externalRef };

    const first = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload,
    });
    expect(second.statusCode).toBe(409);
  });

  it('rechaza crear bajo instalación ajena (403)', async () => {
    const inst = await createInstallation(other.organizationId);
    const kit = await createKit(inst.id);

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Ajeno',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('CROSS_TENANT_DENIED');
  });

  it('GET lista solo los devices de la propia instalación', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Listable',
        externalRef: `ext-${randomUUID()}`,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/devices`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const devices: Array<{ installationId: string }> = res.json().devices;
    expect(devices.length).toBeGreaterThan(0);
    expect(devices.every((d) => d.installationId === inst.id)).toBe(true);
  });

  it('GET lista de instalación ajena → 403', async () => {
    const inst = await createInstallation(other.organizationId);

    const res = await app.inject({
      method: 'GET',
      url: `/installations/${inst.id}/devices`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /devices/:id devuelve el device (200)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const created = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Detalle',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    const id = created.json().device.id;

    const res = await app.inject({
      method: 'GET',
      url: `/devices/${id}`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().device.id).toBe(id);
  });

  it('PATCH actualiza el device (200)', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const created = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Original',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    const id = created.json().device.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/devices/${id}`,
      headers: authHeader(owner.token),
      payload: { name: 'Renombrado', state: 'online' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().device.name).toBe('Renombrado');
    expect(res.json().device.state).toBe('online');
  });

  it('PATCH con payload vacío → 422', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createKit(inst.id);
    const created = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: authHeader(owner.token),
      payload: {
        installationId: inst.id,
        kitId: kit.id,
        name: 'Vacío',
        externalRef: `ext-${randomUUID()}`,
      },
    });
    const id = created.json().device.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/devices/${id}`,
      headers: authHeader(owner.token),
      payload: {},
    });
    expect(res.statusCode).toBe(422);
  });

  it('sin token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/devices', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});
