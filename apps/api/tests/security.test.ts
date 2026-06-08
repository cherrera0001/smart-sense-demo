import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { makeTestApp } from './helpers/test-app.js';
import { loadConfig } from '../src/config/env.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await makeTestApp();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('seguridad — headers (Helmet)', () => {
  it('/health expone cabeceras de seguridad', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('seguridad — CORS', () => {
  it('origen permitido recibe Access-Control-Allow-Origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('origen NO permitido no recibe ACAO', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://evil.example.com' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('seguridad — rate limit en endpoints sensibles', () => {
  it('POST /auth/login devuelve 429 tras superar el límite estricto', async () => {
    const limited = await makeTestApp({ rateLimit: { strictMax: 2, globalMax: 1000 } });
    await limited.ready();
    try {
      const codes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await limited.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { email: `nope-${randomUUID()}@test.local`, password: 'x'.repeat(10) },
        });
        codes.push(r.statusCode);
      }
      expect(codes).toContain(429);
    } finally {
      await limited.close();
    }
  });
});

describe('seguridad — validación de entorno en producción (loadConfig puro)', () => {
  it('rechaza JWT_SECRET débil en producción', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: 'a'.repeat(40),
        CORS_ORIGIN: 'https://app.smartsense.cl',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rechaza CORS wildcard en producción', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'b'.repeat(40),
        JWT_REFRESH_SECRET: 'c'.repeat(40),
        CORS_ORIGIN: '*',
      }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('acepta secretos fuertes + CORS válido en producción', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'd'.repeat(40),
        JWT_REFRESH_SECRET: 'e'.repeat(40),
        CORS_ORIGIN: 'https://app.smartsense.cl',
      }),
    ).not.toThrow();
  });
});
