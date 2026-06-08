/**
 * Rutas de telemetría (Fase 3 IoT). Paths completos 1:1 con openapi.yaml (sin prefix).
 * Todas protegidas por JWT. La ingesta devuelve 200 tanto en accepted como en duplicate.
 */
import type { FastifyInstance } from 'fastify';
import {
  installationIdParamSchema,
  telemetryIngestSchema,
  telemetryRangeQuerySchema,
} from './telemetry.schemas.js';
import { getLatest, getRange, ingestTelemetry } from './telemetry.service.js';

export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  app.post('/iot/telemetry', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const dto = telemetryIngestSchema.parse(req.body);
    // 200 en accepted y duplicate (contrato OpenAPI: idempotencia no es error).
    return ingestTelemetry(app.prisma, userId, dto);
  });

  app.get(
    '/installations/:installationId/telemetry/latest',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParamSchema.parse(req.params);
      return getLatest(app.prisma, userId, installationId);
    },
  );

  app.get(
    '/installations/:installationId/telemetry/range',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParamSchema.parse(req.params);
      const query = telemetryRangeQuerySchema.parse(req.query);
      return getRange(app.prisma, userId, installationId, query);
    },
  );
}
