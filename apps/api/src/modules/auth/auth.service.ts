import type { PrismaClient, User } from '@smartsense/db';
import { Errors } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { writeAudit } from '../../lib/audit.js';
import type { RegisterDto, LoginDto } from './auth.schemas.js';

/** Usuario saneado: nunca expone passwordHash. */
export type SafeUser = Omit<User, 'passwordHash'>;

export function sanitizeUser(u: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = u;
  return safe;
}

/**
 * Registra usuario + organización (owner) en una transacción.
 * Email único: si ya existe → 409 EMAIL_TAKEN.
 */
export async function registerUser(
  prisma: PrismaClient,
  dto: RegisterDto,
): Promise<{ user: SafeUser; organization: { id: string; name: string } }> {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw Errors.emailTaken();

  const passwordHash = await hashPassword(dto.password);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        status: 'active',
        locale: 'es-CL',
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: dto.organizationName,
        plan: 'free',
        status: 'active',
      },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'owner',
        status: 'active',
        acceptedAt: new Date(),
      },
    });

    await writeAudit(tx as unknown as PrismaClient, {
      organizationId: organization.id,
      userId: user.id,
      action: 'auth.register',
      entityType: 'user',
      entityId: user.id,
    });

    return { user, organization };
  });

  return {
    user: sanitizeUser(user),
    organization: { id: organization.id, name: organization.name },
  };
}

/**
 * Autentica por email+password. Respuesta genérica ante credenciales inválidas
 * (no revela si el email existe). Actualiza lastLoginAt y audita login.
 */
export async function loginUser(
  prisma: PrismaClient,
  dto: LoginDto,
  ip?: string | null,
): Promise<{
  user: SafeUser;
  membership: { id: string; organizationId: string; role: string } | null;
}> {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw Errors.invalidCredentials();

  const ok = await verifyPassword(dto.password, user.passwordHash);
  if (!ok) throw Errors.invalidCredentials();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'active' },
    select: { id: true, organizationId: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  if (membership) {
    await writeAudit(prisma, {
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      ip: ip ?? null,
    });
  }

  return { user: sanitizeUser(updated), membership };
}

/** Usuario actual + memberships activos con su organización. */
export async function getMe(
  prisma: PrismaClient,
  userId: string,
): Promise<{
  user: SafeUser;
  memberships: Array<{
    id: string;
    organizationId: string;
    role: string;
    organization: { id: string; name: string };
  }>;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.unauthorized();

  const memberships = await prisma.membership.findMany({
    where: { userId, status: 'active' },
    select: {
      id: true,
      organizationId: true,
      role: true,
      organization: { select: { id: true, name: true } },
    },
  });

  return { user: sanitizeUser(user), memberships };
}
