import type { FastifyInstance } from 'fastify';
import { Errors } from '../../lib/errors.js';
import { createOrgSchema, idParamSchema } from './organizations.schemas.js';
import {
  listOrganizations,
  createOrganization,
  getOrganization,
} from './organizations.service.js';

/** Rutas de Organizations (1:1 con openapi.yaml). Todas exigen JWT. */
export async function organizationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/organizations', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const organizations = await listOrganizations(app.prisma, userId);
    return { organizations };
  });

  app.post('/organizations', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const dto = createOrgSchema.parse(req.body);
    const organization = await createOrganization(app.prisma, userId, dto);
    return reply.code(201).send({ organization });
  });

  app.get('/organizations/:id', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const { id } = idParamSchema.parse(req.params);
    const organization = await getOrganization(app.prisma, userId, id);
    if (!organization) throw Errors.notFound('Organización');
    return { organization };
  });
}
