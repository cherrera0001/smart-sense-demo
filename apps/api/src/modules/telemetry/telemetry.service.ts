/**
 * Servicio de telemetría (Fase 3 IoT). Funciones puras (prisma, userId, ...).
 *
 * Cubre ingesta idempotente, lectura "latest" y consulta por rango. Validaciones
 * según specs/07-iot/telemetry-model.md §6:
 *  - No-negatividad y power_factor ∈ [-1,1] → validados por el zod del schema en la ruta.
 *  - Pertenencia (device → kit/installation, no cross-tenant) y capability meter aquí.
 *  - source_timestamp no excesivamente futuro (tolerancia de reloj ≤ now+120s) aquí.
 *
 * NOTA (auditoría): la telemetría NO se audita por lectura. Es un flujo de alto volumen
 * (5–30 s por device) y `audit_logs` es append-only protegido por trigger; auditar cada
 * lectura saturaría la tabla sin valor forense. Las acciones de gestión sí auditan (ver
 * CONTRACT.md). NO se calculan costos CLP ni se emiten alertas (fases posteriores).
 */
import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient, type TelemetryReading } from '@smartsense/db';
import { computeEventHash } from '@smartsense/shared';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { AppError, Errors } from '../../lib/errors.js';
import type { TelemetryIngest, TelemetryRangeQuery } from './telemetry.schemas.js';
import { upsertHourBucket } from './energy-aggregation.service.js';

/** Tolerancia de reloj para source_timestamp futuro (ms). Canon §6: ~120 s. */
const FUTURE_TOLERANCE_MS = 120_000;

/** Convierte Decimal→number y Date→ISO en una lectura para serializar en la respuesta. */
function dec(v: Prisma.Decimal | null): number | null {
  return v === null ? null : Number(v);
}

function serializeReading(r: TelemetryReading) {
  return {
    reading_id: r.readingId,
    device_id: r.deviceId,
    kit_id: r.kitId,
    installation_id: r.installationId,
    source_timestamp: r.sourceTimestamp.toISOString(),
    received_timestamp: r.receivedTimestamp.toISOString(),
    voltage_v: dec(r.voltageV),
    current_a: dec(r.currentA),
    active_power_w: dec(r.activePowerW),
    reactive_power_var: dec(r.reactivePowerVar),
    apparent_power_va: dec(r.apparentPowerVa),
    power_factor: dec(r.powerFactor),
    energy_wh_delta: dec(r.energyWhDelta),
    frequency_hz: dec(r.frequencyHz),
    signal_quality: r.signalQuality,
    firmware_version: r.firmwareVersion,
    ingestion_status: r.ingestionStatus,
    event_hash: r.eventHash,
  };
}

/**
 * Ingiere una lectura de telemetría. Idempotente por `event_hash`:
 * reenvío del mismo hash → 200 status='duplicate' sin insertar.
 */
