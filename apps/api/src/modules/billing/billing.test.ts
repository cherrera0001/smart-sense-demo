/**
 * Tests de BillingService (Fase 4) contra la DB real (Neon dev).
 * No usa makeTestApp: el servicio es puro (prisma, ...). Crea su propio tenant
 * mínimo (org + membership owner) y usa energy-fixtures para tarifas/instalaciones.
 *
 * Invariante central (BR-031): sin tarifa/boleta NO se genera costo monetario.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@smartsense/db';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import {
  createInstallationForUser,
  createDemoTariff,
  linkTariff,
} from '../../../tests/helpers/energy-fixtures.js';
import {
  estimateEnergyCostClp,
  estimateSeriesCostClp,
  getEffectiveTariffForInstallation,
} from './billing.service.js';

let organizationId: string;

/** Crea una organización aislada para el test (sin auth HTTP; servicio puro). */
async function createOrg(): Promise<string> {
  const org = await prisma.organization.create({
    data: { name: `BillingOrg ${randomUUID()}` },
  });
  return org.id;
}

beforeAll(async () => {
  await assertDbReady();
  organizationId = await createOrg();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('getEffectiveTariffForInstallation', () => {
  it('retorna null sin tarifa ni boleta confirmada', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await getEffectiveTariffForInstallation(prisma, inst.id);
    expect(tariff).toBeNull();
  });

  it('usa la tarifa explícita de la instalación', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 200 });
    await linkTariff(prisma, inst.id, tariff.id);

    const resolved = await getEffectiveTariffForInstallation(prisma, inst.id);
    expect(resolved?.id).toBe(tariff.id);
    expect(Number(resolved?.energyPriceClpKwh)).toBe(200);
  });

  it('usa la tarifa de la boleta confirmada más reciente cuando la instalación no tiene tarifa', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const oldTariff = await createDemoTariff(prisma, { energyPriceClpKwh: 100 });
    const newTariff = await createDemoTariff(prisma, { energyPriceClpKwh: 180 });

    const baseBill = {
      installationId: inst.id,
      periodStart: new Date('2026-01-01'),
      consumptionKwh: new Prisma.Decimal(300),
      totalClp: 45000n,
      fileUrl: 'https://storage.local/bill.pdf',
      status: 'confirmed' as const,
    };
    await prisma.electricityBill.create({
      data: { ...baseBill, periodEnd: new Date('2026-01-31'), tariffId: oldTariff.id },
    });
    await prisma.electricityBill.create({
      data: {
        ...baseBill,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
        tariffId: newTariff.id,
      },
    });

    const resolved = await getEffectiveTariffForInstallation(prisma, inst.id);
    expect(resolved?.id).toBe(newTariff.id);
  });

  it('ignora boletas no confirmadas (uploaded/parsed)', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 150 });
    await prisma.electricityBill.create({
      data: {
        installationId: inst.id,
        tariffId: tariff.id,
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-03-31'),
        consumptionKwh: new Prisma.Decimal(200),
        totalClp: 30000n,
        fileUrl: 'https://storage.local/bill.pdf',
        status: 'parsed',
      },
    });

    const resolved = await getEffectiveTariffForInstallation(prisma, inst.id);
    expect(resolved).toBeNull();
  });
});

describe('estimateEnergyCostClp', () => {
  it('retorna null/no-estimado sin tarifa (NO inventa costo)', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const est = await estimateEnergyCostClp(prisma, inst.id, 123.4);
    expect(est).toEqual({ costClp: null, estimated: false, basis: 'none' });
  });

  it('calcula costo simple con tarifa válida (kWh * precio, redondeado)', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, inst.id, tariff.id);

    const est = await estimateEnergyCostClp(prisma, inst.id, 10); // 10 * 165 = 1650
    expect(est.costClp).toBe(1650);
    expect(est.estimated).toBe(true);
    expect(est.basis).toBe('tariff');
    expect(est.tariffCode).toBe(tariff.code);
  });

  it('redondea a entero CLP (Math.round)', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165.5 });
    await linkTariff(prisma, inst.id, tariff.id);

    // 3.333 * 165.5 = 551.6115 → 552
    const est = await estimateEnergyCostClp(prisma, inst.id, 3.333);
    expect(est.costClp).toBe(Math.round(3.333 * 165.5));
    expect(Number.isInteger(est.costClp)).toBe(true);
  });

  it('energyKwh=0 con tarifa → costClp 0, estimated true (no falla)', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, inst.id, tariff.id);

    const est = await estimateEnergyCostClp(prisma, inst.id, 0);
    expect(est.costClp).toBe(0);
    expect(est.estimated).toBe(true);
    expect(est.basis).toBe('tariff');
  });
});

describe('estimateSeriesCostClp', () => {
  it('serie consistente: total == suma de costClp con tarifa válida', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, inst.id, tariff.id);

    const points = [{ energyKwh: 1 }, { energyKwh: 2.5 }, { energyKwh: 0 }, { energyKwh: 4 }];
    const res = await estimateSeriesCostClp(prisma, inst.id, points);

    expect(res.estimated).toBe(true);
    expect(res.basis).toBe('tariff');
    expect(res.points).toHaveLength(4);
    const sum = res.points.reduce((acc, p) => acc + (p.costClp ?? 0), 0);
    expect(res.totalCostClp).toBe(sum);
    expect(res.points[0].costClp).toBe(165);
    expect(res.points[1].costClp).toBe(Math.round(2.5 * 165));
    expect(res.points[2].costClp).toBe(0);
  });

  it('sin tarifa: todos los costClp y el total quedan null (NO inventa)', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const points = [{ energyKwh: 1 }, { energyKwh: 2 }];
    const res = await estimateSeriesCostClp(prisma, inst.id, points);

    expect(res.estimated).toBe(false);
    expect(res.basis).toBe('none');
    expect(res.totalCostClp).toBeNull();
    expect(res.points.every((p) => p.costClp === null)).toBe(true);
    expect(res.points.map((p) => p.energyKwh)).toEqual([1, 2]);
  });

  it('serie vacía con tarifa → total 0, estimated true', async () => {
    const inst = await createInstallationForUser(prisma, organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, inst.id, tariff.id);

    const res = await estimateSeriesCostClp(prisma, inst.id, []);
    expect(res.points).toHaveLength(0);
    expect(res.totalCostClp).toBe(0);
    expect(res.estimated).toBe(true);
  });
});
