/**
 * Setup compartido para tests de integración con Postgres efímero (Testcontainers).
 *
 * REQUISITOS: Docker en ejecución. Si Docker NO está disponible (este entorno puede no
 * tenerlo), `hasDocker()` devuelve false y los tests usan `describe.skip` con mensaje claro.
 * Los archivos de test COMPILAN igualmente (typecheck) aunque se skippeen.
 *
 * Imagen: `timescale/timescaledb:latest-pg16` (incluye TimescaleDB para create_hypertable).
 * Fallback documentado: `postgres:16` — la migración tolera la ausencia de TimescaleDB
 * (la conversión a hypertable está envuelta en DO/EXCEPTION), por lo que los tests de
 * integridad/constraints funcionan en ambas imágenes.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MIGRATION_SQL_PATH = join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '0001_init',
  'migration.sql',
);

export const TIMESCALE_IMAGE = 'timescale/timescaledb:latest-pg16';
// Fallback documentado si no se desea/puede usar TimescaleDB: 'postgres:16'.
export const FALLBACK_IMAGE = 'postgres:16';

/** Detecta si Docker está disponible para Testcontainers. */
export function hasDocker(): boolean {
  if (process.env.SMARTSENSE_SKIP_DOCKER === '1') return false;
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export interface TestDb {
  container: StartedPostgreSqlContainer;
  prisma: PrismaClient;
  url: string;
}

/** Levanta Postgres+Timescale, aplica la migración SQL y devuelve un PrismaClient conectado. */
export async function startTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer(TIMESCALE_IMAGE)
    .withDatabase('smartsense_test')
    .withUsername('smartsense')
    .withPassword('smartsense')
    .start();

  const url = container.getConnectionUri();

  // Aplica la migración SQL completa de corrido vía psql dentro del contenedor.
  // Se usa psql (no prisma.$executeRawUnsafe) porque el script contiene bloques
  // dollar-quoted (DO $$ ... $$ / funciones plpgsql) y múltiples statements, que el
  // protocolo simple de un solo statement de Prisma no ejecuta correctamente.
  const sql = readFileSync(MIGRATION_SQL_PATH, 'utf8');
  const exec = await container.exec([
    'psql',
    '-v', 'ON_ERROR_STOP=1',
    '-U', container.getUsername(),
    '-d', container.getDatabase(),
    '-c', sql,
  ]);
  if (exec.exitCode !== 0) {
    throw new Error(`Fallo al aplicar la migración SQL (exit ${exec.exitCode}):\n${exec.output}`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });

  return { container, prisma, url };
}

export async function stopTestDb(db: TestDb | undefined): Promise<void> {
  if (!db) return;
  await db.prisma.$disconnect();
  await db.container.stop();
}
