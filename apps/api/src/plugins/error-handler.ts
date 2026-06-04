import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@smartsense/db';
import { AppError } from '../lib/errors.js';

/** Error handler uniforme → ErrorResponse { code, message, details?, traceId }. */
export async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((err, req, reply) => {
    const traceId = req.id;

    if (err instanceof AppError) {
      return reply
        .code(err.statusCode)
        .send({ code: err.code, message: err.message, details: err.details, traceId });
    }

    if (err instanceof ZodError) {
      return reply
        .code(422)
        .send({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: err.issues, traceId });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return reply.code(409).send({ code: 'CONFLICT', message: 'Recurso duplicado', traceId });
      }
      if (err.code === 'P2025') {
        return reply.code(404).send({ code: 'NOT_FOUND', message: 'Recurso no encontrado', traceId });
      }
    }

    // Rate limit (@fastify/rate-limit).
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429 || (err as { code?: string }).code === 'FST_ERR_RATE_LIMIT') {
      return reply
        .code(429)
        .send({ code: 'RATE_LIMITED', message: 'Demasiadas solicitudes, intenta más tarde', traceId });
    }

    // Errores de @fastify/jwt u otros con statusCode 401.
    if (status === 401) {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'No autenticado', traceId });
    }
    if (status && status >= 400 && status < 500) {
      const message = err instanceof Error ? err.message : 'Solicitud inválida';
      return reply.code(status).send({ code: 'BAD_REQUEST', message, traceId });
    }

    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ code: 'INTERNAL', message: 'Error interno', traceId });
  });
}
