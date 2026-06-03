import type { PrismaClient } from '@smartsense/db';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { writeAudit } from '../../lib/audit.js';
import { Errors } from '../../lib/errors.js';
import type { DevicePairDto, KitClaimDto } from './onboarding.schemas.js';

/** Proyección saneada del kit para respuestas (no expone serial/firmware ni soft-delete). */
function publicKit(kit: {
  id: string;
  qrCode: string;
  status: string;
  installationId: string | null;
}) {
  return {
    id: kit.id,
    qrCode: kit.qrCode,
    status: kit.status,
    installationId: kit.installationId,
  };
}

/**
 * Escanea un kit por su QR. No exige tenant (el kit puede estar unclaimed),
 * pero solo devuelve campos no sensibles. 404 si no existe / está retirado.
 */
export async function scanKit(prisma: PrismaClient, qrCode: string) {
  const kit = await prisma.energyKit.findFirst({
    where: { qrCode, deletedAt: null },
    select: { id: true, qrCode: true, status: true, installationId: true },
  });
  if (!kit) throw Errors.notFound('Kit');
  return { kit: publicKit(kit) };
}

/**
 * Reclama un kit (resuelto por kitId o qrCode) para una instalación del usuario (rol manage).
 * Si el kit ya está `active` en OTRA instalación → 409 KIT_ALREADY_CLAIMED.
 * Setea installationId, status='active', claimedAt=now. Audita.
 */
export async function claimKit(prisma: PrismaClient, userId: string, dto: KitClaimDto) {
  const access = await assertInstallationAccess(
    prisma,
    userId,
    dto.installationId,
    ROLES.manage,
  );

  const kit = await prisma.energyKit.findFirst({
    where: {
      deletedAt: null,
      ...(dto.kitId ? { id: dto.kitId } : { qrCode: dto.qrCode }),
    },
  });
  if (!kit) throw Errors.notFound('Kit');

  if (kit.status === 'active' && kit.installationId && kit.installationId !== dto.installationId) {
    throw Errors.kitAlreadyClaimed();
  }

  const before = { status: kit.status, installationId: kit.installationId, claimedAt: kit.claimedAt };

  const updated = await prisma.energyKit.update({
    where: { id: kit.id },
    data: {
      installationId: dto.installationId,
      status: 'active',
      claimedAt: new Date(),
    },
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'kit.claim',
    entityType: 'energy_kit',
    entityId: updated.id,
    before,
    after: { status: updated.status, installationId: updated.installationId, claimedAt: updated.claimedAt },
  });

  return { kit: publicKit(updated) };
}

/**
 * Empareja N dispositivos contra un kit ya reclamado. Por cada device:
 *  - upsert lógico de device_pairing (kitId + deviceExternalRef) con status 'paired'
 *  - crea/actualiza el Device real (UNIQUE kitId+externalRef), con capabilities {meter:true}
 * Resuelve categoryId desde categoryKey si la categoría existe. Audita una vez. Sin IoT real.
 */
export async function pairDevices(prisma: PrismaClient, userId: string, dto: DevicePairDto) {
  const kit = await prisma.energyKit.findFirst({
    where: { id: dto.kitId, deletedAt: null },
    select: { id: true, installationId: true },
  });
  if (!kit) throw Errors.notFound('Kit');
  if (!kit.installationId) {
    throw Errors.conflict('KIT_NOT_CLAIMED', 'El kit no está reclamado por ninguna instalación');
  }

  const access = await assertInstallationAccess(
    prisma,
    userId,
    kit.installationId,
    ROLES.manage,
  );

  // Resolución de categorías (categoryKey → categoryId) en lote.
  const categoryKeys = [...new Set(dto.devices.map((d) => d.categoryKey).filter(Boolean) as string[])];
  const categories = categoryKeys.length
    ? await prisma.deviceCategory.findMany({
        where: { key: { in: categoryKeys } },
        select: { id: true, key: true },
      })
    : [];
  const categoryIdByKey = new Map(categories.map((c) => [c.key, c.id]));

  const pairings: unknown[] = [];
  const devices: unknown[] = [];

  for (const item of dto.devices) {
    const categoryId = item.categoryKey ? (categoryIdByKey.get(item.categoryKey) ?? null) : null;
    const name = item.name ?? item.externalRef;

    // Device real (UNIQUE kitId+externalRef): upsert manual (no hay índice compuesto declarado
    // para upsert directo de pairing, así que se replica el patrón findFirst/create/update).
    const existingDevice = await prisma.device.findFirst({
      where: { kitId: kit.id, externalRef: item.externalRef },
    });
    const device = existingDevice
      ? await prisma.device.update({
          where: { id: existingDevice.id },
          data: {
            name,
            categoryId,
            installationId: kit.installationId,
            capabilities: { meter: true },
          },
        })
      : await prisma.device.create({
          data: {
            kitId: kit.id,
            installationId: kit.installationId,
            categoryId,
            name,
            externalRef: item.externalRef,
            capabilities: { meter: true },
          },
        });

    // device_pairing: el schema NO tiene UNIQUE(kitId, deviceExternalRef), así que se hace
    // findFirst + create/update para emular el upsert.
    const existingPairing = await prisma.devicePairing.findFirst({
      where: { kitId: kit.id, deviceExternalRef: item.externalRef },
    });
    const pairing = existingPairing
      ? await prisma.devicePairing.update({
          where: { id: existingPairing.id },
          data: { status: 'paired', deviceId: device.id },
        })
      : await prisma.devicePairing.create({
          data: {
            kitId: kit.id,
            deviceExternalRef: item.externalRef,
            status: 'paired',
            deviceId: device.id,
          },
        });

    pairings.push(pairing);
    devices.push(device);
  }

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'device.pair',
    entityType: 'energy_kit',
    entityId: kit.id,
    after: { kitId: kit.id, count: dto.devices.length },
  });

  return { pairings, devices };
}

/**
 * Estado de avance del onboarding de una instalación (rol read).
 * - hasKit / kitStatus: kit reclamado por la instalación (no borrado).
 * - devicesPaired: device_pairings con status 'paired' de kits de la instalación.
 * - devicesCount: devices reales de la instalación.
 * - profileComplete: existe installation_profile.
 */
export async function getStatus(prisma: PrismaClient, userId: string, installationId: string) {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const kit = await prisma.energyKit.findFirst({
    where: { installationId, deletedAt: null },
    orderBy: { claimedAt: 'desc' },
    select: { id: true, status: true },
  });

  const kitIds = await prisma.energyKit.findMany({
    where: { installationId, deletedAt: null },
    select: { id: true },
  });

  const devicesPaired = kitIds.length
    ? await prisma.devicePairing.count({
        where: { kitId: { in: kitIds.map((k) => k.id) }, status: 'paired' },
      })
    : 0;

  const devicesCount = await prisma.device.count({
    where: { installationId, deletedAt: null },
  });

  const profile = await prisma.installationProfile.findUnique({
    where: { installationId },
    select: { id: true },
  });

  return {
    hasKit: Boolean(kit),
    kitStatus: kit?.status ?? null,
    devicesPaired,
    devicesCount,
    profileComplete: Boolean(profile),
  };
}
