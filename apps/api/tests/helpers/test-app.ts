import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildAppOptions } from '../../src/app.js';

/**
 * App de test (sin logger, sin rate-limit por defecto). Recordar `await app.close()`.
 * Para tests de seguridad de rate-limit, pasar `{ rateLimit: { strictMax, globalMax } }`.
 */
export async function makeTestApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  return buildApp({ logger: false, rateLimit: false, ...opts });
}
