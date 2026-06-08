/**
 * Agregación de energía (telemetry → energy_aggregates).
 *
 * Estrategia (specs/07-iot/telemetry-model.md §5):
 *  - energy_kwh del bucket = SUM(energy_wh_delta) / 1000 de las lecturas del bucket.
 *  - peak_power_w del bucket = MAX(active_power_w).
 *  - El delta acumulativo evita problemas de reseteo de contador; los gaps no se rellenan.
 *  - NO se calcula cost_clp (costeo CLP es fase posterior — BillingService).
 *
 * El worker/continuous-aggregate de Timescale real queda para una fase posterior
 * (ver jobs-and-workers.md). Aquí se ejecuta INLINE tras cada ingesta, recomputando
 * solo el bucket afectado de forma idempotente (upsert sobre la UNIQUE key). Por
 * volumen, inline solo se recalcula el bucket HORA; `upsertDayBucket` se expone para
 * tests / invocación futura del rollup.
 */
import { Prisma, type PrismaClient } from '@smartsense/db';

type Granularity = 'hour' | 'day';

/** Inicio del bucket (hora o día) en UTC para el timestamp dado. */
function bucketStartFor(ts: Date, granularity: Granularity): Date {
  const d = new Date(ts.getTime());
  d.setUTCMilliseconds(0);
  d.setUTCSeconds(0);
  d.setUTCMinutes(0);
  if (granularity === 'day') d.setUTCHours(0);
  return d;
}

function bucketEnd(start: Date, granularity: Granularity): Date {
  const end = new Date(start.getTime());
  if (granularity === 'hour') end.setUTCHours(end.getUTCHours() + 1);
  else end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

/**
 * Recalcula y upserta el bucket (installationId, deviceId, categoryId=null, granularity)
 * que contiene `ts`. Idempotente: recomputa desde telemetry_readings y reescribe la fila.
 */
async function recomputeBucket(
  prisma: PrismaClient,
  installationId: string,
  deviceId: string,
  ts: Date,
  granularity: Granularity,
): Promise<void> {
  const bucketStart = bucketStartFor(ts, granularity);
  const end = bucketEnd(bucketStart, granularity);

  const agg = await prisma.telemetryReading.aggregate({
    where: {
      installationId,
      deviceId,
      sourceTimestamp: { gte: bucketStart, lt: end },
      ingestionStatus: 'accepted',
    },
    _sum: { energyWhDelta: true },
    _max: { activePowerW: true },
  });

  const sumWh = agg._sum.energyWhDelta ?? new Prisma.Decimal(0);
  const energyKwh = new Prisma.Decimal(sumWh).div(1000);
  const peakPowerW = agg._max.activePowerW ?? null;

  // device/category NULL en la UNIQUE → en Prisma findFirst con null explícito;
  // el índice físico es NULLS NOT DISTINCT (categoryId siempre null aquí).
  const existing = await prisma.energyAggregate.findFirst({
    where: {
      installationId,
      deviceId,
      categoryId: null,
      granularity,
      bucketStart,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.energyAggregate.update({
      where: { id: existing.id },
      data: { energyKwh, peakPowerW, recomputedAt: new Date() },
    });
  } else {
    await prisma.energyAggregate.create({
      data: {
        installationId,
        deviceId,
        categoryId: null,
        granularity,
        bucketStart,
        energyKwh,
        peakPowerW,
      },
    });
  }
}

/** Recalcula el bucket HORA que contiene `ts`. Invocado inline tras ingest. */
export async function upsertHourBucket(
  prisma: PrismaClient,
  installationId: string,
  deviceId: string,
  ts: Date,
): Promise<void> {
  await recomputeBucket(prisma, installationId, deviceId, ts, 'hour');
}

/** Recalcula el bucket DÍA que contiene `ts`. Rollup invocado por worker/tests. */
export async function upsertDayBucket(
  prisma: PrismaClient,
  installationId: string,
  deviceId: string,
  ts: Date,
): Promise<void> {
  await recomputeBucket(prisma, installationId, deviceId, ts, 'day');
}
