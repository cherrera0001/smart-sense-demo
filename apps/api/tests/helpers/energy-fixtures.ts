/**
 * Fixtures energéticas reutilizables para los tests de Fase 4
 * (billing / dashboard / reports / breakdown).
 *
 * Corren contra la DB real (Neon dev) — ver test-db.ts. Sin truncado global:
 * cada helper genera datos ÚNICOS (randomUUID) para que las aserciones se acoten
 * al tenant/instalación creados en el propio test.
 *
 * Manejo de tipos numéricos del canon:
 *  - Decimal (energy_kwh, peak_power_w, energy_price_clp_kwh): se aceptan `number`
 *    (Prisma los convierte a Decimal) o `Prisma.Decimal` donde haga falta precisión.
 *  - BigInt (cost_clp, fixed_charge_clp): Prisma los expone como `bigint`. Aquí los
 *    aggregates se crean con cost_clp = null (BR-031: el costo lo calcula BillingService).
 */
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  type PrismaClient,
  type Installation,
  type EnergyKit,
  type Device,
  type DeviceCategory,
  type TelemetryReading,
  type EnergyAggregate,
  type Tariff,
  type AggregateGranularity,
} from '@smartsense/db';

/** Crea una instalación (segment home, tz America/Santiago) para una organización. */
export async function createInstallationForUser(
  prisma: PrismaClient,
  organizationId: string,
  opts: { name?: string; segment?: 'home' | 'smb' | 'business'; tariffId?: string; distributorId?: string } = {},
): Promise<Installation> {
  return prisma.installation.create({
    data: {
      organizationId,
      name: opts.name ?? `Inst ${randomUUID()}`,
      segment: opts.segment ?? 'home',
      timezone: 'America/Santiago',
      tariffId: opts.tariffId,
      distributorId: opts.distributorId,
    },
  });
}

/**
 * Crea un kit `active` (qrCode/serial únicos) y un device asociado.
 * El device lleva capabilities {meter:true} por defecto y externalRef único.
 */
export async function createKitAndDevice(
  prisma: PrismaClient,
  installationId: string,
  opts: { categoryId?: string; name?: string; capabilities?: Prisma.InputJsonValue } = {},
): Promise<{ kit: EnergyKit; device: Device }> {
  const kit = await prisma.energyKit.create({
    data: {
      installationId,
      qrCode: `qr-${randomUUID()}`,
      serial: `sn-${randomUUID()}`,
      status: 'active',
      claimedAt: new Date(),
    },
  });

  const device = await prisma.device.create({
    data: {
      kitId: kit.id,
      installationId,
      categoryId: opts.categoryId,
      name: opts.name ?? `Dev ${randomUUID()}`,
      externalRef: `ext-${randomUUID()}`,
      capabilities: opts.capabilities ?? { meter: true },
      state: 'unknown',
    },
  });

  return { kit, device };
}

/** Upsert de categoría por `key` (reutiliza la del seed si existe). */
export async function ensureCategory(
  prisma: PrismaClient,
  key: string,
  name?: string,
): Promise<DeviceCategory> {
  return prisma.deviceCategory.upsert({
    where: { key },
    update: {},
    create: { key, name: name ?? key },
  });
}

/** Inserta una lectura de telemetría cruda (ingestion_status=accepted, eventHash único). */
export async function insertReading(
  prisma: PrismaClient,
  args: {
    deviceId: string;
    kitId: string;
    installationId: string;
    sourceTimestamp: Date;
    activePowerW?: number | Prisma.Decimal;
    energyWhDelta?: number | Prisma.Decimal;
    voltageV?: number | Prisma.Decimal;
    currentA?: number | Prisma.Decimal;
    powerFactor?: number | Prisma.Decimal;
  },
): Promise<TelemetryReading> {
  return prisma.telemetryReading.create({
    data: {
      readingId: randomUUID(),
      deviceId: args.deviceId,
      kitId: args.kitId,
      installationId: args.installationId,
      sourceTimestamp: args.sourceTimestamp,
      receivedTimestamp: new Date(),
      activePowerW: args.activePowerW ?? null,
      energyWhDelta: args.energyWhDelta ?? null,
      voltageV: args.voltageV ?? null,
      currentA: args.currentA ?? null,
      powerFactor: args.powerFactor ?? null,
      ingestionStatus: 'accepted',
      eventHash: `eh-${randomUUID()}`,
    },
  });
}

/**
 * Inserta un energy_aggregate. costClp queda NULL siempre (BR-031): el costo
 * monetario lo resuelve BillingService a partir de una tarifa válida.
 */
export async function insertAggregate(
  prisma: PrismaClient,
  args: {
    installationId: string;
    deviceId?: string;
    categoryId?: string;
    granularity: AggregateGranularity;
    bucketStart: Date;
    energyKwh: number | Prisma.Decimal;
    peakPowerW?: number | Prisma.Decimal;
  },
): Promise<EnergyAggregate> {
  return prisma.energyAggregate.create({
    data: {
      installationId: args.installationId,
      deviceId: args.deviceId ?? null,
      categoryId: args.categoryId ?? null,
      granularity: args.granularity,
      bucketStart: args.bucketStart,
      energyKwh: args.energyKwh,
      peakPowerW: args.peakPowerW ?? null,
      costClp: null,
    },
  });
}

/** Crea una tarifa demo (code único 'BT-1-TEST-xxxx', precio energía en CLP/kWh). */
export async function createDemoTariff(
  prisma: PrismaClient,
  opts: { distributorId?: string; energyPriceClpKwh?: number | Prisma.Decimal; name?: string } = {},
): Promise<Tariff> {
  return prisma.tariff.create({
    data: {
      distributorId: opts.distributorId,
      code: `BT-1-TEST-${randomUUID().slice(0, 8)}`,
      name: opts.name ?? 'Tarifa Demo BT-1 (test)',
      energyPriceClpKwh: opts.energyPriceClpKwh ?? new Prisma.Decimal(165),
    },
  });
}

/** Asocia una tarifa a una instalación (installation.tariffId). */
export async function linkTariff(
  prisma: PrismaClient,
  installationId: string,
  tariffId: string,
): Promise<Installation> {
  return prisma.installation.update({
    where: { id: installationId },
    data: { tariffId },
  });
}
