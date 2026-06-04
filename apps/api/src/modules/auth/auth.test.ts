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

  // -------------------------------------------------------------------------
  // Refresh-token rotation (Fase 7)
  // -------------------------------------------------------------------------

  function decodeJwtPayload(token: string): Record<string, unknown> {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
  }

  it('login entrega access (token) + refresh_token', async () => {
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
    expect(body.refresh_token).toBeTypeOf('string');
    expect(body.refresh_token.length).toBeGreaterThan(0);
  });

  it('register sigue devolviendo token + user + organization (+ refresh_token)', async () => {
    const payload = newRegisterPayload();
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.refresh_token).toBeTypeOf('string');
    expect(body.user).toMatchObject({ email: payload.email });
    expect(body.organization).toMatchObject({ name: payload.organizationName });
  });

  it('access token (payload) NO contiene passwordHash', async () => {
    const payload = newRegisterPayload();
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload });
    const { token } = res.json();

    const decoded = decodeJwtPayload(token);
    expect(decoded.sub).toBeTypeOf('string');
    expect(decoded.passwordHash).toBeUndefined();
    expect(decoded.password_hash).toBeUndefined();
  });

  it('POST /auth/refresh con refresh válido → nuevo access + nuevo refresh (distinto)', async () => {
    const payload = newRegisterPayload();
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload });
    const { token: oldAccess, refresh_token: oldRefresh } = reg.json();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token: oldRefresh },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.refresh_token).toBeTypeOf('string');
    expect(body.refresh_token).not.toBe(oldRefresh);
    // El nuevo access apunta al mismo sujeto.
    expect(decodeJwtPayload(body.token).sub).toBe(decodeJwtPayload(oldAccess).sub);
  });

  it('refresh reutilizado (el viejo tras rotar) → 401', async () => {
    const payload = newRegisterPayload();
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload });
    const { refresh_token: oldRefresh } = reg.json();

    // Primera rotación OK.
    const first = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token: oldRefresh },
    });
    expect(first.statusCode).toBe(200);

    // Reuso del refresh ya rotado → 401.
    const reuse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token: oldRefresh },
    });
    expect(reuse.statusCode).toBe(401);

    // Detección de reuso revoca todo el árbol: el nuevo refresh también queda inválido.
    const newRefresh = first.json().refresh_token;
    const afterReuse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token: newRefresh },
    });
    expect(afterReuse.statusCode).toBe(401);
  });

  it('refresh inválido → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token: `nope-${randomUUID()}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('logout con refresh lo revoca (refresh luego → 401)', async () => {
    const payload = newRegisterPayload();
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload });
    const { refresh_token } = reg.json();

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refresh_token },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.json()).toMatchObject({ ok: true });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token },
    });
    expect(res.statusCode).toBe(401);
  });
});
