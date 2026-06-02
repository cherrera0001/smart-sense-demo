import { PrismaClient } from '@prisma/client';

/**
 * Singleton de PrismaClient.
 *
 * En desarrollo, el hot-reload de Node/Next puede reinstanciar módulos y crear múltiples
 * conexiones; cacheamos la instancia en `globalThis` para evitar agotar el pool. En
 * producción se crea una única instancia por proceso.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
