import type { FastifyInstance } from 'fastify';
import { prisma, type PrismaClient } from '@smartsense/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/** Decora la app con el singleton Prisma. Llamar sobre la instancia raíz (no encapsulado). */
export async function prismaPlugin(app: FastifyInstance): Promise<void> {
  if (!app.hasDecorator('prisma')) {
    app.decorate('prisma', prisma);
  }
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}
