import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady } from '../../../tests/helpers/test-db.js';

describe('auth module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await assertDbReady();
    app = await makeTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function newRegisterPayload() {
    return {
      email: `t-${randomUUID()}@test.local`,
      password: 'Passw0rd!23',
      fullName: 'Tester',
      organizationName: `Org ${randomUUID()}`,
    };
  }

  it('register OK → 201 con token, sin passwordHash', async () => {
    const payload = newRegisterPayload();
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.user).toMatchObject({
      email: payload.email,
      fullName: payload.fullName,
      locale: 'es-CL',
    });
    expect(body.user.id).toBeTypeOf('string');
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.organization).toMatchObject({ name: payload.organizationName });
    expect(body.organization.id).toBeTypeOf('string');
  });

  it('email duplicado → 409 EMAIL_TAKEN', async () => {
    const payload = newRegisterPayload();
    const first = await app.inject({ method: 'POST', url: '/auth/register', payload });
    expect(first.statusCode).toBe(201);

    const dup = await app.inject({ method: 'POST', url: '/auth/register', payload });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().code).toBe('EMAIL_TAKEN');
  });

  it('login OK → 200 con token y user saneado', async () => {
    const payload = newRegisterPayload();
    await app.inject({ method: 'POST', url: '/auth/register', payload });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: payload.email, password: payload.password },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.user.email).toBe(payload.email);
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('login password incorrecta → 401 genérico', async () => {
    const payload = newRegisterPayload();
    await app.inject({ method: 'POST', url: '/auth/register', payload });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: payload.email, password: 'wrong-password' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('INVALID_CREDENTIALS');
  });

  it('/auth/me sin token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('/auth/me con token → user + memberships', async () => {
    const user = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: authHeader(user.token),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.id).toBe(user.userId);
    expect(body.user.email).toBe(user.email);
    expect(body.user.passwordHash).toBeUndefined();
    expect(Array.isArray(body.memberships)).toBe(true);
    const owner = body.memberships.find(
      (m: { organizationId: string }) => m.organizationId === user.organizationId,
    );
    expect(owner).toBeDefined();
    expect(owner.role).toBe('owner');
    expect(owner.organization).toMatchObject({ id: user.organizationId });
  });
});
