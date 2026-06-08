/**
 * Servicio de recomendaciones (Fase 5). Funciones puras `(prisma, ...)`. Sin Fastify.
 *
 * RECONCILIACIÓN (docs/audit/phase-5-spec-readiness.md): la persistencia usa el canon
 * (status new|applied|dismissed, priority int, columna `description`) y el API expone una
 * vista mapeada (status active/applied/dismissed, priority low/medium/high, `message`).
 *
 * REGLAS DURAS:
 *  - BR-031: el ahorro CLP se calcula SIEMPRE vía BillingService; sin tarifa válida → null.
 *    El ahorro NUNCA se inventa y NUNCA se promete como garantizado (textos: "podría",
 *    "estimado"). Si no hay base de consumo observado → estimatedSavingKwh = null.
 *  - Tenant-scope estricto en lectura (assertInstallationAccess).
 *  - source='alert' en Fase 5; no se generan control_actions ni automatización.
 *
 * HEURÍSTICA DE AHORRO (estimatedSavingKwh): se deriva SOLO de consumo OBSERVADO en el
 * `context` de la alerta, nunca de un valor inventado:
 *  - over_budget/high_consumption: exceso = max(today_kwh - baseline_kwh, 0); ahorro
 *    estimado = 10% del exceso (margen conservador de reducción de hábitos).
 *  - high_device: exceso del dispositivo = max(device_kwh - baseline_kwh, 0); ahorro = 10%.
 *  - offline / anomaly / projection_risk: sin base de consumo reducible fiable → null
 *    (no se estima ahorro; la recomendación es de inspección/revisión).
 * Todo factor distinto de cero exige un consumo observado > 0 en el context; en cualquier
 * otro caso el ahorro queda en null (no se fabrica un número).
 */
import { Prisma, type PrismaClient } from '@smartsense/db';
import { ROLES, assertInstallationAccess } from '../../lib/access.js';
import { estimateEnergyCostClp } from '../billing/billing.service.js';
import type {
  RecommendationApiPriority,
  RecommendationApiStatus,
  RecommendationApiType,
  RecommendationResponseItem,
  RecommendationsListResponse,
  RecommendationsQuery,
} from './recommendations.schemas.js';

/** Factor conservador de reducción aplicable al exceso observado (10%). */
const SAVING_FACTOR = 0.1;

/** Tipo canónico de alerta (subconjunto usado en Fase 5). */
type DbRecommendationStatus = 'new' | 'applied' | 'dismissed';

/** Forma mínima de alerta que necesita `generateForAlert` (canon Prisma). */
export interface AlertInput {
  id: string;
  installationId: string;
  deviceId?: string | null;
  type: string; // AlertType del canon: anomaly | high_device | over_budget | offline
  context?: Prisma.JsonValue | null;
}

interface DerivedRecommendation {
  type: RecommendationApiType;
  title: string;
  description: string;
  priority: number;
  /** Ahorro estimado en kWh derivado de consumo observado, o null si no hay base. */
  savingKwh: number | null;
}

