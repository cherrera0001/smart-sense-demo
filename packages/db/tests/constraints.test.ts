/**
 * Tests de CHECK constraints + idempotencia + seed (Paso 9).
 *
 * Requieren Docker (Testcontainers). Si Docker no está disponible se skippean con un mensaje
 * claro; el archivo COMPILA igualmente (typecheck) en cualquier entorno.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import {
  startTestDb,
  stopTestDb,
  testDbAvailable,
  resolveTestDbMode,
  BLOCKED_MESSAGE,
  type TestDb,
} from './setup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbAvailable = testDbAvailable();
const suite = dbAvailable ? describe : describe.skip;

if (!dbAvailable) {
  // eslint-disable-next-line no-console
  console.warn(`[constraints.test] ${BLOCKED_MESSAGE}`);
} else {
  // eslint-disable-next-line no-console
  console.info(`[constraints.test] modo DB: ${resolveTestDbMode()}`);
}

suite('CHECK constraints, idempotencia y seed', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await startTestDb();
  }, 180_000);

  afterAll(async () => {
    await stopTestDb(db);
  });

  async function baseInstallation() {
    const p = db.prisma;
    const org = await p.organization.create({ data: { name: `Org ${randomUUID()}` } });
    const installation = await p.installation.create({
      data: { organizationId: org.id, name: 'Sitio', segment: 'home' },
    });
    return { org, installation };
  }

  async function baseDevice() {
    const p = db.prisma;
    const { org, installation } = await baseInstallation();
    const kit = await p.energyKit.create({
      data: {
        installationId: installation.id,
        qrCode: `QR-${randomUUID()}`,
        serial: `SN-${randomUUID()}`,
        status: 'active',
      },
    });
    const device = await p.device.create({
      data: { kitId: kit.id, installationId: installation.id, name: 'D', externalRef: 'r' },
    });
    return { org, installation, kit, device };
  }

  it('boleta con total_clp negativo es rechazada (CHECK no-negatividad)', async () => {
    const { installation } = await baseInstallation();
    await expect(
      db.prisma.electricityBill.create({
        data: {
          installationId: installation.id,
          periodStart: new Date('2026-04-01'),
          periodEnd: new Date('2026-04-30'),
          consumptionKwh: '10.0000',
          totalClp: -1n, // negativo → CHECK total_clp >= 0
          fileUrl: 'demo://b.pdf',
        },
      }),
    ).rejects.toThrow();
  });

  it('boleta con period_end < period_start es rechazada (CHECK periodo)', async () => {
    const { installation } = await baseInstallation();
    await expect(
      db.prisma.electricityBill.create({
        data: {
          installationId: installation.id,
          periodStart: new Date('2026-04-30'),
          periodEnd: new Date('2026-04-01'),
          consumptionKwh: '10.0000',
          totalClp: 1000n,
          fileUrl: 'demo://b.pdf',
        },
      }),
    ).rejects.toThrow();
  });

  it('telemetría con active_power_w negativo es rechazada (CHECK >= 0)', async () => {
    const { device, kit, installation } = await baseDevice();
    await expect(
      db.prisma.telemetryReading.create({
        data: {
          readingId: randomUUID(),
          deviceId: device.id,
          kitId: kit.id,
          installationId: installation.id,
          sourceTimestamp: new Date(),
          eventHash: `eh-${randomUUID()}`,
          activePowerW: '-5.00', // negativo
        },
      }),
    ).rejects.toThrow();
  });

  it('telemetría con power_factor fuera de [-1,1] es rechazada (CHECK rango)', async () => {
    const { device, kit, installation } = await baseDevice();
    await expect(
      db.prisma.telemetryReading.create({
        data: {
          readingId: randomUUID(),
          deviceId: device.id,
          kitId: kit.id,
          installationId: installation.id,
          sourceTimestamp: new Date(),
          eventHash: `eh-${randomUUID()}`,
          powerFactor: '1.500', // fuera de rango
        },
      }),
    ).rejects.toThrow();
  });

  it('consumption_limit con limit_kwh <= 0 es rechazado (CHECK > 0)', async () => {
    const { device } = await baseDevice();
    await expect(
      db.prisma.consumptionLimit.create({
        data: { deviceId: device.id, limitKwh: '0', window: 'day' },
      }),
    ).rejects.toThrow();
  });

  it('consumption_limit con pre_alert_pct fuera de [1,100] es rechazado', async () => {
    const { device } = await baseDevice();
    await expect(
      db.prisma.consumptionLimit.create({
        data: { deviceId: device.id, limitKwh: '5.0000', window: 'day', preAlertPct: 150 },
      }),
    ).rejects.toThrow();
  });

  it('installation_profile con occupants negativo es rechazado (CHECK >= 0)', async () => {
    const { installation } = await baseInstallation();
    await expect(
      db.prisma.installationProfile.create({
        data: { installationId: installation.id, segment: 'home', occupants: -1 },
      }),
    ).rejects.toThrow();
  });

  it('energy_aggregate idempotente: mismo bucket no duplica (UNIQUE NULLS NOT DISTINCT)', async () => {
    const { installation } = await baseInstallation();
    const bucketStart = new Date('2026-04-01T00:00:00Z');
    await db.prisma.energyAggregate.create({
      data: {
        installationId: installation.id,
        // device_id y category_id NULL → bucket a nivel instalación.
        granularity: 'day',
        bucketStart,
        energyKwh: '10.0000',
      },
    });
    await expect(
      db.prisma.energyAggregate.create({
        data: {
          installationId: installation.id,
          granularity: 'day',
          bucketStart,
          energyKwh: '11.0000',
        },
      }),
    ).rejects.toThrow();
  });

  it('el seed corre sin error sobre la base migrada', () => {
    const seedPath = join(__dirname, '..', 'prisma', 'seed.ts');
    // Ejecuta el seed con tsx contra la DB de test; idempotente y sin errores.
    // execSync usa shell (resuelve npx.cmd en Windows; execFileSync da EINVAL con .cmd).
    const output = execSync(`npx tsx "${seedPath}"`, {
      env: { ...process.env, DATABASE_URL: db.url },
      encoding: 'utf8',
    });
    expect(output).toContain('Seed completado');
  }, 120_000);
});
