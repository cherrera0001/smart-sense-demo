import type { PrismaClient } from '@smartsense/db';
import {
  ROLES,
  assertInstallationAccess,
  assertOrgAccess,
  getActiveMemberships,
} from '../../lib/access.js';
import { writeAudit } from '../../lib/audit.js';
import type { CreateInstallationDto, PatchInstallationDto } from './installations.schemas.js';

/** Lista las instalaciones (no borradas) de todas las orgs donde el usuario es miembro activo. */
export async function listInstallations(prisma: PrismaClient, userId: string) {
  const memberships = await getActiveMemberships(prisma, userId);
  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) return [];

  return prisma.installation.findMany({
    where: { organizationId: { in: orgIds }, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Crea una instalación bajo una org del usuario (rol manage). Si viene `profile`,
 * crea el installation_profile 1:1 con el mismo segment. Audita y devuelve la instalación.
 */
export async function createInstallation(
  prisma: PrismaClient,
  userId: string,
  dto: CreateInstallationDto,
) {
  await assertOrgAccess(prisma, userId, dto.organizationId, ROLES.manage);

  const installation = await prisma.installation.create({
    data: {
      organizationId: dto.organizationId,
      name: dto.name,
      segment: dto.segment,
      address: dto.address ?? null,
      timezone: dto.timezone,
      ...(dto.profile
        ? {
            profile: {
              create: {
                segment: dto.segment,
                occupants: dto.profile.occupants ?? null,
                heatingSystem: dto.profile.heatingSystem ?? null,
                criticalEquipment: (dto.profile.criticalEquipment ?? undefined) as object | undefined,
                declaredPowerKw: dto.profile.declaredPowerKw ?? null,
                operatingHours: (dto.profile.operatingHours ?? undefined) as object | undefined,
                extra: (dto.profile.extra ?? undefined) as object | undefined,
              },
            },
          }
        : {}),
    },
    include: { profile: true },
  });

  await writeAudit(prisma, {
    organizationId: installation.organizationId,
    userId,
    action: 'installation.create',
    entityType: 'installation',
    entityId: installation.id,
    after: installation,
  });

  return installation;
}

/** Obtiene una instalación (con perfil) tras validar acceso de lectura. */
export async function getInstallation(prisma: PrismaClient, userId: string, id: string) {
  await assertInstallationAccess(prisma, userId, id, ROLES.read);

  return prisma.installation.findFirst({
    where: { id, deletedAt: null },
    include: { profile: true },
  });
}

/**
 * Actualiza campos permitidos de una instalación (rol operate). Nunca cambia organizationId.
 * Audita before/after y devuelve la instalación actualizada.
 */
export async function updateInstallation(
  prisma: PrismaClient,
  userId: string,
  id: string,
  dto: PatchInstallationDto,
) {
  const access = await assertInstallationAccess(prisma, userId, id, ROLES.operate);

  const before = await prisma.installation.findFirst({
    where: { id, deletedAt: null },
    include: { profile: true },
  });

  const data: Record<string, unknown> = {};
  if (dto.name !== undefined) data.name = dto.name;
  if (dto.address !== undefined) data.address = dto.address;
  if (dto.timezone !== undefined) data.timezone = dto.timezone;
  if (dto.status !== undefined) data.status = dto.status;
  if (dto.distributorId !== undefined) data.distributorId = dto.distributorId;
  if (dto.tariffId !== undefined) data.tariffId = dto.tariffId;

  const updated = await prisma.installation.update({
    where: { id },
    data,
    include: { profile: true },
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'installation.update',
    entityType: 'installation',
    entityId: id,
    before,
    after: updated,
  });

  return updated;
}
