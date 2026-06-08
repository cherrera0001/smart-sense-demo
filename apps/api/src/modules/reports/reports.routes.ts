/**
 * Rutas de reports (Fase 4). Series temporales agregadas por periodo.
 * Paths completos 1:1 con openapi.yaml (sin prefix). Todas protegidas por JWT.
 * El acceso a la instalación se valida en el service (assertInstallationAccess read).
 */
import type { FastifyInstance } from 'fastify';
import { installationIdParamSchema, reportsQuerySchema } from './reports.schemas.js';
import { getReport } from './reports.service.js';
import type { ReportPeriod } from './reports.schemas.js';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  const handler = (period: ReportPeriod) =>
    async (req: import('fastify').FastifyRequest) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParamSchema.parse(req.params);
      const { date } = reportsQuerySchema.parse(req.query);
      return getReport(app.prisma, userId, installationId, period, date);
    };

  app.get(
    '/installations/:installationId/reports/daily',
    { preHandler: [app.authenticate] },
    handler('daily'),
  );

  app.get(
    '/installations/:installationId/reports/weekly',
    { preHandler: [app.authenticate] },
    handler('weekly'),
  );

  app.get(
    '/installations/:installationId/reports/monthly',
    { preHandler: [app.authenticate] },
    handler('monthly'),
  );

  app.get(
    '/installations/:installationId/reports/last-three-months',
    { preHandler: [app.authenticate] },
    handler('last_three_months'),
  );
}
