import Fastify, { type FastifyInstance } from 'fastify';
import { prismaPlugin } from './plugins/prisma.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { authPlugin } from './plugins/auth.js';
import { healthPlugin } from './health.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { organizationsRoutes } from './modules/organizations/organizations.routes.js';
import { installationsRoutes } from './modules/installations/installations.routes.js';
import { devicesRoutes } from './modules/devices/devices.routes.js';
import { onboardingRoutes } from './modules/onboarding/onboarding.routes.js';
import { telemetryRoutes } from './modules/telemetry/telemetry.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { breakdownRoutes } from './modules/breakdown/breakdown.routes.js';

export interface BuildAppOptions {
  logger?: boolean;
}

/**
 * Construye la app Fastify de Fase 2. Plugins de seguridad/infra se decoran sobre la
 * instancia raíz (visibles por los módulos); los módulos definen rutas con paths completos
 * (1:1 con specs/04-api/openapi.yaml). Solo módulos de Fase 2 (auth/orgs/installations/
 * devices/onboarding). NO se registran telemetry/dashboard/reports/alerts/control (Fase 3+).
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  await errorHandlerPlugin(app);
  await requestIdPlugin(app);
  await prismaPlugin(app);
  await authPlugin(app);

  await app.register(healthPlugin);
  await app.register(authRoutes);
  await app.register(organizationsRoutes);
  await app.register(installationsRoutes);
  await app.register(devicesRoutes);
  await app.register(onboardingRoutes);
  await app.register(telemetryRoutes);
  await app.register(dashboardRoutes);
  await app.register(reportsRoutes);
  await app.register(breakdownRoutes);

  return app;
}
