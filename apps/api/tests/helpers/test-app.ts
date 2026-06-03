import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

/** App de test (sin logger). Recordar `await app.close()` en afterAll. */
export async function makeTestApp(): Promise<FastifyInstance> {
  return buildApp({ logger: false });
}
