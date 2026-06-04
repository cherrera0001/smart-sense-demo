import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from './config/env.js';

const startedAt = Date.now();

/**
 * Health/readiness. `/health` y `/healthz` son liveness (sin auth, sin DB).
 * `/readyz` valida conectividad DB (`SELECT 1`). Ninguno expone secretos ni connection string.
 */
export const healthPlugin: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  const liveness = () => ({
    status: 'ok' as const,
    service: 'smartsense-api',
    version: config.SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
  });

  app.get('/health', async () => liveness());
  app.get('/healthz', async () => liveness());

  app.get('/readyz', async (_req, reply) => {
    try {
      await app.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ready', db: 'ok', timestamp: new Date().toISOString() };
    } catch {
      return reply
        .code(503)
        .send({ status: 'degraded', db: 'fail', timestamp: new Date().toISOString() });
    }
  });
};

export default healthPlugin;
