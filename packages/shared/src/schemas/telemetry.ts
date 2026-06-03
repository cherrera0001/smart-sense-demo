/**
 * Contrato de lectura energética (telemetry).
 * Fuente: `specs/07-iot/telemetry-model.md` §1 y §6.
 * Los campos coinciden exactamente con `telemetry_readings`.
 *
 * Validaciones del canon (§6):
 *  - No negativos: voltage_v, current_a, active_power_w, apparent_power_va,
 *    energy_wh_delta.
 *  - Rango: power_factor ∈ [-1, 1].
 *  - source_timestamp / received_timestamp como timestamptz ISO.
 */
import { z } from 'zod';
import { isoTimestamp, uuid } from './common.js';
import { ingestionStatusValues } from '../domain/enums.js';

/** Lectura cruda emitida por device/bridge antes de resolución/validación API. */
export const telemetryReadingInput = z.object({
  reading_id: uuid,
  source_timestamp: isoTimestamp,
  voltage_v: z.number().nonnegative().nullable().optional(),
  current_a: z.number().nonnegative().nullable().optional(),
  active_power_w: z.number().nonnegative().nullable().optional(),
  reactive_power_var: z.number().nullable().optional(),
  apparent_power_va: z.number().nonnegative().nullable().optional(),
  power_factor: z.number().min(-1).max(1).nullable().optional(),
  energy_wh_delta: z.number().nonnegative().nullable().optional(),
  frequency_hz: z.number().nonnegative().nullable().optional(),
  signal_quality: z.number().int().nullable().optional(),
  firmware_version: z.string().nullable().optional(),
  raw_payload: z.unknown().nullable().optional(),
  event_hash: z.string().min(1),
});
export type TelemetryReadingInput = z.infer<typeof telemetryReadingInput>;

/** Lectura persistida: input + campos resueltos por la API. */
export const telemetryReading = telemetryReadingInput.extend({
  device_id: uuid,
  kit_id: uuid,
  installation_id: uuid,
  received_timestamp: isoTimestamp,
  ingestion_status: z.enum(
    ingestionStatusValues as [string, ...string[]],
  ),
});
export type TelemetryReading = z.infer<typeof telemetryReading>;

/** Respuesta de ingesta (idempotencia por event_hash, §3). */
export const telemetryIngestionResponse = z.object({
  reading_id: uuid,
  ingestion_status: z.enum(ingestionStatusValues as [string, ...string[]]),
  duplicate: z.boolean(),
});
export type TelemetryIngestionResponse = z.infer<
  typeof telemetryIngestionResponse
>;

/**
 * Body de POST /iot/telemetry (Fase 3). El emisor envía los UUID de resolución
 * (device/kit/installation); `event_hash` y `reading_id` son opcionales (la API los
 * calcula/genera si faltan). Métricas opcionales con las mismas validaciones del canon.
 */
export const telemetryIngestSchema = z.object({
  device_id: uuid,
  kit_id: uuid,
  installation_id: uuid,
  source_timestamp: isoTimestamp,
  voltage_v: z.number().nonnegative().nullable().optional(),
  current_a: z.number().nonnegative().nullable().optional(),
  active_power_w: z.number().nonnegative().nullable().optional(),
  reactive_power_var: z.number().nullable().optional(),
  apparent_power_va: z.number().nonnegative().nullable().optional(),
  power_factor: z.number().min(-1).max(1).nullable().optional(),
  energy_wh_delta: z.number().nonnegative().nullable().optional(),
  frequency_hz: z.number().nonnegative().nullable().optional(),
  signal_quality: z.number().int().nullable().optional(),
  firmware_version: z.string().nullable().optional(),
  raw_payload: z.unknown().nullable().optional(),
  reading_id: uuid.optional(),
  event_hash: z.string().min(1).optional(),
});
export type TelemetryIngest = z.infer<typeof telemetryIngestSchema>;

/** Resultado de ingesta expuesto por la API (Fase 3). */
export const telemetryIngestResult = z.object({
  reading_id: uuid,
  status: z.enum(['accepted', 'duplicate']),
  event_hash: z.string(),
  received_timestamp: isoTimestamp,
});
export type TelemetryIngestResult = z.infer<typeof telemetryIngestResult>;

/** Query de GET /installations/{id}/telemetry/range. from<=to; limit acotado. */
export const telemetryRangeQuerySchema = z
  .object({
    from: isoTimestamp,
    to: isoTimestamp,
    device_id: uuid.optional(),
    limit: z.coerce.number().int().min(1).max(5000).default(500),
  })
  .refine((q) => new Date(q.from).getTime() <= new Date(q.to).getTime(), {
    message: 'from debe ser <= to',
    path: ['from'],
  });
export type TelemetryRangeQuery = z.infer<typeof telemetryRangeQuerySchema>;
