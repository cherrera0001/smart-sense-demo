/**
 * Rutas del módulo recommendations (Fase 5). Path completo 1:1 con openapi.yaml (sin prefix).
 * Protegida por JWT. Lectura: assertInstallationAccess(ROLES.read) en el servicio.
 *
 * Solo expone listado en Fase 5 (GET). La generación de recomendaciones (`generateForAlert`)
 * es interna y se invoca desde el flujo de evaluación de alertas, no por endpoint.
 */
import type { FastifyInstance } from 'fastify';
import { installationIdParam, recommendationsQuery } from './recommendations.schemas.js';
import { listRecommendations } from './recommendations.service.js';

export async function recommendationsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/installations/:installationId/recommendations',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParam.parse(req.params);
      const query = recommendationsQuery.parse(req.query);
      return listRecommendations(app.prisma, userId, installationId, query);
    },
  );
}
