/**
 * Servicio de dashboard (Fase 4). Función pura `(prisma, userId, installationId)`.
 *
 * Resume el estado energético de una instalación para la vista principal:
 * potencia instantánea, energía/costo de hoy y del mes, comparación contra el
 * periodo anterior (ayer) y estado de frescura de los datos.
 *
 * REGLAS DURAS:
 *  - Costo CLP SIEMPRE vía BillingService (BR-030/BR-031). Sin tarifa → null. No se inventa.
 *  - alerts_pending_count: conteo real de alertas status=open (Fase 5). Solo lectura.
 *
 * ESTRATEGIA DE ENERGÍA (preferencia agregados → fallback telemetría):
 *  Para un rango [from, to) se prefiere SUM(energyKwh) de `energy_aggregates` con
 *  granularity 'hour'|'day' cuyo `bucketStart` caiga en el rango (cualquier deviceId).
 *  Si NO hay agregados en el rango, se deriva de `telemetry_readings`:
 *  SUM(energyWhDelta)/1000 en el mismo rango. Esto evita doble conteo (no se mezclan
 *  ambas fuentes) y aprovecha la pre-agregación cuando existe.
 *
 * ZONAS HORARIAS: todos los rangos (hoy, mes, ayer) se calculan en UTC. El día UTC
 * va de [00:00, 24:00) y el mes de [primer día 00:00, ahora]. La instalación declara
 * un timezone (America/Santiago) pero el canon de agregación y este resumen operan en
 * UTC para consistencia con los buckets persistidos; el ajuste a zona local del usuario
 * se hará en una fase posterior si el producto lo requiere.
 */
import { Prisma, type PrismaClient } from '@smartsense/db';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { estimateEnergyCostClp } from '../billing/billing.service.js';
import type { DashboardResponse } from './dashboard.schemas.js';

/** Umbral de frescura: lecturas con antigüedad > 15 min se consideran 'stale'. */
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

/** Decimal/number/null → number (0 si null). */
function toNumber(v: Prisma.Decimal | number | null | undefined): number {
  return v == null ? 0 : Number(v);
}

/** Inicio del día UTC (00:00:00.000) de la fecha dada. */
function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Inicio del mes UTC (día 1, 00:00:00.000) de la fecha dada. */
function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Energía (kWh) de una instalación en el rango [from, to).
 * Prefiere agregados ('hour'|'day'); si no hay, deriva de telemetría cruda.
 */
async function energyForRange(
  prisma: PrismaClient,
  installationId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const aggAll = await prisma.energyAggregate.aggregate({
    where: {
      installationId,
      granularity: { in: ['hour', 'day'] },
      bucketStart: { gte: from, lt: to },
    },
    _sum: { energyKwh: true },
    _count: { _all: true },
  });

  if (aggAll._count._all > 0) {
    return toNumber(aggAll._sum.energyKwh);
  }

  // Fallback: derivar de telemetry_readings (energyWhDelta en Wh → kWh).
  const tel = await prisma.telemetryReading.aggregate({
    where: {
      installationId,
      sourceTimestamp: { gte: from, lt: to },
    },
    _sum: { energyWhDelta: true },
  });

  return toNumber(tel._sum.energyWhDelta) / 1000;
}

/**
 * Resumen del dashboard de una instalación. Empty-state coherente cuando no hay
 * lecturas: energies 0, current_power_w null, data_status 'empty', costos según tarifa.
 */
export async function getDashboard(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
): Promise<DashboardResponse> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const now = new Date();
  const todayStart = utcDayStart(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = utcMonthStart(now);

  const [latest, deviceCount, todayEnergyKwh, monthEnergyKwh, prevEnergyKwh, alertsPending] =
    await Promise.all([
      prisma.telemetryReading.findFirst({
        where: { installationId },
        orderBy: { sourceTimestamp: 'desc' },
        select: { activePowerW: true, sourceTimestamp: true },
      }),
      prisma.device.count({ where: { installationId, deletedAt: null } }),
      energyForRange(prisma, installationId, todayStart, tomorrowStart),
      // Mes: [primer día 00:00, ahora]. Se usa `now` como cota superior exclusiva.
      energyForRange(prisma, installationId, monthStart, now),
      energyForRange(prisma, installationId, yesterdayStart, todayStart),
      // Fase 5: conteo real de alertas pendientes (status open). Solo lectura, no evalúa/crea.
      prisma.alert.count({ where: { installationId, status: 'open' } }),
    ]);

  // Costos vía BillingService (null si no hay tarifa válida; nunca se inventa).
  const [todayCost, monthCost] = await Promise.all([
    estimateEnergyCostClp(prisma, installationId, todayEnergyKwh),
    estimateEnergyCostClp(prisma, installationId, monthEnergyKwh),
  ]);

  // Estado de frescura.
  let dataStatus: DashboardResponse['data_status'];
  if (!latest) {
    dataStatus = 'empty';
  } else {
    const ageMs = now.getTime() - latest.sourceTimestamp.getTime();
    dataStatus = ageMs > STALE_THRESHOLD_MS ? 'stale' : 'live';
  }

  // Comparación: delta % de hoy vs ayer (solo si ayer > 0).
  const deltaPercent =
    prevEnergyKwh > 0
      ? Math.round(((todayEnergyKwh - prevEnergyKwh) / prevEnergyKwh) * 100 * 10) / 10
      : null;

  return {
    installation_id: installationId,
    current_power_w: latest && latest.activePowerW != null ? Number(latest.activePowerW) : null,
    today_energy_kwh: todayEnergyKwh,
    today_cost_clp: todayCost.costClp,
    month_energy_kwh: monthEnergyKwh,
    month_cost_clp: monthCost.costClp,
    comparison: {
      previous_period_energy_kwh: prevEnergyKwh,
      delta_percent: deltaPercent,
    },
    latest_reading_timestamp: latest ? latest.sourceTimestamp.toISOString() : null,
    device_count: deviceCount,
    alerts_pending_count: alertsPending,
    data_status: dataStatus,
  };
}
