import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

async function createInstallation(
  user: TestUser,
  organizationId: string,
  overrides: Record<string, unknown> = {},
) {
  return app.inject({
    method: 'POST',
    url: '/installations',
    headers: authHeader(user.token),
    payload: {
      organizationId,
      name: `Inst ${randomUUID()}`,
      segment: 'home',
      ...overrides,
    },
  });
}

describe('installations', () => {
  it('crea una instalación bajo la org propia (201)', async () => {
    const res = await createInstallation(owner, owner.organizationId, {
      address: 'Calle Falsa 123',
      profile: { occupants: 4, declaredPowerKw: 5.5 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.installation.organizationId).toBe(owner.organizationId);
    expect(body.installation.segment).toBe('home');
    expect(body.installation.profile.occupants).toBe(4);
    expect(body.installation.profile.declaredPowerKw).toBe(5.5);
    expect(body.installation.profile.segment).toBe('home');
  });

  it('rechaza crear bajo org ajena (403)', async () => {
    const res = await createInstallation(owner, other.organizationId);
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('CROSS_TENANT_DENIED');
  });

  it('GET /installations lista solo las accesibles', async () => {
    await createInstallation(owner, owner.organizationId);
    await createInstallation(other, other.organizationId);

    const res = await app.inject({
      method: 'GET',
      url: '/installations',
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const ids: string[] = res.json().installations.map((i: { organizationId: string }) => i.organizationId);
    expect(ids.every((orgId) => orgId === owner.organizationId)).toBe(true);
    expect(ids).not.toContain(other.organizationId);
  });

  it('GET /installations/:id valida acceso cross-tenant (403)', async () => {
    const created = await createInstallation(other, other.organizationId);
    const id = created.json().installation.id;

    const res = await app.inject({
      method: 'GET',
      url: `/installations/${id}`,
      headers: authHeader(owner.token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('PATCH actualiza la instalación (owner, 200)', async () => {
    const created = await createInstallation(owner, owner.organizationId);
    const id = created.json().installation.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/installations/${id}`,
      headers: authHeader(owner.token),
      payload: { name: 'Renombrada', status: 'inactive' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().installation.name).toBe('Renombrada');
    expect(res.json().installation.status).toBe('inactive');
  });

  it('PATCH respeta RBAC: viewer no puede actualizar (403)', async () => {
    // El usuario `other` recibe una membership viewer en la org de `owner` (vía prisma directo).
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: other.userId, organizationId: owner.organizationId } },
      create: {
        userId: other.userId,
        organizationId: owner.organizationId,
        role: 'viewer',
        status: 'active',
      },
      update: { role: 'viewer', status: 'active' },
    });

    const created = await createInstallation(owner, owner.organizationId);
    const id = created.json().installation.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/installations/${id}`,
      headers: authHeader(other.token),
      payload: { name: 'Intento viewer' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('FORBIDDEN');
  });

  it('PATCH con payload vacío → 422', async () => {
    const created = await createInstallation(owner, owner.organizationId);
    const id = created.json().installation.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/installations/${id}`,
      headers: authHeader(owner.token),
      payload: {},
    });
    expect(res.statusCode).toBe(422);
  });

  it('sin token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/installations' });
    expect(res.statusCode).toBe(401);
  });
});
