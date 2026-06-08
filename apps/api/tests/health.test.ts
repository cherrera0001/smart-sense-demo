import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from './helpers/test-app.js';
import { assertDbReady } from './helpers/test-db.js';

let app: FastifyInstance;

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('health / readiness', () => {
  it('GET /health responde sin auth con metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('smartsense-api');
    expect(typeof body.version).toBe('string');
    expect(typeof body.uptime_s).toBe('number');
  });

  it('GET /readyz valida DB (SELECT 1) y no filtra secretos', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ready');
    expect(body.db).toBe('ok');
    // No debe filtrar connection strings ni credenciales.
    expect(res.body).not.toMatch(/postgresql:\/\//);
    expect(res.body).not.toMatch(/neon\.tech/);
  });
});
