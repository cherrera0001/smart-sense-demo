import type { FastifyInstance } from 'fastify';
import { Prisma } from '@smartsense/db';
import {
  createInstallationSchema,
  idParamSchema,
  patchInstallationSchema,
} from './installations.schemas.js';
import {
  createInstallation,
  getInstallation,
  listInstallations,
  updateInstallation,
} from './installations.service.js';

/** Normaliza un installation_profile (Decimal → number) para la respuesta JSON. */
function sanitizeProfile(profile: unknown) {
  if (!profile) return null;
  const p = profile as Record<string, unknown>;
  const declared = p.declaredPowerKw;
  return {
    ...p,
    declaredPowerKw:
      declared instanceof Prisma.Decimal ? Number(declared) : (declared ?? null),
  };
}

/** Saneo de la instalación para la respuesta (serializa el perfil 1:1 si está presente). */
function sanitizeInstallation(installation: Record<string, unknown> | null) {
  if (!installation) return null;
  if ('profile' in installation) {
    return { ...installation, profile: sanitizeProfile(installation.profile) };
  }
  return installation;
}

export async function installationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/installations', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const installations = await listInstallations(app.prisma, userId);
    return { installations: installations.map((i) => sanitizeInstallation(i)) };
  });

  app.post('/installations', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const dto = createInstallationSchema.parse(req.body);
    const installation = await createInstallation(app.prisma, userId, dto);
    return reply.code(201).send({ installation: sanitizeInstallation(installation) });
  });

  app.get('/installations/:id', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const { id } = idParamSchema.parse(req.params);
    const installation = await getInstallation(app.prisma, userId, id);
    return { installation: sanitizeInstallation(installation) };
  });

  app.patch('/installations/:id', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const { id } = idParamSchema.parse(req.params);
    const dto = patchInstallationSchema.parse(req.body);
    const installation = await updateInstallation(app.prisma, userId, id, dto);
    return { installation: sanitizeInstallation(installation) };
  });
}
