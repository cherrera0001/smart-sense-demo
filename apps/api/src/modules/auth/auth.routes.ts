import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './auth.schemas.js';
import * as service from './auth.service.js';
import { writeAudit } from '../../lib/audit.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const signAccess = (userId: string): string => app.signToken(userId);

  app.post('/auth/register', async (req, reply) => {
    const dto = registerSchema.parse(req.body);
    const { user, organization } = await service.registerUser(app.prisma, dto);
    const { accessToken, refreshToken } = await service.issueTokens(app.prisma, signAccess, user.id);
    return reply.code(201).send({
      token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, locale: user.locale },
      organization: { id: organization.id, name: organization.name },
    });
  });

  app.post('/auth/login', async (req, reply) => {
    const dto = loginSchema.parse(req.body);
    const { user } = await service.loginUser(app.prisma, dto, req.ip);
    const { accessToken, refreshToken } = await service.issueTokens(app.prisma, signAccess, user.id);
    return reply.code(200).send({ token: accessToken, refresh_token: refreshToken, user });
  });

  app.post('/auth/refresh', async (req, reply) => {
    const dto = refreshSchema.parse(req.body);
    const { accessToken, refreshToken } = await service.rotateRefreshToken(
      app.prisma,
      signAccess,
      dto.refresh_token,
    );
    return reply.code(200).send({ token: accessToken, refresh_token: refreshToken });
  });

  app.post('/auth/logout', async (req, reply) => {
    // Si viene refresh_token, lo revoca (idempotente). El access sigue siendo stateless.
    const { refresh_token } = logoutSchema.parse(req.body ?? {});
    if (refresh_token) {
      await service.revokeRefreshToken(app.prisma, refresh_token);
    }

    // Stateless: acepta con o sin token. Audita solo si hay sesión válida.
    let userId: string | null = null;
    try {
      const payload = await req.jwtVerify<{ sub: string }>();
      userId = payload.sub;
    } catch {
      userId = null;
    }

    if (userId) {
      const membership = await app.prisma.membership.findFirst({
        where: { userId, status: 'active' },
        select: { organizationId: true },
        orderBy: { createdAt: 'asc' },
      });
      if (membership) {
        await writeAudit(app.prisma, {
          organizationId: membership.organizationId,
          userId,
          action: 'auth.logout',
          entityType: 'user',
          entityId: userId,
          ip: req.ip,
        });
      }
    }

    return reply.code(200).send({ ok: true });
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { user, memberships } = await service.getMe(app.prisma, req.user.sub);
    return reply.code(200).send({ user, memberships });
  });
}
