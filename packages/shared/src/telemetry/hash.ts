/**
 * Cálculo determinista de `event_hash` (idempotencia de telemetría).
 * Fuente: specs/07-iot/mqtt-or-ingestion-contract.md §5.
 *
 * event_hash = sha256( device_id | source_timestamp(ISO) | canonical(metrics) ) en hex.
 * `canonical(metrics)`: claves ordenadas, sin espacios, valores como están (null omitido).
 * MISMA función en device/bridge/API → el mismo evento produce el mismo hash.
 *
 * Nota: usa node:crypto. Solo importado por apps/api y apps/iot-bridge (no por apps/web).
 */
import { createHash } from 'node:crypto';

export interface EventHashMetrics {
  voltage_v?: number | null;
  current_a?: number | null;
  active_power_w?: number | null;
  reactive_power_var?: number | null;
  apparent_power_va?: number | null;
  power_factor?: number | null;
  energy_wh_delta?: number | null;
  frequency_hz?: number | null;
}

const METRIC_KEYS: (keyof EventHashMetrics)[] = [
  'active_power_w',
  'apparent_power_va',
  'current_a',
  'energy_wh_delta',
  'frequency_hz',
  'power_factor',
  'reactive_power_var',
  'voltage_v',
];

function canonicalMetrics(m: EventHashMetrics): string {
  // Claves ordenadas (METRIC_KEYS ya está alfabético), omite null/undefined.
  const parts: string[] = [];
  for (const k of METRIC_KEYS) {
    const v = m[k];
    if (v !== null && v !== undefined) parts.push(`${k}=${v}`);
  }
  return parts.join(',');
}

export function computeEventHash(input: {
  device_id: string;
  source_timestamp: string;
  metrics: EventHashMetrics;
}): string {
  const payload = `${input.device_id}|${input.source_timestamp}|${canonicalMetrics(input.metrics)}`;
  return createHash('sha256').update(payload).digest('hex');
}
