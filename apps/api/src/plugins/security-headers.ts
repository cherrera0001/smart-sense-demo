import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';

/** Cabeceras de seguridad (Helmet). CSP desactivado: la API sirve JSON, no HTML. */
export async function securityHeadersPlugin(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
}