export async function ingestTelemetry(
  prisma: PrismaClient,
  userId: string,
  dto: TelemetryIngest,
): Promise<{
  reading_id: string;
  status: 'accepted' | 'duplicate';
  event_hash: string;
  received_timestamp: string;
}> {
  // Acceso operate sobre la installation (resuelve y valida el tenant declarado).
  await assertInstallationAccess(prisma, userId, dto.installation_id, ROLES.operate);

  const device = await prisma.device.findFirst({
    where: { id: dto.device_id, deletedAt: null },
    select: { id: true, kitId: true, installationId: true, capabilities: true },
  });
  if (!device) throw Errors.notFound('Dispositivo');

  // Pertenencia: el device debe pertenecer al kit y a la installation declarados.
  // assertInstallationAccess ya validó el tenant de installation_id; esto cierra el
  // vector cross-tenant (device de otra installation con un installation_id propio).
  if (device.kitId !== dto.kit_id || device.installationId !== dto.installation_id) {
    throw Errors.conflict(
      'DEVICE_KIT_MISMATCH',
      'El device no pertenece al kit/instalación indicados',
    );
  }

  // Capability meter. Si capabilities.meter === false (explícito) → rechazo 422.
  // Si no está declarado, se acepta (firmware mínimo puede no anunciar capabilities).
  const caps = (device.capabilities ?? {}) as Record<string, unknown>;
  if (caps.meter === false) {
    throw Errors.validation('El device no tiene capability meter');
  }

  // source_timestamp no excesivamente futuro (tolerancia de reloj).
  const sourceTs = new Date(dto.source_timestamp);
  if (sourceTs.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    throw new AppError(422, 'INVALID_TIMESTAMP', 'source_timestamp excesivamente futuro');
  }

  const eventHash =
    dto.event_hash ??
    computeEventHash({
      device_id: dto.device_id,
      source_timestamp: dto.source_timestamp,
      metrics: {
        voltage_v: dto.voltage_v,
        current_a: dto.current_a,
        active_power_w: dto.active_power_w,
        reactive_power_var: dto.reactive_power_var,
        apparent_power_va: dto.apparent_power_va,
        power_factor: dto.power_factor,
        energy_wh_delta: dto.energy_wh_delta,
        frequency_hz: dto.frequency_hz,
      },
    });

  // Idempotencia fuerte por event_hash.
  const existing = await prisma.telemetryReading.findUnique({ where: { eventHash } });
  if (existing) {
    return {
      reading_id: existing.readingId,
      status: 'duplicate',
      event_hash: eventHash,
      received_timestamp: existing.receivedTimestamp.toISOString(),
    };
  }

  const readingId = dto.reading_id ?? randomUUID();
  const now = new Date();

  const created = await prisma.telemetryReading.create({
    data: {
      readingId,
      deviceId: dto.device_id,
      kitId: dto.kit_id,
      installationId: dto.installation_id,
      sourceTimestamp: sourceTs,
      receivedTimestamp: now,
      voltageV: dto.voltage_v ?? null,
      currentA: dto.current_a ?? null,
      activePowerW: dto.active_power_w ?? null,
      reactivePowerVar: dto.reactive_power_var ?? null,
      apparentPowerVa: dto.apparent_power_va ?? null,
      powerFactor: dto.power_factor ?? null,
      energyWhDelta: dto.energy_wh_delta ?? null,
      frequencyHz: dto.frequency_hz ?? null,
      signalQuality: dto.signal_quality ?? null,
      firmwareVersion: dto.firmware_version ?? null,
      ingestionStatus: 'accepted',
      eventHash,
      rawPayload: (dto.raw_payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  // Cada lectura válida actualiza last_seen_at y marca online (canon §7).
  await prisma.device.update({
    where: { id: dto.device_id },
    data: { lastSeenAt: now, state: 'online' },
  });

  // Agregación inline idempotente del bucket hora afectado.
  await upsertHourBucket(prisma, dto.installation_id, dto.device_id, sourceTs);

  return {
    reading_id: created.readingId,
    status: 'accepted',
    event_hash: eventHash,
    received_timestamp: created.receivedTimestamp.toISOString(),
  };
}

/** Última lectura de la instalación + conteo de devices. Empty-state válido (null). */
export async function getLatest(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
): Promise<{
  installationId: string;
  latestReading: ReturnType<typeof serializeReading> | null;
  deviceCount: number;
  receivedTimestamp: string | null;
}> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const [deviceCount, latest] = await Promise.all([
    prisma.device.count({ where: { installationId, deletedAt: null } }),
    prisma.telemetryReading.findFirst({
      where: { installationId },
      orderBy: { sourceTimestamp: 'desc' },
    }),
  ]);

  return {
    installationId,
    latestReading: latest ? serializeReading(latest) : null,
    deviceCount,
    receivedTimestamp: latest ? latest.receivedTimestamp.toISOString() : null,
  };
}

/** Lecturas de la instalación en un rango temporal (opcionalmente filtradas por device). */
export async function getRange(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
  query: TelemetryRangeQuery,
): Promise<{
  installationId: string;
  range: { from: string; to: string };
  readings: ReturnType<typeof serializeReading>[];
}> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  if (query.device_id) {
    const device = await prisma.device.findFirst({
      where: { id: query.device_id, installationId, deletedAt: null },
      select: { id: true },
    });
    if (!device) throw Errors.crossTenant();
  }

  const readings = await prisma.telemetryReading.findMany({
    where: {
      installationId,
      ...(query.device_id ? { deviceId: query.device_id } : {}),
      sourceTimestamp: {
        gte: new Date(query.from),
        lte: new Date(query.to),
      },
    },
    orderBy: { sourceTimestamp: 'desc' },
    take: query.limit,
  });

  return {
    installationId,
    range: { from: query.from, to: query.to },
    readings: readings.map(serializeReading),
  };
}
