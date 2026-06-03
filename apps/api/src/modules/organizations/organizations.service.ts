import type { PrismaClient } from '@smartsense/db';
import { getActiveMemberships, assertOrgAccess, type Role } from '../../lib/access.js';
import { writeAudit } from '../../lib/audit.js';
import type { CreateOrgInput } from './organizations.schemas.js';

export interface OrganizationView {
  id: string;
  name: string;
  legalId: string | null;
  segmentDefault: string | null;
  plan: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  plan: string;
  status: string;
  role: Role;
}

/**
 * Lista las organizaciones donde el usuario tiene membership activo.
 * Filtra orgs soft-deleted. Incluye el rol del usuario en cada una.
 */
export async function listOrganizations(
  prisma: PrismaClient,
  userId: string,
): Promise<OrganizationListItem[]> {
  const memberships = await getActiveMemberships(prisma, userId);
  if (memberships.length === 0) return [];

  const roleByOrg = new Map(memberships.map((m) => [m.organizationId, m.role]));
  const orgs = await prisma.organization.findMany({
    where: { id: { in: [...roleByOrg.keys()] }, deletedAt: null },
    select: { id: true, name: true, plan: true, status: true },
  });

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    plan: o.plan,
    status: o.status,
    role: roleByOrg.get(o.id) as Role,
  }));
}

/**
 * Crea una organización y la membership `owner` (active) del actor en una transacción.
 * Audita `organization.create`. Devuelve la organización creada.
 */
export async function createOrganization(
  prisma: PrismaClient,
  userId: string,
  dto: CreateOrgInput,
): Promise<OrganizationView> {
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: dto.name,
        legalId: dto.legalId ?? null,
        segmentDefault: dto.segmentDefault ?? null,
      },
    });

    await tx.membership.create({
      data: {
        userId,
        organizationId: created.id,
        role: 'owner',
        status: 'active',
        acceptedAt: new Date(),
      },
    });

    return created;
  });

  await writeAudit(prisma, {
    organizationId: org.id,
    userId,
    action: 'organization.create',
    entityType: 'organization',
    entityId: org.id,
    after: { id: org.id, name: org.name },
  });

  return toView(org);
}

/**
 * Obtiene una organización del tenant del usuario. `assertOrgAccess` exige membership
 * activo (cualquier rol = lectura) y lanza CROSS_TENANT_DENIED (403) si no pertenece,
 * sin filtrar la existencia del recurso. NotFound solo si la org fue soft-deleted.
 */
export async function getOrganization(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<OrganizationView | null> {
  await assertOrgAccess(prisma, userId, id);
  const org = await prisma.organization.findFirst({ where: { id, deletedAt: null } });
  return org ? toView(org) : null;
}

function toView(o: {
  id: string;
  name: string;
  legalId: string | null;
  segmentDefault: string | null;
  plan: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): OrganizationView {
  return {
    id: o.id,
    name: o.name,
    legalId: o.legalId,
    segmentDefault: o.segmentDefault,
    plan: o.plan,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}
