import type { FastifyInstance } from 'fastify';
import {
  devicePairSchema,
  kitClaimSchema,
  kitScanSchema,
  onboardingStatusQuerySchema,
} from './onboarding.schemas.js';
import { claimKit, getStatus, pairDevices, scanKit } from './onboarding.service.js';

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  app.post('/onboarding/kit/scan', { preHandler: [app.authenticate] }, async (req) => {
    const { qrCode } = kitScanSchema.parse(req.body);
    return scanKit(app.prisma, qrCode);
  });

  app.post('/onboarding/kit/claim', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const dto = kitClaimSchema.parse(req.body);
    return claimKit(app.prisma, userId, dto);
  });

  app.post('/onboarding/devices/pair', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const dto = devicePairSchema.parse(req.body);
    return pairDevices(app.prisma, userId, dto);
  });

  app.get('/onboarding/status', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const { installationId } = onboardingStatusQuerySchema.parse(req.query);
    return getStatus(app.prisma, userId, installationId);
  });
}
