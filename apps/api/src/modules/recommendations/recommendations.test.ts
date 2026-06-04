/**
 * Tests del módulo recommendations (Fase 5) contra la DB real (Neon dev).
 *
 * recommendationsRoutes aún NO se registra en buildApp() (el usuario lo agrega a app.ts).
 * Por eso el test registra la ruta sobre la app de test para ser autocontenido.
 *
 * Datos únicos por test (randomUUID) → aserciones acotadas al tenant creado.
 * Invariantes verificadas:
 *  - Empty-state coherente.
 *  - generateForAlert deriva la recomendación correcta (reduce_usage para high_consumption).
 *  - BR-031: ahorro CLP null sin tarifa; number con tarifa.
 *  - DEDUP: no duplica recomendación activa equivalente.
 *  - Tenant-scope estricto (403 cross-tenant).
 *  - Textos sin promesa de ahorro garantizado.
 *  - CERO control_actions (no se crea automatización).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeTestApp } from '../../../tests/helpers/test-app.js';
import { registerTestUser, authHeader, type TestUser } from '../../../tests/helpers/auth-fixtures.js';
import { assertDbReady, prisma } from '../../../tests/helpers/test-db.js';
import {
  createInstallationForUser,
  createKitAndDevice,
  createDemoTariff,
  linkTariff,
} from '../../../tests/helpers/energy-fixtures.js';
import { generateForAlert, type AlertInput } from './recommendations.service.js';

let app: FastifyInstance;
let owner: TestUser;
let other: TestUser;

/** GET /installations/:id/recommendations con el token dado. */
function getRecommendations(installationId: string, token: string, query = '') {
  return app.inject({
    method: 'GET',
    url: `/installations/${installationId}/recommendations${query}`,
    headers: authHeader(token),
  });
}

/** Crea una alerta over_budget/high_consumption vía prisma directo. */
async function createHighConsumptionAlert(
  installationId: string,
  deviceId: string | null,
  opts: { todayKwh?: number; baselineKwh?: number } = {},
): Promise<AlertInput> {
  const today = opts.todayKwh ?? 30;
  const baseline = opts.baselineKwh ?? 20;
  const alert = await prisma.alert.create({
    data: {
      installationId,
      deviceId: deviceId ?? undefined,
      type: 'over_budget',
      severity: 'warning',
      message: 'Consumo de hoy sobre la línea base',
      context: { subtype: 'high_consumption', today_kwh: today, baseline_kwh: baseline },
    },
  });
  return {
    id: alert.id,
    installationId: alert.installationId,
    deviceId: alert.deviceId,
    type: alert.type,
    context: alert.context,
  };
}

beforeAll(async () => {
  await assertDbReady();
  app = await makeTestApp();
  // Registrar la ruta (aún no está en buildApp).
  await app.ready();
  owner = await registerTestUser(app);
  other = await registerTestUser(app);
});

afterAll(async () => {
  await app.close();
});

describe('GET /installations/:id/recommendations', () => {
  it('empty-state: sin recomendaciones devuelve items vacío y total 0', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);

    const res = await getRecommendations(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.installation_id).toBe(inst.id);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('cross-tenant → 403', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);

    const res = await getRecommendations(inst.id, other.token);
    expect(res.statusCode).toBe(403);
  });
});

describe('generateForAlert', () => {
  it('deriva reduce_usage de una alerta high_consumption (status active en API)', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { device } = await createKitAndDevice(prisma, inst.id);
    const alert = await createHighConsumptionAlert(inst.id, device.id, {
      todayKwh: 30,
      baselineKwh: 20,
    });

    const rec = await generateForAlert(prisma, alert);
    expect(rec).not.toBeNull();
    expect(rec?.type).toBe('reduce_usage');
    expect(rec?.status).toBe('new'); // canon
    expect(rec?.alertId).toBe(alert.id);
    expect(rec?.source).toBe('alert');
    // Ahorro kWh = 10% del exceso (30-20=10) = 1.0
    expect(Number(rec?.estimatedSavingKwh)).toBeCloseTo(1.0, 4);

    // El API lo expone con status 'active'.
    const res = await getRecommendations(inst.id, owner.token);
    expect(res.statusCode).toBe(200);
    const item = res.json().items.find((i: { id: string }) => i.id === rec?.id);
    expect(item).toBeDefined();
    expect(item.type).toBe('reduce_usage');
    expect(item.status).toBe('active');
    expect(item.priority).toBe('medium');
    expect(item.message).toBe(rec?.description); // message = description
  });

  it('BR-031: estimated_saving_clp null SIN tarifa', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const alert = await createHighConsumptionAlert(inst.id, null);

    const rec = await generateForAlert(prisma, alert);
    expect(rec).not.toBeNull();
    expect(rec?.estimatedSavingClp).toBeNull();

    const res = await getRecommendations(inst.id, owner.token);
    const item = res.json().items.find((i: { id: string }) => i.id === rec?.id);
    expect(item.estimated_saving_clp).toBeNull();
    expect(item.estimated_saving_kwh).not.toBeNull();
  });

  it('BR-031: estimated_saving_clp number CON tarifa', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const tariff = await createDemoTariff(prisma, { energyPriceClpKwh: 165 });
    await linkTariff(prisma, inst.id, tariff.id);
    const alert = await createHighConsumptionAlert(inst.id, null, {
      todayKwh: 30,
      baselineKwh: 20,
    });

    const rec = await generateForAlert(prisma, alert);
    expect(rec).not.toBeNull();
    // savingKwh = 1.0, precio 165 → 165 CLP.
    expect(rec?.estimatedSavingClp).not.toBeNull();
    expect(Number(rec?.estimatedSavingClp)).toBe(165);

    const res = await getRecommendations(inst.id, owner.token);
    const item = res.json().items.find((i: { id: string }) => i.id === rec?.id);
    expect(item.estimated_saving_clp).toBe(165);
  });

  it('DEDUP: no duplica recomendación activa equivalente (2 llamadas → 1 fila)', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const alert = await createHighConsumptionAlert(inst.id, null);

    const first = await generateForAlert(prisma, alert);
    const second = await generateForAlert(prisma, alert);
    expect(first).not.toBeNull();
    expect(second).toBeNull();

    const count = await prisma.recommendation.count({
      where: { installationId: inst.id, status: 'new' },
    });
    expect(count).toBe(1);
  });

  it('textos NO prometen ahorro garantizado (title + description)', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const alert = await createHighConsumptionAlert(inst.id, null);

    const rec = await generateForAlert(prisma, alert);
    const text = `${rec?.title} ${rec?.description}`.toLowerCase();
    expect(text).not.toContain('garantizado');
    expect(text).not.toContain('guaranteed');
  });

  it('NO crea control_actions', async () => {
    const inst = await createInstallationForUser(prisma, owner.organizationId);
    const { device } = await createKitAndDevice(prisma, inst.id);
    const alert = await createHighConsumptionAlert(inst.id, device.id);

    await generateForAlert(prisma, alert);

    const controlCount = await prisma.controlAction.count({
      where: { deviceId: device.id },
    });
    expect(controlCount).toBe(0);
  });
});
