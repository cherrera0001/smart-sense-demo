import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config/env.js';
import { loggerOptions } from './config/logger.js';
import { prismaPlugin } from './plugins/prisma.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { securityHeadersPlugin } from './plugins/security-headers.js';
import { corsPlugin } from './plugins/cors.js';
import { rateLimitPlugin, type RateLimitOptions } from './plugins/rate-limit.js';
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
import { alertsRoutes } from './modules/alerts/alerts.routes.js';
import { recommendationsRoutes } from './modules/recommendations/recommendations.routes.js';
import { controlRoutes } from './modules/control/control.routes.js';

export interface BuildAppOptions {
  logger?: boolean;
  /** Helmet + CORS. Default true. */
  security?: boolean;
  /** Rate limiting. Default = config.RATE_LIMIT_ENABLED (false en tests). */
  rateLimit?: boolean | RateLimitOptions;
}

/**
 * Construye la app Fastify. Plugins de seguridad (helmet/cors/rate-limit) + infra se
 * decoran/registran sobre la instancia raíz ANTES de las rutas. Módulos con paths completos.
 * Fase 7: logging redactado, security headers, CORS controlado, rate-limit en endpoints sensibles.
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const useLogger = opts.logger ?? true;
  const app = Fastify({ logger: useLogger ? loggerOptions : false });

  await errorHandlerPlugin(app);
  await requestIdPlugin(app);

  // Seguridad (antes de las rutas para que el hook de rate-limit las alcance).
  if (opts.security ?? true) {
    await securityHeadersPlugin(app);
    await corsPlugin(app);
  }
  const rl = opts.rateLimit ?? config.RATE_LIMIT_ENABLED;
  if (rl) {
    await rateLimitPlugin(app, typeof rl === 'object' ? rl : {});
  }

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
  await app.register(alertsRoutes);
  await app.register(recommendationsRoutes);
  await app.register(controlRoutes);

  return app;
}
