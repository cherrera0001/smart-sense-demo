import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export interface RateLimitOptions {
  /** Límite global por minuto (rutas estándar). */
  globalMax?: number;
  /** Límite estricto por minuto para auth login/register y control-actions POST. */
  strictMax?: number;
}

/**
 * Rate limiting. Global por defecto + límite estricto en endpoints sensibles
 * (auth/login, auth/register, POST control-actions) vía hook onRoute.
 * DEBE registrarse ANTES de las rutas de módulos para que el hook las alcance.
 */
export async function rateLimitPlugin(app: FastifyInstance, opts: RateLimitOptions = {}): Promise<void> {
  const globalMax = opts.globalMax ?? 300;
  const strictMax = opts.strictMax ?? 10;

  // El hook se registra ANTES que @fastify/rate-limit para que su config por-ruta
  // (rateLimit estricto en auth/login|register y POST control-actions) ya esté presente
  // cuando el plugin lea routeOptions.config en su propio onRoute.
  app.addHook('onRoute', (routeOptions) => {
    const url = routeOptions.url ?? '';
    const method = String(routeOptions.method ?? '');
    const isAuthSensitive = /\/auth\/(login|register)$/.test(url);
    const isControlAction = method.includes('POST') && /\/control-actions$/.test(url);
    if (isAuthSensitive || isControlAction) {
      routeOptions.config = {
        ...(routeOptions.config ?? {}),
        rateLimit: { max: strictMax, timeWindow: '1 minute' },
      };
    }
  });

  await app.register(rateLimit, {
    global: true,
    max: globalMax,
    timeWindow: '1 minute',
  });
}
