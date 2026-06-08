/**
 * @smartsense/db — punto de entrada del paquete.
 * Re-exporta el cliente Prisma singleton y todos los tipos/enums generados.
 */
export { prisma, default } from './client.js';

// Re-export de tipos y enums generados por Prisma Client (modelos, enums, inputs, etc.).
export * from '@prisma/client';
export { Prisma, PrismaClient } from '@prisma/client';
