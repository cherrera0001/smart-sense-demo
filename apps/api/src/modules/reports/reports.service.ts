/**
 * Servicio de reports (Fase 4). Series temporales agregadas por periodo.
 * Funciones puras `(prisma, userId, installationId, ...)`. Sin Fastify.
 *
 * REGLAS DURAS:
 *  - Costo CLP SIEMPRE vía BillingService (BR-030/BR-031). Sin tarifa → null. No se inventa.
 *  - NO se consultan alerts/recommendations/control: fuera de scope de reports.
 *
 * ESTRATEGIA DE DATOS (preferencia agregados → fallback telemetría):
 *  Para cada periodo se computa un rango [from, to) y la lista de buckets esperados.
 *  Se prefiere `energy_aggregates` con la granularidad adecuada cuyo `bucketStart`
 *  caiga en [from, to): energyKwh = SUM por bucket, peakPowerW = MAX por bucket
 *  (cualquier deviceId). Si NO hay NINGÚN agregado en el rango con esa granularidad,
 *  se deriva de `telemetry_readings` agrupando por bucket:
 *  energyKwh = SUM(energyWhDelta)/1000, peakPowerW = MAX(activePowerW).
 *  No se mezclan ambas fuentes (evita doble conteo).
 *
 * BUCKETS VACÍOS: para daily/weekly/monthly se incluyen TODOS los buckets esperados,
 * con energy_kwh = 0 y peak_power_w = null cuando no hay dato (serie contigua para
 * graficar). Para last_three_months también se incluyen los 3 meses.
 *
 * ZONAS HORARIAS: todos los rangos y buckets se calculan en UTC, consistente con los
 * buckets persistidos por la agregación (specs/07-iot). La instalación declara un
 * timezone pero el ajuste a zona local se hará en una fase posterior si aplica.
 *
 * TOTALES: deben cuadrar con la suma/máximo de los `points` (no se recalculan aparte):
 *  totals.energy_kwh = SUM(points.energy_kwh); totals.peak_power_w = MAX(points.peak_power_w);
 *  totals.cost_clp = SUM(points.cost_clp) (null si todos null).
 */
import { Prisma, type PrismaClient, type AggregateGranularity } from '@smartsense/db';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { estimateSeriesCostClp } from '../billing/billing.service.js';
import type { ReportResponse, ReportPeriod, ReportDataStatus } from './reports.schemas.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Decimal/number/null → number (0 si null). */
function toNumber(v: Prisma.Decimal | number | null | undefined): number {
  return v == null ? 0 : Number(v);
}

/** Inicio del día UTC (00:00:00.000). */
function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Inicio del mes UTC (día 1, 00:00:00.000). */
function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Suma `n` meses UTC al inicio de mes dado (puede ser negativo). */
function addUtcMonths(monthStart: Date, n: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + n, 1));
}

