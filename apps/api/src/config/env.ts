/**
 * Configuración de entorno. Nunca imprime secretos.
 * En producción rechaza JWT_SECRET/JWT_REFRESH_SECRET inseguros y CORS wildcard.
 * `loadConfig` es puro/testeable; `config` es la instancia del proceso.
 */
const INSECURE_SECRETS = new Set(['', 'dev_only_change_me', 'change_me', 'secret', 'changeme']);

export function loadConfig(env: NodeJS.ProcessEnv) {
  const NODE_ENV = env.NODE_ENV ?? 'development';
  const isProd = NODE_ENV === 'production';
  const isTest = NODE_ENV === 'test' || env.VITEST === 'true';

  const resolveSecret = (name: string, fallbackDev: string): string => {
    const fromEnv = env[name];
    if (isProd) {
      if (!fromEnv || fromEnv.length < 32 || INSECURE_SECRETS.has(fromEnv)) {
        throw new Error(`${name} inseguro o ausente en producción (mínimo 32 chars, no valor por defecto).`);
      }
      return fromEnv;
    }
    return fromEnv && fromEnv.length > 0 ? fromEnv : fallbackDev;
  };

  const resolveCorsOrigin = (): string[] => {
    const raw = env.CORS_ORIGIN;
    if (isProd && (!raw || raw.trim() === '*' || raw.trim() === '')) {
      throw new Error('CORS_ORIGIN no puede ser wildcard/vacío en producción.');
    }
    return (raw ?? 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);
  };

  return {
    NODE_ENV,
    isProd,
    isTest,
    PORT: Number(env.API_PORT ?? env.PORT ?? 3001),
    HOST: env.HOST ?? '0.0.0.0',
    JWT_SECRET: resolveSecret('JWT_SECRET', 'dev_only_change_me'),
    JWT_REFRESH_SECRET: resolveSecret('JWT_REFRESH_SECRET', 'dev_only_change_me_refresh'),
    JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    CORS_ORIGINS: resolveCorsOrigin(),
    RATE_LIMIT_ENABLED:
      (env.RATE_LIMIT_ENABLED ?? (isTest ? 'false' : 'true')).toLowerCase() !== 'false',
    SERVICE_VERSION: env.SERVICE_VERSION ?? '0.7.0',
  };
}

export const config = loadConfig(process.env);
