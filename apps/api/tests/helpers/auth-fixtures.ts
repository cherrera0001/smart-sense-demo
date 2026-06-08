import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

export interface TestUser {
  token: string;
  userId: string;
  email: string;
  organizationId: string;
}

export function authHeader(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/**
 * Registra un usuario único (con su organización owner) vía POST /auth/register.
 * Contrato de respuesta esperado: { token, user: { id, email }, organization: { id } }.
 */
export async function registerTestUser(
  app: FastifyInstance,
  opts: { orgName?: string } = {},
): Promise<TestUser> {
  const email = `t-${randomUUID()}@test.local`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email,
      password: 'Passw0rd!23',
      fullName: 'Tester',
      organizationName: opts.orgName ?? `Org ${randomUUID()}`,
    },
  });
  if (res.statusCode !== 201 && res.statusCode !== 200) {
    throw new Error(`register failed (${res.statusCode}): ${res.body}`);
  }
  const body = res.json() as {
    token: string;
    user: { id: string; email: string };
    organization: { id: string };
  };
  return {
    token: body.token,
    userId: body.user.id,
    email: body.user.email,
    organizationId: body.organization.id,
  };
}
