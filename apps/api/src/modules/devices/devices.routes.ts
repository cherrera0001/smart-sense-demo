import type { FastifyInstance } from 'fastify';
import {
  createDeviceSchema,
  idParamSchema,
  installationIdParamSchema,
  patchDeviceSchema,
} from './devices.schemas.js';
import { createDevice, getDevice, listDevices, updateDevice } from './devices.service.js';

export async function devicesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/installations/:installationId/devices',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { installationId } = installationIdParamSchema.parse(req.params);
      const devices = await listDevices(app.prisma, userId, installationId);
      return { devices };
    },
  );

  app.post('/devices', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const dto = createDeviceSchema.parse(req.body);
    const device = await createDevice(app.prisma, userId, dto);
    return reply.code(201).send({ device });
  });

  app.get('/devices/:id', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const { id } = idParamSchema.parse(req.params);
    const device = await getDevice(app.prisma, userId, id);
    return { device };
  });

  app.patch('/devices/:id', { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const { id } = idParamSchema.parse(req.params);
    const dto = patchDeviceSchema.parse(req.body);
    const device = await updateDevice(app.prisma, userId, id, dto);
    return { device };
  });
}
