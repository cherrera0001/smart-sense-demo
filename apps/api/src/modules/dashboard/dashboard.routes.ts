/**
 * Rutas del dashboard (Fase 4). Path completo 1:1 con openapi.yaml (sin prefix).
 * Protegida por JWT. Lectura: assertInstallationAccess(ROLES.read) en el servicio.
 */
import type { FastifyInstance } from 'fastify';
import { installationIdParamSchema } from './dashboard.schemas.js';
import { getDashboard } from './dashboard.service.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/installations/:installationId/dashboard',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParamSchema.parse(req.params);
      return getDashboard(app.prisma, userId, installationId);
    },
  );
}
