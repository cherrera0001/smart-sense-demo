/**
 * Rutas del módulo alerts (Fase 5). Paths completos 1:1 con openapi.yaml (sin prefix).
 * Protegidas por JWT. RBAC se aplica en el servicio (read para listar; operate para review).
 */
import type { FastifyInstance } from 'fastify';
import {
  alertIdParam,
  alertsQuery,
  installationIdParam,
  reviewAlertRequest,
} from './alerts.schemas.js';
import { listAlerts, reviewAlert } from './alerts.service.js';

export async function alertsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/installations/:installationId/alerts',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParam.parse(req.params);
      const query = alertsQuery.parse(req.query);
      return listAlerts(app.prisma, userId, installationId, query);
    },
  );

  app.patch(
    '/alerts/:id/review',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { id } = alertIdParam.parse(req.params);
      const dto = reviewAlertRequest.parse(req.body);
      return reviewAlert(app.prisma, userId, id, dto, req.ip);
    },
  );
}
