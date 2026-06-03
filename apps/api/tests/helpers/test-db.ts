import { prisma } from '@smartsense/db';

/**
 * Tests de integración de la API corren contra la DB real (Neon dev) usada en Fase 1.4.
 * Requisito: DATABASE_URL definido en el entorno (cargar packages/db/.env antes de vitest).
 * No hay truncado global: el aislamiento se logra con datos únicos por test (randomUUID),
 * y las aserciones se acotan al usuario/tenant creado en el propio test.
 */
export { prisma };

/** Verifica conectividad antes de la suite; falla ruidoso si no hay DB (no skip silencioso). */
export async function assertDbReady(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no definido. Carga packages/db/.env (Neon dev) antes de los tests de API.',
    );
  }
  await prisma.$queryRawUnsafe('SELECT 1');
}
