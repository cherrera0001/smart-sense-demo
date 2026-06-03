/**
 * Auditoría append-only. `audit_logs` está protegido por trigger (UPDATE/DELETE rechazados).
 * Toda acción sensible (register/login/create/update/claim/pair) escribe aquí.
 */
import type { PrismaClient } from '@smartsense/db';

export interface AuditParams {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

export async function writeAudit(prisma: PrismaClient, p: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: p.organizationId,
      userId: p.userId ?? null,
      action: p.action,
      entityType: p.entityType,
      entityId: p.entityId ?? null,
      before: (p.before ?? undefined) as object | undefined,
      after: (p.after ?? undefined) as object | undefined,
      ip: p.ip ?? null,
    },
  });
}