/** Resuelve la fecha ancla en UTC a partir de la query `date` (o ahora). */
function resolveAnchor(date?: string): Date {
  if (!date) return new Date();
  // 'YYYY-MM-DD' → medianoche UTC; ISO completo → su instante. Date.UTC para el caso corto.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

interface BucketPlan {
  from: Date;
  to: Date;
  granularity: AggregateGranularity;
  /** Inicios de bucket esperados (UTC), contiguos y ordenados ascendentemente. */
  buckets: Date[];
}

/** Computa rango + buckets esperados según el periodo (todo UTC). */
function planBuckets(period: ReportPeriod, anchor: Date): BucketPlan {
  switch (period) {
    case 'daily': {
      // 24 buckets por hora del día UTC del ancla.
      const from = utcDayStart(anchor);
      const to = new Date(from.getTime() + DAY_MS);
      const buckets: Date[] = [];
      for (let h = 0; h < 24; h++) {
        buckets.push(new Date(from.getTime() + h * 60 * 60 * 1000));
      }
      return { from, to, granularity: 'hour', buckets };
    }
    case 'weekly': {
      // Últimos 7 días (incluyendo el día del ancla): 7 buckets por día.
      const todayStart = utcDayStart(anchor);
      const from = new Date(todayStart.getTime() - 6 * DAY_MS);
      const to = new Date(todayStart.getTime() + DAY_MS);
      const buckets: Date[] = [];
      for (let i = 0; i < 7; i++) {
        buckets.push(new Date(from.getTime() + i * DAY_MS));
      }
      return { from, to, granularity: 'day', buckets };
    }
    case 'monthly': {
      // Días del mes actual del ancla: 1 bucket por día (hasta fin de mes).
      const from = utcMonthStart(anchor);
      const to = addUtcMonths(from, 1);
      const buckets: Date[] = [];
      for (let t = from.getTime(); t < to.getTime(); t += DAY_MS) {
        buckets.push(new Date(t));
      }
      return { from, to, granularity: 'day', buckets };
    }
    case 'last_three_months': {
      // 3 buckets por mes: mes actual y los 2 anteriores.
      const currentMonth = utcMonthStart(anchor);
      const from = addUtcMonths(currentMonth, -2);
      const to = addUtcMonths(currentMonth, 1);
      const buckets: Date[] = [
        addUtcMonths(currentMonth, -2),
        addUtcMonths(currentMonth, -1),
        currentMonth,
      ];
      return { from, to, granularity: 'month', buckets };
    }
  }
}

/** Devuelve el índice de bucket (en `buckets`) al que pertenece el instante `t`. */
function bucketIndexFor(buckets: Date[], to: Date, t: Date): number {
  const ms = t.getTime();
  if (ms < buckets[0].getTime() || ms >= to.getTime()) return -1;
  // Buckets contiguos: el correcto es el último cuyo start <= t.
  let lo = 0;
  let hi = buckets.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (buckets[mid].getTime() <= ms) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

interface BucketAccum {
  energyKwh: number;
  peakPowerW: number | null;
  hasData: boolean;
}

function emptyAccum(): BucketAccum {
  return { energyKwh: 0, peakPowerW: null, hasData: false };
}

function applyPeak(acc: BucketAccum, peak: number | null): void {
  if (peak == null) return;
  acc.peakPowerW = acc.peakPowerW == null ? peak : Math.max(acc.peakPowerW, peak);
}

/**
 * Llena los acumuladores por bucket desde energy_aggregates (granularidad exacta).
 * Devuelve true si hubo al menos un agregado en el rango.
 */
async function fillFromAggregates(
  prisma: PrismaClient,
  installationId: string,
  plan: BucketPlan,
  accums: BucketAccum[],
): Promise<boolean> {
  const rows = await prisma.energyAggregate.findMany({
    where: {
      installationId,
      granularity: plan.granularity,
      bucketStart: { gte: plan.from, lt: plan.to },
    },
    select: { bucketStart: true, energyKwh: true, peakPowerW: true },
  });
  if (rows.length === 0) return false;

  for (const r of rows) {
    const idx = bucketIndexFor(plan.buckets, plan.to, r.bucketStart);
    if (idx < 0) continue;
    const acc = accums[idx];
    acc.energyKwh += toNumber(r.energyKwh);
    applyPeak(acc, r.peakPowerW == null ? null : Number(r.peakPowerW));
    acc.hasData = true;
  }
  return true;
}

/**
 * Llena los acumuladores por bucket desde telemetry_readings (fallback).
 * Devuelve true si hubo al menos una lectura en el rango.
 */
async function fillFromTelemetry(
  prisma: PrismaClient,
  installationId: string,
  plan: BucketPlan,
  accums: BucketAccum[],
): Promise<boolean> {
  const rows = await prisma.telemetryReading.findMany({
    where: {
      installationId,
      sourceTimestamp: { gte: plan.from, lt: plan.to },
    },
    select: { sourceTimestamp: true, energyWhDelta: true, activePowerW: true },
  });
  if (rows.length === 0) return false;

  for (const r of rows) {
    const idx = bucketIndexFor(plan.buckets, plan.to, r.sourceTimestamp);
    if (idx < 0) continue;
    const acc = accums[idx];
    acc.energyKwh += toNumber(r.energyWhDelta) / 1000;
    applyPeak(acc, r.activePowerW == null ? null : Number(r.activePowerW));
    acc.hasData = true;
  }
  return true;
}

/**
 * Genera un reporte de serie temporal para una instalación y periodo.
 * Empty-state coherente cuando no hay datos: points con energy_kwh 0,
 * totals en 0/null, data_status 'empty'.
 */
export async function getReport(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
  period: ReportPeriod,
  date?: string,
): Promise<ReportResponse> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const anchor = resolveAnchor(date);
  const plan = planBuckets(period, anchor);
  const accums = plan.buckets.map(() => emptyAccum());

  // Preferir agregados; solo caer a telemetría si NO hay agregados en el rango.
  const hadAggregates = await fillFromAggregates(prisma, installationId, plan, accums);
  let hadTelemetry = false;
  if (!hadAggregates) {
    hadTelemetry = await fillFromTelemetry(prisma, installationId, plan, accums);
  }

  // Costo por punto vía BillingService (resuelve la tarifa una sola vez).
  const seriesCost = await estimateSeriesCostClp(
    prisma,
    installationId,
    accums.map((a) => ({ energyKwh: a.energyKwh })),
  );

  const points = plan.buckets.map((bucketStart, i) => {
    const acc = accums[i];
    return {
      bucket_start: bucketStart.toISOString(),
      energy_kwh: acc.energyKwh,
      cost_clp: seriesCost.points[i]?.costClp ?? null,
      peak_power_w: acc.peakPowerW,
    };
  });

  // Totales derivados de points (deben cuadrar con la suma de la serie).
  const totalEnergyKwh = points.reduce((s, p) => s + p.energy_kwh, 0);
  const peaks = points.map((p) => p.peak_power_w).filter((v): v is number => v != null);
  const totalPeakPowerW = peaks.length > 0 ? Math.max(...peaks) : null;
  const costs = points.map((p) => p.cost_clp);
  const totalCostClp = costs.every((c) => c == null)
    ? null
    : costs.reduce<number>((s, c) => s + (c ?? 0), 0);

  // data_status: empty si no hay ningún dato en el rango; complete si todos los
  // buckets tienen dato; partial en otro caso.
  let dataStatus: ReportDataStatus;
  if (!hadAggregates && !hadTelemetry) {
    dataStatus = 'empty';
  } else if (accums.every((a) => a.hasData)) {
    dataStatus = 'complete';
  } else {
    dataStatus = 'partial';
  }

  return {
    installation_id: installationId,
    period,
    from: plan.from.toISOString(),
    to: plan.to.toISOString(),
    points,
    totals: {
      energy_kwh: totalEnergyKwh,
      cost_clp: totalCostClp,
      peak_power_w: totalPeakPowerW,
    },
    data_status: dataStatus,
  };
}