/** Lee un número de un objeto JSON de context de forma segura (null si no aplica). */
function readNumber(ctx: Record<string, unknown> | null, key: string): number | null {
  if (!ctx) return null;
  const v = ctx[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Normaliza el context a objeto plano (o null). */
function asObject(ctx: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
    return ctx as Record<string, unknown>;
  }
  return null;
}

/** Ahorro kWh = factor * exceso observado (>0). null si no hay exceso fiable. */
function savingFromExcess(excessKwh: number | null): number | null {
  if (excessKwh == null || excessKwh <= 0) return null;
  const saving = Math.round(excessKwh * SAVING_FACTOR * 10000) / 10000;
  return saving > 0 ? saving : null;
}

/**
 * Deriva (en memoria) la recomendación correspondiente a una alerta, o null si la alerta
 * no tiene un mapeo definido. No persiste; no estima costo (eso lo hace el caller).
 *
 * Mapeo type alerta → recomendación:
 *  - over_budget + subtype 'high_consumption' → reduce_usage
 *  - over_budget + subtype 'projection_risk'  → tariff_review
 *  - high_device                              → inspect_device
 *  - offline                                  → inspect_device
 *  - anomaly                                  → inspect_device
 */
function deriveRecommendation(alert: AlertInput): DerivedRecommendation | null {
  const ctx = asObject(alert.context);
  const subtype = ctx && typeof ctx.subtype === 'string' ? (ctx.subtype as string) : null;

  switch (alert.type) {
    case 'over_budget': {
      if (subtype === 'projection_risk') {
        return {
          type: 'tariff_review',
          priority: 1, // medium
          title: 'Revisa tu tarifa eléctrica',
          description:
            'La proyección de consumo del periodo podría superar tu presupuesto. Revisar tu ' +
            'tarifa contratada podría ayudar a reducir el costo estimado del mes.',
          savingKwh: null, // riesgo de proyección: sin exceso observado reducible
        };
      }
      // Default y subtype 'high_consumption': reducción de uso.
      const today = readNumber(ctx, 'today_kwh');
      const baseline = readNumber(ctx, 'baseline_kwh');
      const excess = today != null && baseline != null ? today - baseline : null;
      return {
        type: 'reduce_usage',
        priority: 1, // medium
        title: 'Tu consumo está por sobre lo habitual',
        description:
          'Tu consumo de hoy supera tu línea base reciente. Ajustar el uso de los equipos de ' +
          'mayor demanda podría reducir tu consumo; el ahorro indicado es solo una estimación.',
        savingKwh: savingFromExcess(excess),
      };
    }
    case 'high_device': {
      const deviceKwh = readNumber(ctx, 'device_kwh');
      const baseline = readNumber(ctx, 'baseline_kwh');
      const excess = deviceKwh != null && baseline != null ? deviceKwh - baseline : null;
      return {
        type: 'inspect_device',
        priority: 1, // medium
        title: 'Un dispositivo consume más de lo esperado',
        description:
          'Detectamos un dispositivo con consumo elevado respecto a su comportamiento habitual. ' +
          'Inspeccionarlo podría ayudar a identificar un mal funcionamiento; el ahorro es estimado.',
        savingKwh: savingFromExcess(excess),
      };
    }
    case 'offline': {
      return {
        type: 'inspect_device',
        priority: 1, // medium
        title: 'Un dispositivo dejó de reportar',
        description:
          'Un dispositivo de tu instalación dejó de enviar datos. Revisar su conexión o estado ' +
          'podría restablecer el monitoreo.',
        savingKwh: null, // offline: sin consumo observado reducible
      };
    }
    case 'anomaly': {
      return {
        type: 'inspect_device',
        priority: 1, // medium
        title: 'Patrón de consumo inusual detectado',
        description:
          'Detectamos un patrón de consumo atípico. Inspeccionar los equipos involucrados podría ' +
          'ayudar a entender la causa.',
        savingKwh: null, // anomalía: sin exceso reducible cuantificado
      };
    }
    default:
      return null;
  }
}

/**
 * Genera (y persiste) UNA recomendación a partir de una alerta, si hay mapeo y no existe
 * ya una equivalente activa. Devuelve la recomendación creada o null.
 *
 * DEDUP: no crea si ya existe una recomendación con status='new' que sea equivalente:
 *  (a) mismo installationId + alertId, o
 *  (b) mismo installationId + mismo type (recomendación activa del mismo tipo).
 *
 * El ahorro CLP se resuelve vía BillingService (null sin tarifa). El ahorro kWh proviene
 * de la heurística sobre consumo observado (null si no hay base).
 */
export async function generateForAlert(
  prisma: PrismaClient,
  alert: AlertInput,
): Promise<Awaited<ReturnType<PrismaClient['recommendation']['create']>> | null> {
  const derived = deriveRecommendation(alert);
  if (!derived) return null;

  // DEDUP: recomendación activa equivalente (por alertId o por type).
  const existing = await prisma.recommendation.findFirst({
    where: {
      installationId: alert.installationId,
      status: 'new',
      OR: [{ alertId: alert.id }, { type: derived.type }],
    },
    select: { id: true },
  });
  if (existing) return null;

  // Ahorro CLP vía BillingService (BR-031): null sin tarifa. Solo si hay savingKwh.
  let estimatedSavingClp: bigint | null = null;
  if (derived.savingKwh != null && derived.savingKwh > 0) {
    const cost = await estimateEnergyCostClp(prisma, alert.installationId, derived.savingKwh);
    estimatedSavingClp = cost.costClp != null ? BigInt(cost.costClp) : null;
  }

  return prisma.recommendation.create({
    data: {
      installationId: alert.installationId,
      alertId: alert.id,
      source: 'alert',
      type: derived.type,
      title: derived.title,
      description: derived.description,
      estimatedSavingKwh:
        derived.savingKwh != null ? new Prisma.Decimal(derived.savingKwh) : null,
      estimatedSavingClp,
      priority: derived.priority,
      status: 'new',
    },
  });
}

/** Mapeo de prioridad canon (int) → API. */
function mapPriority(priority: number): RecommendationApiPriority {
  if (priority >= 2) return 'high';
  if (priority === 1) return 'medium';
  return 'low';
}

/** Mapeo de status canon → API (new→active). */
function mapStatus(status: string): RecommendationApiStatus {
  switch (status) {
    case 'new':
      return 'active';
    case 'applied':
      return 'applied';
    case 'dismissed':
      return 'dismissed';
    default:
      return 'active';
  }
}

/** Mapeo de status API (query) → canon DB. null = sin filtro ('all'). */
function apiStatusToDb(status: RecommendationsQuery['status']): DbRecommendationStatus | null {
  switch (status) {
    case 'active':
      return 'new';
    case 'applied':
      return 'applied';
    case 'dismissed':
      return 'dismissed';
    case 'all':
      return null;
    default:
      return 'new';
  }
}

/** Serializa una fila de recommendation (canon) al item de respuesta del API. */
function serialize(row: {
  id: string;
  alertId: string | null;
  type: string | null;
  title: string;
  description: string;
  estimatedSavingClp: bigint | null;
  estimatedSavingKwh: Prisma.Decimal | null;
  priority: number;
  status: string;
  createdAt: Date;
}): RecommendationResponseItem {
  return {
    id: row.id,
    alert_id: row.alertId,
    // `type` es nullable en el canon; en Fase 5 las recomendaciones generadas siempre lo
    // setean. Fallback defensivo a 'reduce_usage' si una fila legacy no lo tuviera.
    type: (row.type as RecommendationApiType | null) ?? 'reduce_usage',
    priority: mapPriority(row.priority),
    title: row.title,
    message: row.description,
    estimated_saving_clp: row.estimatedSavingClp != null ? Number(row.estimatedSavingClp) : null,
    estimated_saving_kwh: row.estimatedSavingKwh != null ? Number(row.estimatedSavingKwh) : null,
    status: mapStatus(row.status),
    created_at: row.createdAt.toISOString(),
  };
}

/**
 * Lista las recomendaciones de una instalación (tenant-scope). Filtra por status (API
 * active→DB new; default 'active'; 'all' = sin filtro), ordena por priority desc y
 * createdAt desc, limita (default 100).
 */
export async function listRecommendations(
  prisma: PrismaClient,
  userId: string,
  installationId: string,
  query: RecommendationsQuery,
): Promise<RecommendationsListResponse> {
  await assertInstallationAccess(prisma, userId, installationId, ROLES.read);

  const dbStatus = apiStatusToDb(query.status);
  const rows = await prisma.recommendation.findMany({
    where: {
      installationId,
      ...(dbStatus ? { status: dbStatus } : {}),
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: query.limit,
  });

  const items = rows.map(serialize);
  return {
    installation_id: installationId,
    items,
    total: items.length,
  };
}
