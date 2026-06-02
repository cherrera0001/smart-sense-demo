/**
 * Tests de integridad referencial (Paso 9).
 *
 * Requieren Docker (Testcontainers). Si Docker no está disponible se skippean con un mensaje
 * claro; el archivo COMPILA igualmente (typecheck) en cualquier entorno.
 */
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { startTestDb, stopTestDb, hasDocker, type TestDb } from './setup.js';

const dockerAvailable = hasDocker();
const suite = dockerAvailable ? describe : describe.skip;

if (!dockerAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    '[integrity.test] Docker no disponible — tests skippeados. Requieren Docker + imagen timescale/timescaledb:latest-pg16 (fallback postgres:16).',
  );
}

suite('integridad referencial', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await startTestDb();
  }, 180_000);

  afterAll(async () => {
    await stopTestDb(db);
  });

  /** Crea la cadena base user→org→membership→installation→profile→kit→devices. */
  async function seedChain() {
    const p = db.prisma;
    const user = await p.user.create({
      data: { email: `u-${randomUUID()}@test.local`, passwordHash: 'x', fullName: 'Tester' },
    });
    const org = await p.organization.create({ data: { name: `Org ${randomUUID()}` } });
    const membership = await p.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner' },
    });
    const installation = await p.installation.create({
      data: { organizationId: org.id, name: 'Sitio', segment: 'home' },
    });
    const profile = await p.installationProfile.create({
      data: { installationId: installation.id, segment: 'home', occupants: 2 },
    });
    const kit = await p.energyKit.create({
      data: {
        installationId: installation.id,
        qrCode: `QR-${randomUUID()}`,
        serial: `SN-${randomUUID()}`,
        status: 'active',
      },
    });
    const device = await p.device.create({
      data: {
        kitId: kit.id,
        installationId: installation.id,
        name: 'Refri',
        externalRef: 'enchuf-1',
        capabilities: { meter: true },
      },
    });
    return { user, org, membership, installation, profile, kit, device };
  }

  it('crea la cadena user/org/membership/installation/profile/kit/device', async () => {
    const { user, org, membership, installation, profile, kit, device } = await seedChain();
    expect(user.id).toBeTruthy();
    expect(membership.organizationId).toBe(org.id);
    expect(profile.installationId).toBe(installation.id);
    expect(device.kitId).toBe(kit.id);
    expect(device.installationId).toBe(installation.id);
  });

  it('device sin kit válido falla (FK kit_id)', async () => {
    const { installation } = await seedChain();
    await expect(
      db.prisma.device.create({
        data: {
          kitId: randomUUID(), // kit inexistente
          installationId: installation.id,
          name: 'Huérfano',
          externalRef: 'enchuf-x',
        },
      }),
    ).rejects.toThrow();
  });

  it('telemetría sin device válido falla (FK device_id)', async () => {
    await expect(
      db.prisma.telemetryReading.create({
        data: {
          readingId: randomUUID(),
          deviceId: randomUUID(), // device inexistente
          kitId: randomUUID(),
          installationId: randomUUID(),
          sourceTimestamp: new Date(),
          eventHash: `eh-${randomUUID()}`,
          activePowerW: '100.00',
        },
      }),
    ).rejects.toThrow();
  });

  it('telemetría duplicada por event_hash falla (UNIQUE idempotencia)', async () => {
    const { device, kit, installation } = await seedChain();
    const eventHash = `eh-${randomUUID()}`;
    const ts = new Date();
    await db.prisma.telemetryReading.create({
      data: {
        readingId: randomUUID(),
        deviceId: device.id,
        kitId: kit.id,
        installationId: installation.id,
        sourceTimestamp: ts,
        eventHash,
        activePowerW: '50.00',
      },
    });
    await expect(
      db.prisma.telemetryReading.create({
        data: {
          readingId: randomUUID(),
          deviceId: device.id,
          kitId: kit.id,
          installationId: installation.id,
          // mismo source_timestamp para colisionar en el unique (event_hash, source_timestamp)
          sourceTimestamp: ts,
          eventHash,
          activePowerW: '60.00',
        },
      }),
    ).rejects.toThrow();
  });

  it('cross-tenant: relaciones esperadas se resuelven dentro del mismo tenant', async () => {
    const a = await seedChain();
    const b = await seedChain();
    // Las instalaciones pertenecen a orgs distintas (no se mezclan tenants).
    expect(a.installation.organizationId).not.toBe(b.installation.organizationId);
    const orgAInstalls = await db.prisma.installation.findMany({
      where: { organizationId: a.org.id },
    });
    expect(orgAInstalls.every((i) => i.organizationId === a.org.id)).toBe(true);
    expect(orgAInstalls.find((i) => i.id === b.installation.id)).toBeUndefined();
  });

  it('boleta → installation', async () => {
    const { installation } = await seedChain();
    const bill = await db.prisma.electricityBill.create({
      data: {
        installationId: installation.id,
        periodStart: new Date('2026-04-01'),
        periodEnd: new Date('2026-04-30'),
        consumptionKwh: '100.0000',
        totalClp: 17000n,
        fileUrl: 'demo://b.pdf',
      },
    });
    expect(bill.installationId).toBe(installation.id);
  });

  it('alerta → installation y recommendation → alert', async () => {
    const { installation } = await seedChain();
    const alert = await db.prisma.alert.create({
      data: {
        installationId: installation.id,
        type: 'high_device',
        severity: 'warning',
        message: 'Sobreconsumo',
      },
    });
    const rec = await db.prisma.recommendation.create({
      data: {
        installationId: installation.id,
        alertId: alert.id,
        source: 'alert',
        title: 'Revisar',
        description: 'Detalle',
      },
    });
    expect(alert.installationId).toBe(installation.id);
    expect(rec.alertId).toBe(alert.id);
  });

  it('control_action → device + user, y audit_log → user/org', async () => {
    const { device, user, org } = await seedChain();
    const action = await db.prisma.controlAction.create({
      data: { deviceId: device.id, userId: user.id, type: 'turn_off' },
    });
    const audit = await db.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'control.turn_off',
        entityType: 'control_action',
        entityId: action.id,
      },
    });
    expect(action.deviceId).toBe(device.id);
    expect(action.userId).toBe(user.id);
    expect(audit.userId).toBe(user.id);
    expect(audit.organizationId).toBe(org.id);
  });

  it('audit_logs es append-only (UPDATE/DELETE rechazados por trigger)', async () => {
    const { org } = await seedChain();
    const audit = await db.prisma.auditLog.create({
      data: { organizationId: org.id, action: 'x', entityType: 'test' },
    });
    await expect(
      db.prisma.auditLog.update({ where: { id: audit.id }, data: { action: 'y' } }),
    ).rejects.toThrow();
    await expect(
      db.prisma.auditLog.delete({ where: { id: audit.id } }),
    ).rejects.toThrow();
  });
});
