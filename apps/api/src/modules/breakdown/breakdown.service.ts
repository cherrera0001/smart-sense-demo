/**
 * Servicio de breakdown (desglose de consumo) — Fase 4.
 * Funciones puras (prisma, userId, installationId, query). Sin Fastify.
 *
 * Responde: ¿en qué se va la energía de una instalación en un periodo, agrupada
 * por device o por categoría? Sin NILM avanzado ni inferencia de dispositivos no
 * medidos: SOLO se desglosa lo que está realmente medido (agregados o telemetría).
 *
 * DECISIONES DOCUMENTADAS:
 *  - RANGO POR DEFECTO: si el query no trae from/to → últimos 7 días [now-7d, now].
 *    7d es una ventana corta y representativa para una vista de desglose (consistente
 *    con dashboards semanales); el cliente puede ampliar pasando from/to explícitos.
 *  - FUENTE DE ENERGÍA: se prefiere `energy_aggregates` en el rango (SUM(energy_kwh)
 *    agrupando por deviceId | categoryId). Si NO hay agregados en el rango, se deriva
 *    de `telemetry_readings` (SUM(energy_wh_delta)/1000), mapeando device→categoryId
 *    cuando group_by='category'. data_status refleja qué fuente y cobertura se usó.
 *  - INCLUSIÓN DE DEVICES/CATEGORÍAS: solo se incluyen items CON energía medida en el
 *    rango. NO se listan devices con 0 (no se inventa consumo ni se rellena con ceros);
 *    un device sin mediciones simplemente no aparece. Si NADA tiene energía → items: [].
 *  - COSTO: cost_clp por item y total vía BillingService (estimateEnergyCostClp). Sin
 *    tarifa válida → null (BR-031: el backend nunca inventa costo).
 */
import { Prisma, type PrismaClient } from '@smartsense/db';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { estimateEnergyCostClp } from '../billing/billing.service.js';
import type {
  BreakdownQuery,
  BreakdownResponse,
  BreakdownGroupBy,
  BreakdownItem,
  BreakdownDataStatus,
} from './breakdown.schemas.js';

/** Ventana por defecto del desglose (ms): 7 días. */
const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

const UNCATEGORIZED_ID = 'uncategorized';
const UNCATEGORIZED_NAME = 'Sin categoría';

/** Redondea a 1 decimal (porcentajes). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Decimal | number | null → number. */
function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

/** Resultado intermedio: energía por grupo (id+meta), sin %/costo aún. */
interface GroupEnergy {
  id: string;
  name: string;
  category: string | null;
  energyKwh: number;
}

/**
 * Resuelve la ventana [from, to]. Default = últimos 7 días.
 * Devuelve también los ISO strings para la respuesta.
 */
function resolveRange(query: BreakdownQuery): { from: Date; to: Date; fromIso: string; toIso: string } {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - DEFAULT_RANGE_MS);
  return { from, to, fromIso: from.toISOString(), toIso: to.toISOString() };
}

/**
 * Energía por device|category desde energy_aggregates en el rango.
 * Devuelve un Map<groupKey, energyKwh> (groupKey = deviceId | categoryId | 'uncategorized').
 * `null` si no hay NINGÚN agregado en el rango (señal para hacer fallback a telemetría).
 */
async function energyFromAggregates(
  prisma: PrismaClient,
  installationId: string,
  groupBy: BreakdownGroupBy,
  from: Date,
  to: Date,
): Promise<Map<string, number> | null> {
  const rows = await prisma.energyAggregate.findMany({
    where: { installationId, bucketStart: { gte: from, lte: to } },
    select: { deviceId: true, categoryId: true, energyKwh: true },
  });
  if (rows.length === 0) return null;

  const map = new Map<string, number>();
  for (const r of rows) {
    const key =
      groupBy === 'device'
        ? r.deviceId
        : (r.categoryId ?? UNCATEGORIZED_ID);
    // En agregados por device, deviceId puede ser null (rollup de instalación):
    // esos no aportan a un desglose por device → se ignoran.
    if (groupBy === 'device' && key == null) continue;
    map.set(key as string, (map.get(key as string) ?? 0) + toNum(r.energyKwh));
  }
  return map;
}

