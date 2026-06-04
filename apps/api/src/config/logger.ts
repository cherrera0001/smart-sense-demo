/**
 * Configuración de logging (pino vía Fastify) con REDACCIÓN de secretos.
 * Nunca se loguea: Authorization, Cookie, password, tokens, connection strings.
 */
import type { FastifyServerOptions } from 'fastify';

export const loggerOptions: FastifyServerOptions['logger'] = {
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'req.body.refresh_token',
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'refreshToken',
      'refresh_token',
      'DATABASE_URL',
      'DIRECT_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'MQTT_PASSWORD',
      'SMARTSENSE_API_TOKEN',
    ],
    censor: '[REDACTED]',
  },
};
