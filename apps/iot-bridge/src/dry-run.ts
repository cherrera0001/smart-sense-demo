/**
 * Modo dry-run: NO realiza HTTP. Simula el reenvío y devuelve un resumen.
 * Loguea un resumen seguro (sin secretos).
 */
import type { TelemetryIngest } from './telemetry-contract.js';

export interface DryRunResult {
  readonly wouldSend: true;
  readonly endpoint: '/iot/telemetry';
  readonly event_hash: string;
}

export function dryRun(dto: TelemetryIngest): DryRunResult {
  const result: DryRunResult = {
    wouldSend: true,
    endpoint: '/iot/telemetry',
    event_hash: dto.event_hash ?? '',
  };

  // Resumen seguro: solo identificadores y métrica principal, nunca secretos.
  console.log(
    `[dry-run] wouldSend POST ${result.endpoint} ` +
      `device=${dto.device_id} kit=${dto.kit_id} ts=${dto.source_timestamp} ` +
      `active_power_w=${dto.active_power_w ?? 'null'} event_hash=${result.event_hash}`,
  );

  return result;
}