/**
 * Fallback: energía por device desde telemetry_readings (SUM(energy_wh_delta)/1000)
 * en el rango. Devuelve Map<deviceId, energyKwh> (solo devices con energía > 0 medida).
 */
async function energyFromTelemetryByDevice(
  prisma: PrismaClient,
  installationId: string,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const grouped = await prisma.telemetryReading.groupBy({
    by: ['deviceId'],
    where: {
      installationId,
      sourceTimestamp: { gte: from, lte: to },
      energyWhDelta: { not: null },
    },
    _sum: { energyWhDelta: true },
  });

  const map = new Map<string, number>();
  for (const g of grouped) {
    const wh = toNum(g._sum.energyWhDelta);
    if (wh <= 0) continue;
    map.set(g.deviceId, wh / 1000);
  }
  return map;
}

/**
 * Calcula el breakdown de una instalación.
 * Lectura → assertInstallationAccess(read). No produce side-effects.
 */
export async function getBreakdown(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
  query: BreakdownQuery,
): Promise<BreakdownResponse> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const groupBy: BreakdownGroupBy = query.group_by ?? 'device';
  const { from, to, fromIso, toIso } = resolveRange(query);

  // --- 1) Resolver energía por grupo (agregados → fallback telemetría) ---
  let groups: GroupEnergy[];
  let usedFallback = false;

  const aggMap = await energyFromAggregates(prisma, installationId, groupBy, from, to);

  if (aggMap && aggMap.size > 0) {
    groups = await resolveGroupMeta(prisma, installationId, groupBy, aggMap);
  } else {
    usedFallback = true;
    // Telemetría siempre se agrupa por device; para 'category' mapeamos device→categoryId.
    const telByDevice = await energyFromTelemetryByDevice(prisma, installationId, from, to);
    if (groupBy === 'device') {
      groups = await resolveGroupMeta(prisma, installationId, 'device', telByDevice);
    } else {
      groups = await deviceMapToCategoryGroups(prisma, installationId, telByDevice);
    }
  }

  // Solo items con energía > 0 (no se inventan devices ni se rellena con ceros).
  groups = groups.filter((g) => g.energyKwh > 0);

  const totalEnergyKwh = groups.reduce((acc, g) => acc + g.energyKwh, 0);

  // --- 2) Costo por item + total (BillingService; null sin tarifa) ---
  const items: BreakdownItem[] = [];
  for (const g of groups) {
    const cost = await estimateEnergyCostClp(prisma, installationId, g.energyKwh);
    items.push({
      id: g.id,
      name: g.name,
      category: g.category,
      energy_kwh: g.energyKwh,
      cost_clp: cost.costClp,
      percentage: totalEnergyKwh > 0 ? round1((g.energyKwh / totalEnergyKwh) * 100) : 0,
    });
  }

  // Total de costo: estimación única sobre el total de energía (consistente con el resto).
  const totalCost = await estimateEnergyCostClp(prisma, installationId, totalEnergyKwh);

  // Orden descendente por energía (mayor consumo primero).
  items.sort((a, b) => b.energy_kwh - a.energy_kwh);

  // --- 3) data_status ---
  const dataStatus = computeDataStatus(totalEnergyKwh, items.length, aggMap != null, usedFallback);

  return {
    installation_id: installationId,
    from: fromIso,
    to: toIso,
    group_by: groupBy,
    items,
    total_energy_kwh: totalEnergyKwh,
    total_cost_clp: items.length > 0 ? totalCost.costClp : null,
    data_status: dataStatus,
  };
}

/**
 * Enriquece un Map<id, energyKwh> con nombre/categoría según la dimensión.
 *  - device: id=deviceId, name=device.name, category=nombre de su device_category | null.
 *  - category: id=categoryId | 'uncategorized', name=category.name | 'Sin categoría',
 *    category=mismo nombre.
 */
