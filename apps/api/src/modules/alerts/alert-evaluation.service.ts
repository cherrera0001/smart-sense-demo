/**
 * AlertEvaluationService (Fase 5) — evaluación de reglas de alerta basada en
 * EVIDENCIA. Función pura `(prisma, installationId, opts?)`. Sin Fastify.
 *
 * REGLA DURA (no falsos positivos): cada regla exige evidencia mínima. Sin
 * baseline/datos suficientes → NO se crea alerta. Nunca se inventan umbrales ni
 * dinero (el costo monetario no se calcula aquí; lo resuelve BillingService en
 * otra capa si se requiere).
 *
 * RECONCILIACIÓN canon ↔ reglas (docs/audit/phase-5-spec-readiness.md):
 *   high_consumption -> over_budget  (context.subtype='high_consumption')
 *   device_high      -> high_device  (context.subtype='device_high')
 *   offline          -> offline      (context.subtype='offline')
 *   projection_risk  -> over_budget  (context.subtype='projection_risk')
 *   anomaly          -> anomaly      (context.subtype='anomaly')
 *
 * AlertType canónico (persistencia): anomaly | high_device | over_budget | offline.
 *
 * DEDUP: antes de crear, si ya existe una alerta status='open' con la misma
 * (installationId, deviceId, type) creada dentro de la ventana de 24h → se omite
 * (no se duplica). Devuelve sólo las alertas nuevas.
 *
 * ZONAS HORARIAS: todos los rangos (hoy, mes) se calculan en UTC, consistente con
 * los buckets persistidos en energy_aggregates (igual criterio que dashboard Fase 4).
 *
 * NO crea recommendations ni control_actions.
 */
import { Prisma, type PrismaClient, type Alert, type AlertType } from '@smartsense/db';

// --- Umbrales / heurísticas (constantes explícitas, no mágicas) -------------

/** high_consumption: hoy > baseline * 1.3 (30% sobre el promedio diario de 7d). */
const HIGH_CONSUMPTION_RATIO = 1.3;
/** high_consumption: mínimo de días con datos para considerar el baseline válido. */
const HIGH_CONSUMPTION_MIN_DAYS = 3;
/** device_high: un device representa > 50% del total de los últimos 7d. */
const DEVICE_HIGH_SHARE = 0.5;
/** offline: última lectura más vieja que 60 min (o nunca, con evidencia previa). */
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;
/** projection_risk: proyección del mes > mes anterior * 1.2 (20% sobre). */
const PROJECTION_RISK_RATIO = 1.2;
/** anomaly: una lectura diaria desviada > 3·stddev de la media. */
const ANOMALY_STDDEV_FACTOR = 3;
/** anomaly: mínimo de días con datos para que la desviación sea significativa. */
const ANOMALY_MIN_DAYS = 5;
/** Ventana de dedup para alertas open equivalentes. */
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EvaluateOptions {
  /** Reloj inyectable para tests deterministas. Default: new Date(). */
  now?: Date;
}

interface PendingAlert {
  deviceId: string | null;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  context: Record<string, unknown>;
}

