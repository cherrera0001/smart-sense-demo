/**
 * Rutas de breakdown (desglose de consumo) — Fase 4.
 * Path completo 1:1 con openapi.yaml (sin prefix). Protegida por JWT.
 * Solo lectura: assertInstallationAccess(read) se aplica en el servicio.
 */
import type { FastifyInstance } from 'fastify';
import { breakdownParamSchema, breakdownQuerySchema } from './breakdown.schemas.js';
import { getBreakdown } from './breakdown.service.js';

export async function breakdownRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/installations/:installationId/breakdown',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = breakdownParamSchema.parse(req.params);
      const query = breakdownQuerySchema.parse(req.query);
      return getBreakdown(app.prisma, userId, installationId, query);
    },
  );
}