async function resolveGroupMeta(
  prisma: PrismaClient,
  installationId: string,
  groupBy: BreakdownGroupBy,
  energyMap: Map<string, number>,
): Promise<GroupEnergy[]> {
  if (energyMap.size === 0) return [];

  if (groupBy === 'device') {
    const deviceIds = [...energyMap.keys()];
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds }, installationId },
      select: { id: true, name: true, category: { select: { name: true } } },
    });
    const byId = new Map(devices.map((d) => [d.id, d]));
    return deviceIds.map((id) => {
      const d = byId.get(id);
      return {
        id,
        name: d?.name ?? id,
        category: d?.category?.name ?? null,
        energyKwh: energyMap.get(id) ?? 0,
      };
    });
  }

  // group_by === 'category'
  const categoryIds = [...energyMap.keys()].filter((k) => k !== UNCATEGORIZED_ID);
  const categories =
    categoryIds.length > 0
      ? await prisma.deviceCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
  const byId = new Map(categories.map((c) => [c.id, c]));

  return [...energyMap.keys()].map((key) => {
    if (key === UNCATEGORIZED_ID) {
      return {
        id: UNCATEGORIZED_ID,
        name: UNCATEGORIZED_NAME,
        category: UNCATEGORIZED_NAME,
        energyKwh: energyMap.get(key) ?? 0,
      };
    }
    const c = byId.get(key);
    const name = c?.name ?? UNCATEGORIZED_NAME;
    return { id: key, name, category: name, energyKwh: energyMap.get(key) ?? 0 };
  });
}

/**
 * Mapea energía por device (fallback telemetría) a grupos por categoría:
 * resuelve categoryId de cada device y suma. Devices sin categoría → 'uncategorized'.
 */
async function deviceMapToCategoryGroups(
  prisma: PrismaClient,
  installationId: string,
  telByDevice: Map<string, number>,
): Promise<GroupEnergy[]> {
  if (telByDevice.size === 0) return [];

  const deviceIds = [...telByDevice.keys()];
  const devices = await prisma.device.findMany({
    where: { id: { in: deviceIds }, installationId },
    select: { id: true, categoryId: true, category: { select: { id: true, name: true } } },
  });
  const devById = new Map(devices.map((d) => [d.id, d]));

  // Acumular energía por categoría.
  const byCat = new Map<string, number>();
  for (const [deviceId, kwh] of telByDevice) {
    const d = devById.get(deviceId);
    const catId = d?.categoryId ?? UNCATEGORIZED_ID;
    byCat.set(catId, (byCat.get(catId) ?? 0) + kwh);
  }

  // Nombres de categoría.
  const catName = new Map<string, string>();
  for (const d of devices) {
    if (d.category) catName.set(d.category.id, d.category.name);
  }

  return [...byCat.entries()].map(([catId, kwh]) => {
    if (catId === UNCATEGORIZED_ID) {
      return {
        id: UNCATEGORIZED_ID,
        name: UNCATEGORIZED_NAME,
        category: UNCATEGORIZED_NAME,
        energyKwh: kwh,
      };
    }
    const name = catName.get(catId) ?? UNCATEGORIZED_NAME;
    return { id: catId, name, category: name, energyKwh: kwh };
  });
}

/**
 * Criterio simple de data_status:
 *  - 'empty'    → sin energía / sin items.
 *  - 'partial'  → hubo que derivar de telemetría cruda (no había agregados precomputados);
 *                 la cobertura es best-effort y puede no cubrir todo el periodo.
 *  - 'complete' → la energía provino de energy_aggregates (capa precomputada/consolidada).
 */
function computeDataStatus(
  totalEnergyKwh: number,
  itemCount: number,
  hadAggregates: boolean,
  usedFallback: boolean,
): BreakdownDataStatus {
  if (totalEnergyKwh <= 0 || itemCount === 0) return 'empty';
  if (usedFallback || !hadAggregates) return 'partial';
  return 'complete';
}
