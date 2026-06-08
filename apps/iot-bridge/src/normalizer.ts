/**
 * Normalizador de telemetría.
 *
 * Toma un objeto crudo en la forma MQTT del contrato
 * (`mqtt-or-ingestion-contract.md` §2) — con un sub-objeto `metrics` — o ya en
 * forma plana, y lo convierte al DTO plano de POST /iot/telemetry
 * (`telemetryIngestSchema`).
 *
 *  - Mapea `metrics.*` a campos planos.
 *  - Conserva el objeto original en `raw_payload`.
 *  - Calcula `event_hash` con `computeEventHash` si falta.
 *  - Valida contra el contrato (rechaza negativos, power_factor fuera de
 *    [-1, 1] y timestamps excesivamente futuros: > now + 120 s).
 */
import {
  validateIngest,
  computeEventHash,
  type TelemetryIngest,
} from './telemetry-contract.js';

/** Tolerancia de reloj para timestamps futuros (canon §6): now + 120 s. */
export const FUTURE_TOLERANCE_MS = 120_000;

interface RawMetrics {
  voltage_v?: number | null;
  current_a?: number | null;
  active_power_w?: number | null;
  reactive_power_var?: number | null;
  apparent_power_va?: number | null;
  power_factor?: number | null;
  energy_wh_delta?: number | null;
  frequency_hz?: number | null;
}

interface RawReading {
  reading_id?: string;
  device_id?: string;
  kit_id?: string;
  installation_id?: string;
  source_timestamp?: string;
  metrics?: RawMetrics;
  // Campos planos (forma alternativa / ya normalizada).
  voltage_v?: number | null;
  current_a?: number | null;
  active_power_w?: number | null;
  reactive_power_var?: number | null;
  apparent_power_va?: number | null;
  power_factor?: number | null;
  energy_wh_delta?: number | null;
  frequency_hz?: number | null;
  signal_quality?: number | null;
  firmware_version?: string | null;
  raw_payload?: unknown;
  event_hash?: string;
}

export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NormalizationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Lee una métrica de `metrics` (forma MQTT) con fallback al campo plano. */
function pickMetric(
  metrics: RawMetrics | undefined,
  flat: number | null | undefined,
  key: keyof RawMetrics,
): number | null | undefined {
  if (metrics !== undefined && metrics[key] !== undefined) return metrics[key];
  return flat;
}

/**
 * Normaliza una lectura cruda al DTO de ingesta validado.
 * @throws NormalizationError si faltan identificadores requeridos o si el
 *         payload no pasa la validación del contrato.
 */
export function normalize(raw: unknown): TelemetryIngest {
  if (!isRecord(raw)) {
    throw new NormalizationError(
      'payload inválido: se esperaba un objeto JSON.',
    );
  }

  const r = raw as RawReading;
  const metrics = isRecord(r.metrics) ? (r.metrics as RawMetrics) : undefined;

  const missing: string[] = [];
  if (typeof r.device_id !== 'string' || r.device_id.length === 0)
    missing.push('device_id');
  if (typeof r.kit_id !== 'string' || r.kit_id.length === 0)
    missing.push('kit_id');
  if (typeof r.installation_id !== 'string' || r.installation_id.length === 0)
    missing.push('installation_id');
  if (typeof r.source_timestamp !== 'string' || r.source_timestamp.length === 0)
    missing.push('source_timestamp');

  if (missing.length > 0) {
    throw new NormalizationError(
      `faltan campos requeridos: ${missing.join(', ')}.`,
    );
  }

  const device_id = r.device_id as string;
  const kit_id = r.kit_id as string;
  const installation_id = r.installation_id as string;
  const source_timestamp = r.source_timestamp as string;

  const flatMetrics = {
    voltage_v: pickMetric(metrics, r.voltage_v, 'voltage_v'),
    current_a: pickMetric(metrics, r.current_a, 'current_a'),
    active_power_w: pickMetric(metrics, r.active_power_w, 'active_power_w'),
    reactive_power_var: pickMetric(
      metrics,
      r.reactive_power_var,
      'reactive_power_var',
    ),
    apparent_power_va: pickMetric(
      metrics,
      r.apparent_power_va,
      'apparent_power_va',
    ),
    power_factor: pickMetric(metrics, r.power_factor, 'power_factor'),
    energy_wh_delta: pickMetric(metrics, r.energy_wh_delta, 'energy_wh_delta'),
    frequency_hz: pickMetric(metrics, r.frequency_hz, 'frequency_hz'),
  };

  // raw_payload: conserva el objeto original tal cual fue recibido.
  const raw_payload = r.raw_payload !== undefined ? r.raw_payload : raw;

  // event_hash: recalcula si falta (idempotencia, contrato §5).
  const event_hash =
    typeof r.event_hash === 'string' && r.event_hash.length > 0
      ? r.event_hash
      : computeEventHash({
          device_id,
          source_timestamp,
          metrics: flatMetrics,
        });

  const dto: Record<string, unknown> = {
    device_id,
    kit_id,
    installation_id,
    source_timestamp,
    ...flatMetrics,
    signal_quality: r.signal_quality,
    firmware_version: r.firmware_version,
    raw_payload,
    event_hash,
  };
  if (typeof r.reading_id === 'string') dto.reading_id = r.reading_id;

  // Limpia undefined para no chocar con campos opcionales del schema.
  for (const key of Object.keys(dto)) {
    if (dto[key] === undefined) delete dto[key];
  }

  // Validación de timestamp futuro (antes de la validación de schema, para
  // dar un mensaje específico del canon §6).
  const ts = Date.parse(source_timestamp);
  if (!Number.isNaN(ts) && ts > Date.now() + FUTURE_TOLERANCE_MS) {
    throw new NormalizationError(
      `source_timestamp demasiado futuro (> now + ${FUTURE_TOLERANCE_MS / 1000}s): ${source_timestamp}.`,
    );
  }

  const result = validateIngest(dto);
  if (!result.ok) {
    const detail = result.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join('; ');
    throw new NormalizationError(`payload inválido: ${detail}.`);
  }

  return result.data;
}
