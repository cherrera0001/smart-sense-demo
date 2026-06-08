import type { PrismaClient } from '@smartsense/db';
import {
  ROLES,
  assertDeviceAccess,
  assertInstallationAccess,
} from '../../lib/access.js';
import { writeAudit } from '../../lib/audit.js';
import { Errors } from '../../lib/errors.js';
import type { CreateDeviceDto, PatchDeviceDto } from './devices.schemas.js';

/** Lista los devices (no borrados) de una instalación tras validar acceso de lectura. */
export async function listDevices(prisma: PrismaClient, userId: string, installationId: string) {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  return prisma.device.findMany({
    where: { installationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Crea un device dentro de un kit/instalación. Valida:
 * - acceso manage sobre la instalación (cubre cross-tenant),
 * - kit existe, pertenece a la instalación y no está retired,
 * - categoryKey (si viene) se resuelve a categoryId.
 * UNIQUE(kitId, externalRef) → P2002 (409) lo mapea el error-handler.
 */
export async function createDevice(prisma: PrismaClient, userId: string, dto: CreateDeviceDto) {
  const access = await assertInstallationAccess(prisma, userId, dto.installationId, ROLES.manage);

  const kit = await prisma.energyKit.findFirst({
    where: { id: dto.kitId, deletedAt: null },
    select: { id: true, installationId: true, status: true },
  });
  if (!kit) throw Errors.notFound('Kit');
  if (kit.installationId !== dto.installationId) {
    throw Errors.conflict('KIT_INSTALLATION_MISMATCH', 'El kit no pertenece a esta instalación');
  }
  if (kit.status === 'retired') {
    throw Errors.conflict('KIT_RETIRED', 'El kit está retirado');
  }

  let categoryId = dto.categoryId ?? null;
  if (!categoryId && dto.categoryKey) {
    const category = await prisma.deviceCategory.findUnique({
      where: { key: dto.categoryKey },
      select: { id: true },
    });
    if (!category) throw Errors.notFound('Categoría');
    categoryId = category.id;
  }

  const device = await prisma.device.create({
    data: {
      kitId: dto.kitId,
      installationId: dto.installationId,
      categoryId,
      name: dto.name,
      externalRef: dto.externalRef,
      capabilities: (dto.capabilities ?? {}) as object,
    },
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'device.create',
    entityType: 'device',
    entityId: device.id,
    after: device,
  });

  return device;
}

/** Obtiene un device tras validar acceso de lectura. */
export async function getDevice(prisma: PrismaClient, userId: string, id: string) {
  await assertDeviceAccess(prisma, userId, id, ROLES.read);

  return prisma.device.findFirst({
    where: { id, deletedAt: null },
  });
}

/**
 * Actualiza campos permitidos de un device (rol operate). No cambia kitId/installationId.
 * Audita before/after y devuelve el device actualizado.
 */
export async function updateDevice(
  prisma: PrismaClient,
  userId: string,
  id: string,
  dto: PatchDeviceDto,
) {
  const access = await assertDeviceAccess(prisma, userId, id, ROLES.operate);

  const before = await prisma.device.findFirst({ where: { id, deletedAt: null } });

  const data: Record<string, unknown> = {};
  if (dto.name !== undefined) data.name = dto.name;
  if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
  if (dto.state !== undefined) data.state = dto.state;
  if (dto.capabilities !== undefined) data.capabilities = dto.capabilities as object;

  const updated = await prisma.device.update({ where: { id }, data });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'device.update',
    entityType: 'device',
    entityId: id,
    before,
    after: updated,
  });

  return updated;
}
