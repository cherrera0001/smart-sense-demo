/**
 * AlertsService (Fase 5) — listado y revisión de alertas. Funciones puras
 * `(prisma, ...args)`. Sin Fastify. Lanza errores con `Errors.*`.
 *
 * RECONCILIACIÓN canon ↔ API (docs/audit/phase-5-spec-readiness.md):
 *   detected_at = created_at, metadata = context, title = derivado (label por
 *   type/subtype; no existe columna title), message = columna message.
 *
 * RBAC: lectura con ROLES.read; review (reviewed|dismissed) con ROLES.operate
 * (owner/admin/operator). El viewer NO puede revisar. Review audita
 * (`alert.review`), append-only; NO borra alertas. NO crea control_actions.
 */
import { Prisma, type PrismaClient, type Alert } from '@smartsense/db';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { Errors } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type {
  AlertResponseItem,
  AlertsListResponse,
  AlertsQuery,
  ReviewAlertRequest,
  ReviewAlertResponse,
} from './alerts.schemas.js';

/** Límite por defecto del listado. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * Deriva un `title` legible a partir de type/subtype (no hay columna title).
 * El subtype fino vive en `context.subtype`.
 */
function deriveTitle(type: Alert['type'], context: unknown): string {
  const subtype =
    context && typeof context === 'object' && 'subtype' in context
      ? String((context as Record<string, unknown>).subtype)
      : null;

  switch (type) {
    case 'anomaly':
      return 'Consumo anómalo detectado';
    case 'high_device':
      return 'Dispositivo de alto consumo';
    case 'offline':
      return 'Dispositivo sin conexión';
    case 'over_budget':
      if (subtype === 'projection_risk') return 'Proyección de consumo elevada';
      if (subtype === 'high_consumption') return 'Consumo del día elevado';
      return 'Consumo sobre lo esperado';
    default:
      return 'Alerta';
  }
}

/** metadata = context (jsonb) saneado a objeto plano o null. */
function toMetadata(context: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (context == null) return null;
  if (typeof context === 'object' && !Array.isArray(context)) {
    return context as Record<string, unknown>;
  }
  // Contexto no-objeto (raro): se envuelve para mantener el contrato (object|null).
  return { value: context } as Record<string, unknown>;
}

/** Mapea una Alert de Prisma al item del API (alertResponseItem). */
export function serializeAlert(alert: Alert): AlertResponseItem {
  return {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    status: alert.status,
    title: deriveTitle(alert.type, alert.context),
    message: alert.message,
    device_id: alert.deviceId ?? null,
    detected_at: alert.createdAt.toISOString(),
    reviewed_at: alert.reviewedAt ? alert.reviewedAt.toISOString() : null,
    metadata: toMetadata(alert.context),
  };
}

/**
 * Lista las alertas de una instalación (tenant-scoped, ROLES.read).
 * Filtros: status (default 'open'; 'all' = sin filtro), severity, from/to
 * (sobre created_at), limit (default 100, máx 500). Orden: más recientes primero.
 */
export async function listAlerts(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
  query: AlertsQuery,
): Promise<AlertsListResponse> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const where: Prisma.AlertWhereInput = { installationId };

  const status = query.status ?? 'open';
  if (status !== 'all') {
    where.status = status;
  }
  if (query.severity) {
    where.severity = query.severity as Prisma.AlertWhereInput['severity'];
  }
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    installation_id: installationId,
    items: alerts.map(serializeAlert),
    total: alerts.length,
  };
}

/**
 * Revisa una alerta: transición a 'reviewed' o 'dismissed'. RBAC ROLES.operate
 * (viewer NO). Resuelve la instalación/org de la alerta y exige acceso (cross-tenant
 * → 403; alerta inexistente → 404). Setea status, reviewedBy=userId, reviewedAt=now.
 * Audita (`alert.review`, before/after). NO borra.
 */
export async function reviewAlert(
  prisma: PrismaClient,
  userId: string,
  alertId: string,
  dto: ReviewAlertRequest,
  ip?: string | null,
): Promise<ReviewAlertResponse> {
  const alert = await prisma.alert.findFirst({
    where: { id: alertId },
    select: {
      id: true,
      installationId: true,
      status: true,
      reviewedBy: true,
      reviewedAt: true,
    },
  });
  if (!alert) throw Errors.notFound('Alerta');

  // Resuelve la org de la instalación de la alerta y exige rol operate.
  const access = await assertInstallationAccess(
    prisma,
    userId,
    alert.installationId,
    ROLES.operate,
  );

  const now = new Date();
  const before = {
    status: alert.status,
    reviewedBy: alert.reviewedBy,
    reviewedAt: alert.reviewedAt ? alert.reviewedAt.toISOString() : null,
  };

  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: dto.status,
      reviewedBy: userId,
      reviewedAt: now,
    },
    select: { id: true, status: true, reviewedAt: true },
  });

  await writeAudit(prisma, {
    organizationId: access.organizationId,
    userId,
    action: 'alert.review',
    entityType: 'alert',
    entityId: alertId,
    before,
    after: {
      status: updated.status,
      reviewedBy: userId,
      reviewedAt: now.toISOString(),
      note: dto.note ?? null,
    },
    ip: ip ?? null,
  });

  return {
    id: updated.id,
    status: updated.status as 'reviewed' | 'dismissed',
    reviewed_at: (updated.reviewedAt ?? now).toISOString(),
  };
}
