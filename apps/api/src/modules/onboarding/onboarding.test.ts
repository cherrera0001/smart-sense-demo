import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;
let installationId: string;
let otherInstallationId: string;

/** Crea una installation directa (vía prisma) en la org indicada. */
async function createInstallation(organizationId: string): Promise<string> {
  const inst = await prisma.installation.create({
    data: { organizationId, name: `Inst ${randomUUID()}`, segment: 'home' },
    select: { id: true },
  });
  return inst.id;
}

/** Crea un energyKit unclaimed (qrCode/serial únicos). */
async function createUnclaimedKit(): Promise<{ id: string; qrCode: string }> {
  const qrCode = `QR-${randomUUID()}`;
  const kit = await prisma.energyKit.create({
    data: { qrCode, serial: `SN-${randomUUID()}`, status: 'unclaimed' },
    select: { id: true, qrCode: true },
  });
  return kit;
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
  installationId = await createInstallation(owner.organizationId);
  otherInstallationId = await createInstallation(other.organizationId);
});

afterAll(async () => {
  await app.close();
});

describe('onboarding', () => {
  it('scan de kit existente → 200 con campos no sensibles', async () => {
    const kit = await createUnclaimedKit();
    const res = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/scan',
      headers: authHeader(owner.token),
      payload: { qrCode: kit.qrCode },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.kit.id).toBe(kit.id);
    expect(body.kit.qrCode).toBe(kit.qrCode);
    expect(body.kit.status).toBe('unclaimed');
    expect(body.kit.installationId).toBeNull();
    // No expone campos sensibles.
    expect(body.kit.serial).toBeUndefined();
    expect(body.kit.firmwareVersion).toBeUndefined();
  });

  it('scan acepta `code` y lo normaliza a qrCode', async () => {
    const kit = await createUnclaimedKit();
    const res = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/scan',
      headers: authHeader(owner.token),
      payload: { code: kit.qrCode },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().kit.id).toBe(kit.id);
  });

  it('scan de kit inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/scan',
      headers: authHeader(owner.token),
      payload: { qrCode: `QR-NOPE-${randomUUID()}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
  });

  it('claim de kit → 200 y status active asociado a la installation', async () => {
    const kit = await createUnclaimedKit();
    const res = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/claim',
      headers: authHeader(owner.token),
      payload: { qrCode: kit.qrCode, installationId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.kit.status).toBe('active');
    expect(body.kit.installationId).toBe(installationId);

    const persisted = await prisma.energyKit.findUnique({ where: { id: kit.id } });
    expect(persisted?.status).toBe('active');
    expect(persisted?.claimedAt).not.toBeNull();
  });

  it('claim de kit ya active en OTRA installation → 409 KIT_ALREADY_CLAIMED', async () => {
    const kit = await createUnclaimedKit();
    // Lo reclama `other` en su propia installation.
    const first = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/claim',
      headers: authHeader(other.token),
      payload: { qrCode: kit.qrCode, installationId: otherInstallationId },
    });
    expect(first.statusCode).toBe(200);

    // `owner` da a `other` un rol manage sobre SU org para superar el assertInstallationAccess
    // y llegar al chequeo de conflicto del kit (no es cross-tenant lo que validamos aquí).
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: other.userId, organizationId: owner.organizationId } },
      create: { userId: other.userId, organizationId: owner.organizationId, role: 'admin', status: 'active' },
      update: { role: 'admin', status: 'active' },
    });

    const second = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/claim',
      headers: authHeader(other.token),
      payload: { qrCode: kit.qrCode, installationId },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().code).toBe('KIT_ALREADY_CLAIMED');
  });

  it('pair device → 200 y crea device_pairing paired + device', async () => {
    const kit = await createUnclaimedKit();
    await app.inject({
      method: 'POST',
      url: '/onboarding/kit/claim',
      headers: authHeader(owner.token),
      payload: { qrCode: kit.qrCode, installationId },
    });

    const externalRef = `dev-${randomUUID()}`;
    const res = await app.inject({
      method: 'POST',
      url: '/onboarding/devices/pair',
      headers: authHeader(owner.token),
      payload: {
        kitId: kit.id,
        devices: [{ externalRef, name: 'Heladera' }],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.pairings).toHaveLength(1);
    expect(body.pairings[0].status).toBe('paired');
    expect(body.pairings[0].deviceExternalRef).toBe(externalRef);
    expect(body.devices).toHaveLength(1);
    expect(body.devices[0].externalRef).toBe(externalRef);
    expect(body.devices[0].installationId).toBe(installationId);
    expect(body.devices[0].capabilities).toMatchObject({ meter: true });
  });

  it('onboarding status refleja el avance', async () => {
    const inst = await createInstallation(owner.organizationId);
    const kit = await createUnclaimedKit();

    // Antes de claim: sin kit.
    const before = await app.inject({
      method: 'GET',
      url: `/onboarding/status?installationId=${inst}`,
      headers: authHeader(owner.token),
    });
    expect(before.statusCode).toBe(200);
    expect(before.json().hasKit).toBe(false);
    expect(before.json().devicesPaired).toBe(0);
    expect(before.json().profileComplete).toBe(false);

    // Claim + pair.
    await app.inject({
      method: 'POST',
      url: '/onboarding/kit/claim',
      headers: authHeader(owner.token),
      payload: { qrCode: kit.qrCode, installationId: inst },
    });
    await app.inject({
      method: 'POST',
      url: '/onboarding/devices/pair',
      headers: authHeader(owner.token),
      payload: { kitId: kit.id, devices: [{ externalRef: `dev-${randomUUID()}` }] },
    });

    const after = await app.inject({
      method: 'GET',
      url: `/onboarding/status?installationId=${inst}`,
      headers: authHeader(owner.token),
    });
    expect(after.statusCode).toBe(200);
    const body = after.json();
    expect(body.hasKit).toBe(true);
    expect(body.kitStatus).toBe('active');
    expect(body.devicesPaired).toBe(1);
    expect(body.devicesCount).toBe(1);
  });

  it('sin token → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/onboarding/kit/scan',
      payload: { qrCode: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
  });
});
