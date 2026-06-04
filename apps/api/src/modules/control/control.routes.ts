/**
 * Rutas del módulo control (Fase 6 — dry-run). Paths completos 1:1 con openapi
 * (sin prefix). Todas protegidas por JWT. RBAC se aplica en el servicio
 * (read para listar/estado; operate para mutaciones; viewer prohibido).
 *
 * NO se registra en buildApp() aquí: el usuario lo registra en app.ts.
 */
import type { FastifyInstance } from 'fastify';
import {
  deviceIdParam,
  scheduleIdParam,
  limitIdParam,
  controlActionRequest,
  controlActionsQuery,
  controlScheduleRequest,
  controlSchedulePatch,
  consumptionLimitRequest,
  consumptionLimitPatch,
} from './control.schemas.js';
import {
  createControlAction,
  listControlActions,
  getControlState,
  createControlSchedule,
  listControlSchedules,
  updateControlSchedule,
  createConsumptionLimit,
  listConsumptionLimits,
  updateConsumptionLimit,
} from './control.service.js';

export async function controlRoutes(app: FastifyInstance): Promise<void> {
  // --- Control actions ---
  app.post(
    '/devices/:deviceId/control-actions',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      const dto = controlActionRequest.parse(req.body);
      const idempotencyKey =
        typeof req.headers['idempotency-key'] === 'string'
          ? req.headers['idempotency-key']
          : null;
      const result = await createControlAction(
        app.prisma,
        userId,
        deviceId,
        dto,
        idempotencyKey,
        req.ip,
      );
      return reply.code(201).send(result);
    },
  );

  app.get(
    '/devices/:deviceId/control-actions',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      const query = controlActionsQuery.parse(req.query);
      return listControlActions(app.prisma, userId, deviceId, query);
    },
  );

  app.get(
    '/devices/:deviceId/control-state',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      return getControlState(app.prisma, userId, deviceId);
    },
  );

  // --- Control schedules ---
  app.post(
    '/devices/:deviceId/control-schedules',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      const dto = controlScheduleRequest.parse(req.body);
      const result = await createControlSchedule(app.prisma, userId, deviceId, dto, req.ip);
      return reply.code(201).send(result);
    },
  );

  app.get(
    '/devices/:deviceId/control-schedules',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      return listControlSchedules(app.prisma, userId, deviceId);
    },
  );

  app.patch(
    '/control-schedules/:id',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { id } = scheduleIdParam.parse(req.params);
      const patch = controlSchedulePatch.parse(req.body);
      return updateControlSchedule(app.prisma, userId, id, patch, req.ip);
    },
  );

  // --- Consumption limits ---
  app.post(
    '/devices/:deviceId/consumption-limits',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      const dto = consumptionLimitRequest.parse(req.body);
      const result = await createConsumptionLimit(app.prisma, userId, deviceId, dto, req.ip);
      return reply.code(201).send(result);
    },
  );

  app.get(
    '/devices/:deviceId/consumption-limits',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { deviceId } = deviceIdParam.parse(req.params);
      return listConsumptionLimits(app.prisma, userId, deviceId);
    },
  );

  app.patch(
    '/consumption-limits/:id',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const { id } = limitIdParam.parse(req.params);
      const patch = consumptionLimitPatch.parse(req.body);
      return updateConsumptionLimit(app.prisma, userId, id, patch, req.ip);
    },
  );
}
