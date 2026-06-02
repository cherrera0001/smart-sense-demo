/**
 * Configuración de la API cargada desde variables de entorno con defaults seguros.
 * Fase 1: solo lo necesario para arrancar el servidor de /health. Sin secretos hardcodeados.
 */

export type NodeEnv = 'development' | 'production' | 'test';

export interface ApiConfig {
  readonly PORT: number;
  readonly HOST: string;
  readonly NODE_ENV: NodeEnv;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`PORT inválido: "${value}"`);
  }
  return parsed;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

export const config: ApiConfig = {
  PORT: parsePort(process.env.PORT, 3001),
  HOST: process.env.HOST ?? '0.0.0.0',
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
};
