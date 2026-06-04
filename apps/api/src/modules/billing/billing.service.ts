/**
 * BillingService (Fase 4) — resolución de tarifa y cálculo de costo energético.
 * Funciones puras `(prisma, ...args)`. Sin Fastify.
 *
 * REGLA DURA (BR-030/BR-031): el costo monetario se calcula SIEMPRE en backend y
 * NUNCA se inventa. Sin tarifa válida → `costClp = null`, `estimated = false`,
 * `basis = 'none'`. El frontend solo renderiza el valor ya calculado.
 *
 * LIMITACIÓN documentada (Fase posterior): este servicio aplica únicamente el
 * cargo por energía (`energy_price_clp_kwh`). NO suma cargo fijo
 * (`fixed_charge_clp`), cargo por demanda (`demand_charge_clp_kw`) ni esquemas
 * punta/valle. Esos componentes se incorporarán en una fase posterior de billing.
 */
import type { PrismaClient, Tariff } from '@smartsense/db';
import type { CostEstimate, SeriesCostEstimate } from './billing.schemas.js';

/**
 * Resuelve la tarifa efectiva de una instalación:
 *  1. Si `installation.tariffId` está seteado → esa tarifa.
 *  2. Si no, la tarifa (`tariffId`) de la boleta `confirmed` más reciente de la
 *     instalación.
 *  3. Si nada aplica → `null` (no se inventa tarifa).
 */
export async function getEffectiveTariffForInstallation(
  prisma: PrismaClient,
  installationId: string,
): Promise<Tariff | null> {
  const installation = await prisma.installation.findFirst({
    where: { id: installationId, deletedAt: null },
    select: { tariffId: true },
  });
  if (!installation) return null;

  // 1) Tarifa explícita de la instalación.
  if (installation.tariffId) {
    const tariff = await prisma.tariff.findUnique({ where: { id: installation.tariffId } });
    if (tariff) return tariff;
  }

  // 2) Tarifa de la última boleta confirmada con tariffId.
  const bill = await prisma.electricityBill.findFirst({
    where: { installationId, status: 'confirmed', tariffId: { not: null } },
    orderBy: { periodEnd: 'desc' },
    select: { tariffId: true },
  });
  if (bill?.tariffId) {
    const tariff = await prisma.tariff.findUnique({ where: { id: bill.tariffId } });
    if (tariff) return tariff;
  }

  // 3) Sin base de cálculo.
  return null;
}

/** Costo CLP a partir de un Decimal de precio y kWh. Entero (Math.round). */
function applyEnergyPrice(energyKwh: number, energyPriceClpKwh: number): number {
  return Math.round(energyKwh * energyPriceClpKwh);
}

/**
 * Estima el costo CLP de un consumo puntual (kWh) para una instalación.
 * Sin tarifa/precio aplicable → `{ costClp: null, estimated: false, basis: 'none' }`.
 * `energyKwh = 0` con tarifa válida → `{ costClp: 0, estimated: true }` (no falla).
 */
export async function estimateEnergyCostClp(
  prisma: PrismaClient,
  installationId: string,
  energyKwh: number,
): Promise<CostEstimate> {
  const tariff = await getEffectiveTariffForInstallation(prisma, installationId);
  if (!tariff || tariff.energyPriceClpKwh == null) {
    return { costClp: null, estimated: false, basis: 'none' };
  }

  const price = Number(tariff.energyPriceClpKwh);
  const costClp = applyEnergyPrice(energyKwh, price);
  return { costClp, estimated: true, basis: 'tariff', tariffCode: tariff.code };
}

/**
 * Estima el costo de una serie de puntos. Resuelve la tarifa UNA sola vez y la
 * aplica a cada punto. Sin tarifa → todos los `costClp` y el total quedan en
 * `null` (no se inventa). El total es la suma de los costos (entero CLP).
 */
export async function estimateSeriesCostClp(
  prisma: PrismaClient,
  installationId: string,
  points: { energyKwh: number }[],
): Promise<SeriesCostEstimate> {
  const tariff = await getEffectiveTariffForInstallation(prisma, installationId);

  if (!tariff || tariff.energyPriceClpKwh == null) {
    return {
      points: points.map((p) => ({ energyKwh: p.energyKwh, costClp: null })),
      totalCostClp: null,
      estimated: false,
      basis: 'none',
    };
  }

  const price = Number(tariff.energyPriceClpKwh);
  let total = 0;
  const resolved = points.map((p) => {
    const costClp = applyEnergyPrice(p.energyKwh, price);
    total += costClp;
    return { energyKwh: p.energyKwh, costClp };
  });

  return {
    points: resolved,
    totalCostClp: total,
    estimated: true,
    basis: 'tariff',
    tariffCode: tariff.code,
  };
}
