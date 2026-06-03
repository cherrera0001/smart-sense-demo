import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { authHeader } from '../../../tests/helpers/auth-fixtures.js';
import { prisma, assertDbReady } from '../../../tests/helpers/test-db.js';

/**
 * Tests de Organizations. No dependen del módulo auth: siembran usuarios/orgs vía Prisma
 * y firman el JWT con app.signToken. Datos únicos por test (randomUUID) → aserciones
 * acotadas al tenant creado, sin truncado global.
 */

let app: FastifyInstance;

/** Crea un usuario con email único; devuelve id + token firmado. */
async function makeUser(): Promise<{ userId: string; token: string }> {
  const user = await prisma.user.create({
    data: {
      email: `org-test-${randomUUID()}@test.local`,
      passwordHash: 'x'.repeat(60),
      fullName: 'Org Tester',
    },
    select: { id: true },
  });
  return { userId: user.id, token: app.signToken(user.id) };
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
});

// Sin truncado/borrado global (ver tests/helpers/test-db.ts): el aislamiento se logra con
// datos únicos por test. No se borran usuarios: crear org escribe en audit_logs (append-only,
// FK Restrict sobre user) y eliminarlos violaría la integridad referencial.
afterAll(async () => {
  await app.close();
});

describe('Organizations', () => {
  it('GET /organizations lista solo las orgs del usuario (aislamiento por tenant)', async () => {
    const a = await makeUser();
    const b = await makeUser();

    const nameA = `Org A ${randomUUID()}`;
    const nameB = `Org B ${randomUUID()}`;

    const resA = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: authHeader(a.token),
      payload: { name: nameA },
    });
    const resB = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: authHeader(b.token),
      payload: { name: nameB },
    });
    expect(resA.statusCode).toBe(201);
    expect(resB.statusCode).toBe(201);
    const orgA = resA.json().organization as { id: string };
    const orgB = resB.json().organization as { id: string };

    const listA = await app.inject({
      method: 'GET',
      url: '/organizations',
      headers: authHeader(a.token),
    });
    expect(listA.statusCode).toBe(200);
    const idsA = (listA.json().organizations as Array<{ id: string }>).map((o) => o.id);
    expect(idsA).toContain(orgA.id);
    expect(idsA).not.toContain(orgB.id);
  });

  it('POST /organizations crea membership owner: el creador la ve en su lista', async () => {
    const u = await makeUser();
    const name = `Org Owner ${randomUUID()}`;

    const res = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: authHeader(u.token),
      payload: { name, legalId: `76${Math.floor(Math.random() * 1e7)}-K`, segmentDefault: 'smb' },
    });
    expect(res.statusCode).toBe(201);
    const org = res.json().organization as { id: string; name: string };
    expect(org.name).toBe(name);

    // Membership owner active persistida.
    const ms = await prisma.membership.findFirst({
      where: { userId: u.userId, organizationId: org.id },
      select: { role: true, status: true },
    });
    expect(ms).toMatchObject({ role: 'owner', status: 'active' });

    const list = await app.inject({
      method: 'GET',
      url: '/organizations',
      headers: authHeader(u.token),
    });
    const item = (list.json().organizations as Array<{ id: string; role: string }>).find(
      (o) => o.id === org.id,
    );
    expect(item).toBeDefined();
    expect(item?.role).toBe('owner');
  });

  it('GET /organizations/:id de otro tenant → 403 CROSS_TENANT_DENIED', async () => {
    const owner = await makeUser();
    const intruder = await makeUser();

    const res = await app.inject({
      method: 'POST',
      url: '/organizations',
      headers: authHeader(owner.token),
      payload: { name: `Org X ${randomUUID()}` },
    });
    const org = res.json().organization as { id: string };

    // El dueño la lee correctamente.
    const ok = await app.inject({
      method: 'GET',
      url: `/organizations/${org.id}`,
      headers: authHeader(owner.token),
    });
    expect(ok.statusCode).toBe(200);
    expect((ok.json().organization as { id: string }).id).toBe(org.id);

    // El intruso (otro tenant) recibe 403 sin filtrar existencia.
    const denied = await app.inject({
      method: 'GET',
      url: `/organizations/${org.id}`,
      headers: authHeader(intruder.token),
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().code).toBe('CROSS_TENANT_DENIED');
  });

  it('sin token → 401', async () => {
    const list = await app.inject({ method: 'GET', url: '/organizations' });
    expect(list.statusCode).toBe(401);

    const get = await app.inject({ method: 'GET', url: `/organizations/${randomUUID()}` });
    expect(get.statusCode).toBe(401);

    const post = await app.inject({
      method: 'POST',
      url: '/organizations',
      payload: { name: 'x' },
    });
    expect(post.statusCode).toBe(401);
  });
});