function toNumber(v: Prisma.Decimal | number | null | undefined): number {
  return v == null ? 0 : Number(v);
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Días totales del mes UTC de la fecha dada. */
function daysInUtcMonth(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/**
 * Energía (kWh) de una instalación en [from, to). Prefiere agregados
 * ('hour'|'day'); si no hay agregados en el rango, deriva de telemetría cruda
 * (energyWhDelta en Wh → kWh). Evita doble conteo (no mezcla fuentes), igual
 * criterio que dashboard (Fase 4).
 */
async function energyForRange(
  prisma: PrismaClient,
  installationId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const agg = await prisma.energyAggregate.aggregate({
    where: {
      installationId,
      granularity: { in: ['hour', 'day'] },
      bucketStart: { gte: from, lt: to },
    },
    _sum: { energyKwh: true },
    _count: { _all: true },
  });
  if (agg._count._all > 0) return toNumber(agg._sum.energyKwh);

  const tel = await prisma.telemetryReading.aggregate({
    where: { installationId, sourceTimestamp: { gte: from, lt: to } },
    _sum: { energyWhDelta: true },
  });
  return toNumber(tel._sum.energyWhDelta) / 1000;
}

/**
 * Serie de energía diaria (kWh) por día UTC en [from, to). Devuelve un valor por
 * día consecutivo. Prefiere agregados; si no hay ninguno en el rango, deriva de
 * telemetría día a día. Sólo devuelve días con datos (>0 o presencia de bucket).
 */
async function dailyEnergySeries(
  prisma: PrismaClient,
  installationId: string,
  from: Date,
  to: Date,
): Promise<number[]> {
  const series: number[] = [];
  for (let dayStart = from.getTime(); dayStart < to.getTime(); dayStart += DAY_MS) {
    const start = new Date(dayStart);
    const end = new Date(dayStart + DAY_MS);
    const kwh = await energyForRange(prisma, installationId, start, end);
    series.push(kwh);
  }
  return series;
}

// --- Reglas ----------------------------------------------------------------

/**
 * high_consumption (→ over_budget). Energía de HOY vs baseline (promedio diario
 * de los últimos 7 días anteriores a hoy). Requiere ≥3 días con datos (>0) y
 * baseline>0. Si today > baseline*1.3 → alerta warning.
 */
async function evalHighConsumption(
  prisma: PrismaClient,
  installationId: string,
  now: Date,
): Promise<PendingAlert | null> {
  const todayStart = utcDayStart(now);
  const baselineFrom = new Date(todayStart.getTime() - 7 * DAY_MS);

  const baselineDays = await dailyEnergySeries(prisma, installationId, baselineFrom, todayStart);
  const daysWithData = baselineDays.filter((k) => k > 0);
  if (daysWithData.length < HIGH_CONSUMPTION_MIN_DAYS) return null;

  const baselineKwh =
    daysWithData.reduce((acc, k) => acc + k, 0) / daysWithData.length;
  if (baselineKwh <= 0) return null;

  const todayKwh = await energyForRange(
    prisma,
    installationId,
    todayStart,
    new Date(todayStart.getTime() + DAY_MS),
  );
  const ratio = todayKwh / baselineKwh;
  if (todayKwh <= baselineKwh * HIGH_CONSUMPTION_RATIO) return null;

  return {
    deviceId: null,
    type: 'over_budget',
    severity: 'warning',
    message: `Consumo de hoy (${todayKwh.toFixed(2)} kWh) ${Math.round((ratio - 1) * 100)}% por encima del promedio de los últimos días (${baselineKwh.toFixed(2)} kWh).`,
    context: {
      subtype: 'high_consumption',
      today_kwh: todayKwh,
      baseline_kwh: baselineKwh,
      ratio,
    },
  };
}

/**
 * device_high (→ high_device). Desglose de los últimos 7 días por device. Si un
 * device concentra > 50% del total y total>0 → alerta warning en ese device.
 */
async function evalDeviceHigh(
  prisma: PrismaClient,
  installationId: string,
  now: Date,
): Promise<PendingAlert | null> {
  const todayEnd = new Date(utcDayStart(now).getTime() + DAY_MS);
  const from = new Date(todayEnd.getTime() - 7 * DAY_MS);

  const byDevice = await prisma.energyAggregate.groupBy({
    by: ['deviceId'],
    where: {
      installationId,
      deviceId: { not: null },
      granularity: { in: ['hour', 'day'] },
      bucketStart: { gte: from, lt: todayEnd },
    },
    _sum: { energyKwh: true },
  });

  if (byDevice.length === 0) return null;

  const totals = byDevice.map((g) => ({
    deviceId: g.deviceId as string,
    kwh: toNumber(g._sum.energyKwh),
  }));
  const totalKwh = totals.reduce((acc, d) => acc + d.kwh, 0);
  if (totalKwh <= 0) return null;

  const top = totals.reduce((a, b) => (b.kwh > a.kwh ? b : a));
  const pct = top.kwh / totalKwh;
  if (pct <= DEVICE_HIGH_SHARE) return null;

  return {
    deviceId: top.deviceId,
    type: 'high_device',
    severity: 'warning',
    message: `Un dispositivo concentra el ${Math.round(pct * 100)}% del consumo de los últimos 7 días (${top.kwh.toFixed(2)} de ${totalKwh.toFixed(2)} kWh).`,
    context: {
      subtype: 'device_high',
      device_kwh: top.kwh,
      total_kwh: totalKwh,
      pct,
    },
  };
}

/**
 * offline. Device de un kit `active` cuya última lectura (max source_timestamp)
 * o lastSeenAt es > 60 min vieja, PERO que tuvo alguna lectura antes (evidencia
 * de que estuvo online). Sin ninguna lectura nunca → NO alerta (no hay evidencia
 * de que el device alguna vez transmitió). Genera 1 alerta info por device.
 */
async function evalOffline(
  prisma: PrismaClient,
  installationId: string,
  now: Date,
): Promise<PendingAlert[]> {
  const devices = await prisma.device.findMany({
    where: {
      installationId,
      deletedAt: null,
      kit: { status: 'active' },
    },
    select: { id: true, lastSeenAt: true },
  });

  const out: PendingAlert[] = [];
  for (const device of devices) {
    const last = await prisma.telemetryReading.findFirst({
      where: { deviceId: device.id },
      orderBy: { sourceTimestamp: 'desc' },
      select: { sourceTimestamp: true },
    });

    // Evidencia de que estuvo online: al menos una lectura histórica O lastSeenAt.
    const lastSeen = last?.sourceTimestamp ?? device.lastSeenAt ?? null;
    if (!lastSeen) continue; // nunca transmitió → sin evidencia → no alerta

    const ageMs = now.getTime() - lastSeen.getTime();
    if (ageMs <= OFFLINE_THRESHOLD_MS) continue;

    out.push({
      deviceId: device.id,
      type: 'offline',
      severity: 'info',
      message: `El dispositivo no reporta lecturas desde ${lastSeen.toISOString()} (más de ${Math.round(ageMs / 60000)} min).`,
      context: {
        subtype: 'offline',
        last_seen: lastSeen.toISOString(),
      },
    });
  }
  return out;
}

/**
 * projection_risk (→ over_budget). Proyección del mes actual
 * (energía mes-a-la-fecha / días transcurridos * días del mes) vs energía del
 * mes anterior completo. Requiere prev>0 y al menos 1 día transcurrido. Si la
 * proyección > prev*1.2 → alerta warning.
 */
async function evalProjectionRisk(
  prisma: PrismaClient,
  installationId: string,
  now: Date,
): Promise<PendingAlert | null> {
  const monthStart = utcMonthStart(now);
  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );

  const [mtdKwh, prevKwh] = await Promise.all([
    energyForRange(prisma, installationId, monthStart, now),
    energyForRange(prisma, installationId, prevMonthStart, monthStart),
  ]);

  if (prevKwh <= 0) return null;

  const elapsedMs = now.getTime() - monthStart.getTime();
  const elapsedDays = elapsedMs / DAY_MS;
  if (elapsedDays <= 0 || mtdKwh <= 0) return null;

  const daysMonth = daysInUtcMonth(now);
  const projectedKwh = (mtdKwh / elapsedDays) * daysMonth;
  if (projectedKwh <= prevKwh * PROJECTION_RISK_RATIO) return null;

  return {
    deviceId: null,
    type: 'over_budget',
    severity: 'warning',
    message: `La proyección de consumo del mes (${projectedKwh.toFixed(2)} kWh) supera en ${Math.round((projectedKwh / prevKwh - 1) * 100)}% al mes anterior (${prevKwh.toFixed(2)} kWh).`,
    context: {
      subtype: 'projection_risk',
      projected_kwh: projectedKwh,
      prev_kwh: prevKwh,
    },
  };
}

/**
 * anomaly. Desviación de la energía diaria respecto a la media de los últimos
 * días. Requiere ≥5 días con datos. Si el último día (hoy o el más reciente con
 * datos) se desvía > 3·stddev de la media de los días previos → alerta info.
 * Sin datos suficientes → nada.
 */
async function evalAnomaly(
  prisma: PrismaClient,
  installationId: string,
  now: Date,
): Promise<PendingAlert | null> {
  const todayEnd = new Date(utcDayStart(now).getTime() + DAY_MS);
  // Ventana de 14 días para tener historia suficiente.
  const from = new Date(todayEnd.getTime() - 14 * DAY_MS);

  const series = await dailyEnergySeries(prisma, installationId, from, todayEnd);
  // Tomamos los días con datos (>0) como muestra; el último día con datos es el candidato.
  const withData = series.filter((k) => k > 0);
  if (withData.length < ANOMALY_MIN_DAYS) return null;

  const candidate = withData[withData.length - 1];
  const baseline = withData.slice(0, -1);
  if (baseline.length < ANOMALY_MIN_DAYS - 1) return null;

  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const variance =
    baseline.reduce((a, b) => a + (b - mean) ** 2, 0) / baseline.length;
  const stddev = Math.sqrt(variance);
  if (stddev <= 0) return null; // sin dispersión → no se puede afirmar anomalía

  const deviation = Math.abs(candidate - mean);
  if (deviation <= ANOMALY_STDDEV_FACTOR * stddev) return null;

  return {
    deviceId: null,
    type: 'anomaly',
    severity: 'info',
    message: `Consumo diario anómalo (${candidate.toFixed(2)} kWh) frente a la media reciente (${mean.toFixed(2)} kWh, σ=${stddev.toFixed(2)}).`,
    context: {
      subtype: 'anomaly',
      value_kwh: candidate,
      mean_kwh: mean,
      stddev_kwh: stddev,
      sigma: deviation / stddev,
    },
  };
}

// --- Dedup + persistencia ---------------------------------------------------

/**
 * ¿Ya existe una alerta open equivalente (installation+device+type) dentro de la
 * ventana de dedup? Trata deviceId null correctamente.
 */
async function isDuplicate(
  prisma: PrismaClient,
  installationId: string,
  deviceId: string | null,
  type: AlertType,
  now: Date,
): Promise<boolean> {
  const since = new Date(now.getTime() - DEDUP_WINDOW_MS);
  const existing = await prisma.alert.findFirst({
    where: {
      installationId,
      deviceId,
      type,
      status: 'open',
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Evalúa todas las reglas para una instalación y persiste las alertas nuevas
 * (con dedup). Devuelve sólo las alertas creadas en esta invocación.
 *
 * No crea recommendations ni control_actions.
 */
export async function evaluateInstallationAlerts(
  prisma: PrismaClient,
  installationId: string,
  opts: EvaluateOptions = {},
): Promise<Alert[]> {
  const now = opts.now ?? new Date();

  const [highConsumption, deviceHigh, projection, anomaly, offline] = await Promise.all([
    evalHighConsumption(prisma, installationId, now),
    evalDeviceHigh(prisma, installationId, now),
    evalProjectionRisk(prisma, installationId, now),
    evalAnomaly(prisma, installationId, now),
    evalOffline(prisma, installationId, now),
  ]);

  const candidates: PendingAlert[] = [
    ...(highConsumption ? [highConsumption] : []),
    ...(deviceHigh ? [deviceHigh] : []),
    ...(projection ? [projection] : []),
    ...(anomaly ? [anomaly] : []),
    ...offline,
  ];

  const created: Alert[] = [];
  for (const c of candidates) {
    if (await isDuplicate(prisma, installationId, c.deviceId, c.type, now)) continue;

    const alert = await prisma.alert.create({
      data: {
        installationId,
        deviceId: c.deviceId,
        type: c.type,
        severity: c.severity,
        status: 'open',
        message: c.message,
        context: c.context as Prisma.InputJsonValue,
      },
    });
    created.push(alert);
  }

  return created;
}
