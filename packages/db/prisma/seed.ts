/**
 * Seed idempotente de @smartsense/db (tsx).
 *
 * Estructura:
 *  - CATÁLOGO GLOBAL (NO demo): device_categories, distributors, tariffs.
 *  - DEMO (is_demo=true): organización demo y TODO lo que cuelga de ella
 *    (user, membership, installation, profile, kit, devices, pairings, bill, alerts,
 *    recommendations). Alineado a apps/web/lib/fixtures/mock-data.ts.
 *
 * Idempotente: usa upsert / claves estables (UUID fijos + claves naturales). Reejecutable.
 * NO inventa datos "reales": todo lo demo está marcado bajo la org is_demo=true.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// UUIDs deterministas para entidades demo (permiten upsert idempotente por id).
const ID = {
  org: '00000000-0000-4000-8000-000000000001',
  user: '00000000-0000-4000-8000-000000000002',
  membership: '00000000-0000-4000-8000-000000000003',
  installation: '00000000-0000-4000-8000-000000000004',
  profile: '00000000-0000-4000-8000-000000000005',
  kit: '00000000-0000-4000-8000-000000000006',
  bill: '00000000-0000-4000-8000-000000000007',
  devRefri: '00000000-0000-4000-8000-000000000010',
  devLavadora: '00000000-0000-4000-8000-000000000011',
  devMicroondas: '00000000-0000-4000-8000-000000000012',
  devTv: '00000000-0000-4000-8000-000000000013',
  pairRefri: '00000000-0000-4000-8000-000000000020',
  pairLavadora: '00000000-0000-4000-8000-000000000021',
  pairMicroondas: '00000000-0000-4000-8000-000000000022',
  pairTv: '00000000-0000-4000-8000-000000000023',
  alertRefri: '00000000-0000-4000-8000-000000000030',
  alertLavado: '00000000-0000-4000-8000-000000000031',
  recRefri: '00000000-0000-4000-8000-000000000040',
  recLavado: '00000000-0000-4000-8000-000000000041',
} as const;

async function main() {
  const counts: Record<string, number> = {};

  // -----------------------------------------------------------------------------------
  // CATÁLOGO GLOBAL (sin tenant) — device_categories
  // Keys alineadas a firmaElectrica del demo + typical_power_w aproximada.
  // -----------------------------------------------------------------------------------
  const categories = [
    { key: 'refrigeracion', name: 'Refrigeración', icon: 'snowflake', typicalPowerW: '150.00' },
    { key: 'climatizacion', name: 'Climatización', icon: 'wind', typicalPowerW: '1200.00' },
    { key: 'iluminacion', name: 'Iluminación', icon: 'lightbulb', typicalPowerW: '60.00' },
    { key: 'electronica', name: 'Electrónica', icon: 'tv', typicalPowerW: '90.00' },
    { key: 'lavado', name: 'Lavado', icon: 'washing-machine', typicalPowerW: '500.00' },
  ];
  for (const c of categories) {
    await prisma.deviceCategory.upsert({
      where: { key: c.key },
      update: { name: c.name, icon: c.icon, typicalPowerW: c.typicalPowerW },
      create: c,
    });
  }
  counts.device_categories = categories.length;

  // -----------------------------------------------------------------------------------
  // CATÁLOGO GLOBAL — distributors (CGE, Enel)
  // -----------------------------------------------------------------------------------
  const cge = await prisma.distributor.upsert({
    where: { code: 'CGE' },
    update: { name: 'CGE', country: 'CL' },
    create: { name: 'CGE', country: 'CL', code: 'CGE' },
  });
  const enel = await prisma.distributor.upsert({
    where: { code: 'ENEL' },
    update: { name: 'Enel Distribución', country: 'CL' },
    create: { name: 'Enel Distribución', country: 'CL', code: 'ENEL' },
  });
  counts.distributors = 2;

  // -----------------------------------------------------------------------------------
  // CATÁLOGO GLOBAL — tariffs (BT-1 CGE 165 CLP/kWh del mock; BT-1A genérica Enel)
  // -----------------------------------------------------------------------------------
  const validFrom = new Date('2026-01-01T00:00:00.000Z');
  const tariffCge = await prisma.tariff.upsert({
    where: {
      distributorId_code_validFrom: {
        distributorId: cge.id,
        code: 'BT-1',
        validFrom,
      },
    },
    update: { name: 'BT-1 Residencial', energyPriceClpKwh: '165.0000', segment: 'home' },
    create: {
      distributorId: cge.id,
      code: 'BT-1',
      name: 'BT-1 Residencial',
      segment: 'home',
      energyPriceClpKwh: '165.0000',
      fixedChargeClp: 900n,
      validFrom,
    },
  });
  await prisma.tariff.upsert({
    where: {
      distributorId_code_validFrom: {
        distributorId: enel.id,
        code: 'BT-1A',
        validFrom,
      },
    },
    update: { name: 'BT-1A Residencial', energyPriceClpKwh: '158.5000', segment: 'home' },
    create: {
      distributorId: enel.id,
      code: 'BT-1A',
      name: 'BT-1A Residencial',
      segment: 'home',
      energyPriceClpKwh: '158.5000',
      fixedChargeClp: 850n,
      validFrom,
    },
  });
  counts.tariffs = 2;

  // ===================================================================================
  // DEMO (is_demo=true) — todo cuelga de la org demo
  // ===================================================================================

  // organization demo
  await prisma.organization.upsert({
    where: { id: ID.org },
    update: { name: 'DEMO — SmartSense', isDemo: true, plan: 'free', status: 'active' },
    create: {
      id: ID.org,
      name: 'DEMO — SmartSense',
      isDemo: true, // marca de datos demo
      plan: 'free',
      status: 'active',
      segmentDefault: 'home',
    },
  });
  counts.organizations_demo = 1;

  // user demo
  await prisma.user.upsert({
    where: { id: ID.user },
    update: { fullName: 'Demo SmartSense', status: 'active' },
    create: {
      id: ID.user,
      email: 'demo@smartsense.local',
      // Hash placeholder (no es credencial real de producción).
      passwordHash: '$2b$12$demodemodemodemodemodemodemodemodemodemodemodemodemodem',
      fullName: 'Demo SmartSense',
      locale: 'es-CL',
      status: 'active',
    },
  });
  counts.users_demo = 1;

  // membership owner
  await prisma.membership.upsert({
    where: { id: ID.membership },
    update: { role: 'owner', status: 'active' },
    create: {
      id: ID.membership,
      userId: ID.user,
      organizationId: ID.org,
      role: 'owner',
      status: 'active',
      acceptedAt: new Date(),
    },
  });
  counts.memberships_demo = 1;

  // installation demo (segment home, Coquimbo, CGE + BT-1)
  await prisma.installation.upsert({
    where: { id: ID.installation },
    update: { name: 'Hogar Demo (Coquimbo)', segment: 'home' },
    create: {
      id: ID.installation,
      organizationId: ID.org,
      name: 'Hogar Demo (Coquimbo)',
      segment: 'home',
      address: 'Coquimbo, Región de Coquimbo, Chile',
      timezone: 'America/Santiago',
      distributorId: cge.id,
      tariffId: tariffCge.id,
      status: 'active',
    },
  });
  counts.installations_demo = 1;

  // installation_profile (1:1)
  await prisma.installationProfile.upsert({
    where: { installationId: ID.installation },
    update: { segment: 'home', occupants: 3 },
    create: {
      id: ID.profile,
      installationId: ID.installation,
      segment: 'home',
      occupants: 3,
      heatingSystem: 'electric',
      declaredPowerKw: '4.40',
      criticalEquipment: ['refrigerador'] as unknown as Prisma.InputJsonValue,
      extra: { fuente: 'demo' } as Prisma.InputJsonValue,
    },
  });
  counts.installation_profiles_demo = 1;

  // energy_kit demo (status active)
  await prisma.energyKit.upsert({
    where: { id: ID.kit },
    update: { status: 'active', installationId: ID.installation },
    create: {
      id: ID.kit,
      installationId: ID.installation,
      qrCode: 'DEMO-QR-0001',
      serial: 'DEMO-KIT-0001',
      model: 'SmartSense Home Kit',
      firmwareVersion: '1.0.0-demo',
      status: 'active',
      claimedAt: new Date(),
    },
  });
  counts.energy_kits_demo = 1;

  // categorías resueltas para asociar a devices
  const refriCat = await prisma.deviceCategory.findUnique({ where: { key: 'refrigeracion' } });
  const lavadoCat = await prisma.deviceCategory.findUnique({ where: { key: 'lavado' } });
  const elecCat = await prisma.deviceCategory.findUnique({ where: { key: 'electronica' } });

  // 4 devices demo alineados a enchufes del mock (Refrigerador/Lavadora/Microondas/TV)
  const devices = [
    { id: ID.devRefri, name: 'Refrigerador', externalRef: 'enchuf-1', state: 'online', categoryId: refriCat?.id ?? null },
    { id: ID.devLavadora, name: 'Lavadora', externalRef: 'enchuf-2', state: 'online', categoryId: lavadoCat?.id ?? null },
    { id: ID.devMicroondas, name: 'Microondas', externalRef: 'enchuf-3', state: 'unknown', categoryId: elecCat?.id ?? null },
    { id: ID.devTv, name: 'TV + Streaming', externalRef: 'enchuf-4', state: 'online', categoryId: elecCat?.id ?? null },
  ] as const;
  for (const d of devices) {
    await prisma.device.upsert({
      where: { id: d.id },
      update: { name: d.name, state: d.state, categoryId: d.categoryId },
      create: {
        id: d.id,
        kitId: ID.kit,
        installationId: ID.installation,
        categoryId: d.categoryId,
        name: d.name,
        externalRef: d.externalRef,
        capabilities: { meter: true, switch: true } as Prisma.InputJsonValue,
        state: d.state,
        lastSeenAt: d.state === 'online' ? new Date() : null,
      },
    });
  }
  counts.devices_demo = devices.length;

  // device_pairings (uno por device)
  const pairings = [
    { id: ID.pairRefri, deviceId: ID.devRefri, ref: 'enchuf-1', status: 'paired' },
    { id: ID.pairLavadora, deviceId: ID.devLavadora, ref: 'enchuf-2', status: 'paired' },
    { id: ID.pairMicroondas, deviceId: ID.devMicroondas, ref: 'enchuf-3', status: 'scanning' },
    { id: ID.pairTv, deviceId: ID.devTv, ref: 'enchuf-4', status: 'paired' },
  ] as const;
  for (const p of pairings) {
    await prisma.devicePairing.upsert({
      where: { id: p.id },
      update: { status: p.status },
      create: {
        id: p.id,
        kitId: ID.kit,
        deviceExternalRef: p.ref,
        status: p.status,
        deviceId: p.deviceId,
      },
    });
  }
  counts.device_pairings_demo = pairings.length;

  // electricity_bill demo (1)
  await prisma.electricityBill.upsert({
    where: { id: ID.bill },
    update: { status: 'confirmed' },
    create: {
      id: ID.bill,
      installationId: ID.installation,
      distributorId: cge.id,
      tariffId: tariffCge.id,
      clientNumber: 'DEMO-000123',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-04-30'),
      consumptionKwh: '227.4000', // ~7.58 kWh/día * 30
      totalClp: 42500n, // proyección fin de mes del mock
      fixedChargeClp: 900n,
      variableChargeClp: 41600n,
      fileUrl: 'demo://bills/demo-2026-04.pdf',
      status: 'confirmed',
    },
  });
  counts.electricity_bills_demo = 1;

  // alerts demo (2) — alineadas al mock (Refrigerador +30%, mover lavado a horario valle)
  await prisma.alert.upsert({
    where: { id: ID.alertRefri },
    update: { status: 'open' },
    create: {
      id: ID.alertRefri,
      installationId: ID.installation,
      deviceId: ID.devRefri,
      type: 'high_device',
      severity: 'warning',
      status: 'open',
      message: 'El refrigerador consumió 30% más de lo esperado en las últimas 24h.',
      estimatedImpactClp: 150n,
      context: { delta_pct: 30 } as Prisma.InputJsonValue,
    },
  });
  await prisma.alert.upsert({
    where: { id: ID.alertLavado },
    update: { status: 'open' },
    create: {
      id: ID.alertLavado,
      installationId: ID.installation,
      deviceId: ID.devLavadora,
      type: 'anomaly',
      severity: 'info',
      status: 'open',
      message: 'Lavar entre 22:00 y 6:00 puede ahorrar hasta $4.200/mes.',
      estimatedImpactClp: 4200n,
      context: { ventana_valle: '22:00-06:00' } as Prisma.InputJsonValue,
    },
  });
  counts.alerts_demo = 2;

  // recommendations demo (2), una derivada de alerta (source='alert')
  await prisma.recommendation.upsert({
    where: { id: ID.recRefri },
    update: { status: 'new' },
    create: {
      id: ID.recRefri,
      installationId: ID.installation,
      alertId: ID.alertRefri,
      source: 'alert',
      title: 'Revisar sello del refrigerador',
      description: 'Verifica que la puerta cierre correctamente para reducir el sobreconsumo.',
      estimatedSavingClp: 150n,
      priority: 2,
      status: 'new',
    },
  });
  await prisma.recommendation.upsert({
    where: { id: ID.recLavado },
    update: { status: 'new' },
    create: {
      id: ID.recLavado,
      installationId: ID.installation,
      alertId: ID.alertLavado,
      source: 'alert',
      title: 'Mover lavado a horario valle',
      description: 'Programa la lavadora entre 22:00 y 6:00 para aprovechar tarifa más baja.',
      estimatedSavingClp: 4200n,
      priority: 1,
      status: 'new',
    },
  });
  counts.recommendations_demo = 2;

  // -----------------------------------------------------------------------------------
  // Resumen
  // -----------------------------------------------------------------------------------
  console.log('Seed completado. Filas insertadas/actualizadas (idempotente):');
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
