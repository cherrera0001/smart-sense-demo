/**
 * Control de acceso multi-tenant + RBAC. Toda lectura/escritura de recursos de tenant
 * DEBE pasar por estos helpers. Invariante: ninguna query cruza `organization_id` (canon).
 */
import type { PrismaClient } from '@smartsense/db';
import { Errors } from './errors.js';

export type Role = 'owner' | 'admin' | 'operator' | 'viewer';

export const ROLES = {
  manage: ['owner', 'admin'] as Role[], // crear/borrar recursos, gestionar miembros
  operate: ['owner', 'admin', 'operator'] as Role[], // operar (incl. mutaciones de control en fases futuras)
  read: ['owner', 'admin', 'operator', 'viewer'] as Role[],
};

export interface OrgAccess {
  organizationId: string;
  role: Role;
}

/** Organizaciones donde el usuario tiene membership activo. */
export async function getActiveMemberships(prisma: PrismaClient, userId: string): Promise<OrgAccess[]> {
  const ms = await prisma.membership.findMany({
    where: { userId, status: 'active' },
    select: { organizationId: true, role: true },
  });
  return ms.map((m) => ({ organizationId: m.organizationId, role: m.role as Role }));
}

/** Exige membership activo en la org; opcionalmente con rol permitido. Lanza 403 si no. */
export async function assertOrgAccess(
  prisma: PrismaClient,
  userId: string,
  organizationId: string,
  allowed?: Role[],
): Promise<OrgAccess> {
  const m = await prisma.membership.findFirst({
    where: { userId, organizationId, status: 'active' },
    select: { role: true },
  });
  if (!m) throw Errors.crossTenant();
  const role = m.role as Role;
  if (allowed && !allowed.includes(role)) {
    throw Errors.forbidden(`Acción requiere rol: ${allowed.join(' | ')}`);
  }
  return { organizationId, role };
}

/** Resuelve la org de la instalación y exige acceso. Lanza 404 si no existe, 403 si cross-tenant. */
export async function assertInstallationAccess(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
  allowed?: Role[],
): Promise<{ installationId: string; organizationId: string; role: Role }> {
  const inst = await prisma.installation.findFirst({
    where: { id: installationId, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!inst) throw Errors.notFound('Instalación');
  const acc = await assertOrgAccess(prisma, userId, inst.organizationId, allowed);
  return { installationId, organizationId: inst.organizationId, role: acc.role };
}

/** Resuelve la instalación/org de un device y exige acceso. */
export async function assertDeviceAccess(
  prisma: PrismaClient,
  userId: string,
  deviceId: string,
  allowed?: Role[],
): Promise<{ deviceId: string; installationId: string; organizationId: string; role: Role }> {
  const device = await prisma.device.findFirst({
    where: { id: deviceId, deletedAt: null },
    select: { id: true, installationId: true },
  });
  if (!device) throw Errors.notFound('Dispositivo');
  const acc = await assertInstallationAccess(prisma, userId, device.installationId, allowed);
  return { deviceId, installationId: device.installationId, organizationId: acc.organizationId, role: acc.role };
}
