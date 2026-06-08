import type { PrismaClient, User } from '@smartsense/db';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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

// ---------------------------------------------------------------------------
// Refresh-token rotation (Fase 7 — Hardening)
//
// El refresh token "raw" (opaco, base64url) NUNCA se persiste: se guarda solo su
// SHA-256. La rotación marca el viejo como revocado y enlaza al nuevo vía jti.
// La reutilización de un refresh ya rotado/revocado es señal de robo → se revocan
// TODAS las sesiones del usuario.
// ---------------------------------------------------------------------------

/** Firma de access token: la rutas inyectan app.signToken para mantener el service sin Fastify. */
export type SignAccess = (userId: string) => string;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d (JWT_REFRESH_EXPIRES_IN)

function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Emite un par access + refresh. Persiste el refresh hasheado en refresh_tokens.
 * Acepta un client/tx Prisma para poder participar de transacciones de rotación.
 */
export async function issueTokens(
  prisma: PrismaClient,
  signAccess: SignAccess,
  userId: string,
): Promise<TokenPair> {
  const accessToken = signAccess(userId);
  const rawRefresh = randomBytes(32).toString('base64url');
  const jti = randomUUID();
  const tokenHash = sha256(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, jti, expiresAt },
  });

  return { accessToken, refreshToken: rawRefresh };
}

/**
 * Rota un refresh token. Detecta reuso (refresh ya revocado) y revoca todas las
 * sesiones del usuario en ese caso. Devuelve un par nuevo si la rotación es válida.
 */
export async function rotateRefreshToken(
  prisma: PrismaClient,
  signAccess: SignAccess,
  rawRefresh: string,
): Promise<TokenPair> {
  const tokenHash = sha256(rawRefresh);
  const existing = await prisma.refreshToken.findFirst({ where: { tokenHash } });

  if (!existing) throw Errors.unauthorized('refresh inválido');

  // Reuso de un refresh ya rotado/revocado → posible robo: revoca todo el árbol del user.
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw Errors.unauthorized('refresh reutilizado');
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw Errors.unauthorized('refresh expirado');
  }

  // Rotación atómica: revoca el viejo + emite el nuevo, enlazando vía jti.
  return prisma.$transaction(async (tx) => {
    const pair = await issueTokens(tx as unknown as PrismaClient, signAccess, existing.userId);
    const fresh = await tx.refreshToken.findFirst({
      where: { tokenHash: sha256(pair.refreshToken) },
      select: { jti: true },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByJti: fresh?.jti ?? null },
    });
    return pair;
  });
}

/** Revoca un refresh token por su valor raw. Idempotente: no falla si no existe. */
export async function revokeRefreshToken(
  prisma: PrismaClient,
  rawRefresh: string,
): Promise<void> {
  const tokenHash = sha256(rawRefresh);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
