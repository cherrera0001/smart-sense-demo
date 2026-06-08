import type { FastifyInstance } from 'fastify';

/** Propaga el request id (Fastify lo autogenera) al header de respuesta para trazabilidad. */
export async function requestIdPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });
}
