import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

/**
 * Plugin de health-check.
 * Fase 1: contrato fijo. Endpoints de negocio = Fase 2.
 */
export const healthPlugin: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'smartsense-api',
      phase: '1',
    } as const;
  });
};

export default healthPlugin;
