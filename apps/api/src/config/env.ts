/**
 * Configuración de entorno. Nunca imprime secretos.
 * En producción rechaza JWT_SECRET inseguro/corto.
 */
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

const INSECURE_SECRETS = new Set(['', 'dev_only_change_me', 'change_me', 'secret', 'changeme']);

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (isProd) {
    if (!fromEnv || fromEnv.length < 32 || INSECURE_SECRETS.has(fromEnv)) {
      throw new Error('JWT_SECRET inseguro o ausente en producción (mínimo 32 chars, no valor por defecto).');
    }
    return fromEnv;
  }
  // Desarrollo/test: permitir un secreto dev explícito.
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'dev_only_change_me';
}

export const config = {
  NODE_ENV,
  isProd,
  PORT: Number(process.env.API_PORT ?? process.env.PORT ?? 3001),
  HOST: process.env.HOST ?? '0.0.0.0',
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
} as const;
