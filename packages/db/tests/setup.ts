/**
 * Setup compartido para tests de integración. Soporta DOS modos:
 *
 *  - Modo A (docker): Testcontainers levanta Postgres+TimescaleDB efímero y aplica la
 *    migración SQL. Se usa si Docker está disponible (o SMARTSENSE_DB_TEST_MODE=docker).
 *  - Modo B (external): conecta a una DATABASE_URL externa de desarrollo ya migrada.
 *    Se activa con SMARTSENSE_DB_TEST_MODE=external (o auto si hay DATABASE_URL y no Docker).
 *
 * Estados (NO hay skip silencioso):
 *  - DB disponible (docker|external) → los tests CORREN (PASS/FAIL reales).
 *  - 'none' → los tests se marcan BLOCKED con mensaje explícito (no PASS).
 *
 * Seguridad (modo external): se RECHAZA cualquier DATABASE_URL que parezca de producción.
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

export type TestDbMode = 'docker' | 'external' | 'none';

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

/**
 * Resuelve el modo de test DB:
 *  - SMARTSENSE_DB_TEST_MODE=external → 'external' (requiere DATABASE_URL).
 *  - SMARTSENSE_DB_TEST_MODE=docker   → 'docker' si hay Docker, si no 'none'.
 *  - auto (sin var): Docker si disponible; si no, 'external' si hay DATABASE_URL; si no 'none'.
 */
export function resolveTestDbMode(): TestDbMode {
  const forced = (process.env.SMARTSENSE_DB_TEST_MODE ?? '').toLowerCase();
  if (forced === 'external') return 'external';
  if (forced === 'docker') return hasDocker() ? 'docker' : 'none';
  if (hasDocker()) return 'docker';
  if (process.env.DATABASE_URL) return 'external';
  return 'none';
}

export function testDbAvailable(): boolean {
  return resolveTestDbMode() !== 'none';
}

/** Mensaje único para el estado BLOCKED (sin DB disponible). */
export const BLOCKED_MESSAGE =
  'BLOCKED: no hay DB de test disponible. Habilita Docker (Testcontainers) o define ' +
  'DATABASE_URL + SMARTSENSE_DB_TEST_MODE=external apuntando a una Postgres de desarrollo. ' +
  'Ver docs/database/phase-1-external-postgres-verification.md.';

// Tokens que delatan una DB de producción → se rechaza por seguridad.
const PROD_TOKENS = ['prod', 'production', 'live', 'primary', 'master', 'main'];
// Señales aceptadas de entorno no productivo.
const DEV_TOKENS = ['dev', 'test', 'staging', 'sandbox', 'smartsense_dev'];

/** Enmascara credenciales para logs (nunca imprimir la URL completa). */
export function maskDbUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//***@${u.host}${u.pathname}`;
  } catch {
    return '***';
  }
}

/**
 * Valida que una DATABASE_URL externa NO sea de producción.
 * Lanza si parece prod o si no presenta señales dev/test (salvo SMARTSENSE_DB_ALLOW_UNSAFE=1).
 */
export function assertSafeExternalUrl(url: string): void {
  const lower = url.toLowerCase();
  const hit = PROD_TOKENS.find((t) => lower.includes(t));
  if (hit) {
    throw new Error(
      `DATABASE_URL parece de PRODUCCIÓN (token prohibido: "${hit}"). Abortado por seguridad. ` +
        `Usa una base de desarrollo (${maskDbUrl(url)}).`,
    );
  }
  if (process.env.SMARTSENSE_DB_ALLOW_UNSAFE === '1') return;
  const safe = DEV_TOKENS.some((t) => lower.includes(t));
  if (!safe) {
    throw new Error(
      'DATABASE_URL no contiene señales dev/test (dev|test|staging|sandbox|smartsense_dev). ' +
        'Abortado por seguridad. Renombra la DB de desarrollo o exporta SMARTSENSE_DB_ALLOW_UNSAFE=1 ' +
        `para confirmar manualmente (${maskDbUrl(url)}).`,
    );
  }
}

export interface TestDb {
  container: StartedPostgreSqlContainer | null;
  prisma: PrismaClient;
  url: string;
  mode: TestDbMode;
}

/** Modo A — Testcontainers: levanta Postgres+Timescale y aplica la migración SQL. */
async function startDockerDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer(TIMESCALE_IMAGE)
    .withDatabase('smartsense_test')
    .withUsername('smartsense')
    .withPassword('smartsense')
    .start();

  const url = container.getConnectionUri();

  // Aplica la migración SQL completa de corrido vía psql dentro del contenedor.
  // Se usa psql (no prisma.$executeRawUnsafe) porque el script contiene bloques
  // dollar-quoted (DO $$ ... $$ / funciones plpgsql) y múltiples statements.
  const sql = readFileSync(MIGRATION_SQL_PATH, 'utf8');
  const exec = await container.exec([
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    container.getUsername(),
    '-d',
    container.getDatabase(),
    '-c',
    sql,
  ]);
  if (exec.exitCode !== 0) {
    throw new Error(`Fallo al aplicar la migración SQL (exit ${exec.exitCode}):\n${exec.output}`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  return { container, prisma, url, mode: 'docker' };
}

/**
 * Modo B — External: conecta a DATABASE_URL (dev/test). Asume que la migración ya fue
 * aplicada por `pnpm db:migrate` (parte de `verify:phase1:external`). Verifica que el
 * esquema exista para no dar un FAIL confuso.
 */
async function startExternalDb(): Promise<TestDb> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('SMARTSENSE_DB_TEST_MODE=external pero DATABASE_URL no está definida.');
  }
  assertSafeExternalUrl(url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "device_categories" LIMIT 1');
  } catch {
    await prisma.$disconnect();
    throw new Error(
      `La DB externa (${maskDbUrl(url)}) no parece migrada (tabla device_categories ausente). ` +
        'Ejecuta `pnpm db:migrate` antes de los tests, o usa `pnpm verify:phase1:external`.',
    );
  }
  return { container: null, prisma, url, mode: 'external' };
}

/** Punto de entrada: levanta la DB según el modo resuelto. */
export async function startTestDb(): Promise<TestDb> {
  const mode = resolveTestDbMode();
  if (mode === 'docker') return startDockerDb();
  if (mode === 'external') return startExternalDb();
  throw new Error(BLOCKED_MESSAGE);
}

export async function stopTestDb(db: TestDb | undefined): Promise<void> {
  if (!db) return;
  await db.prisma.$disconnect();
  if (db.container) await db.container.stop();
}
