/**
 * Contrato de Reports (series temporales agregadas) — Fase 4.
 * snake_case en respuestas. cost_clp / peak_power_w pueden ser null
 * (BR-031: sin tarifa no hay costo; sin telemetría no hay potencia pico).
 */
import { z } from 'zod';
import { uuid, kwh, powerW, clpAmount, isoTimestamp } from './common.js';

/** Periodo/granularidad del reporte. */
export const reportPeriod = z.enum(['daily', 'weekly', 'monthly', 'last_three_months']);
export type ReportPeriod = z.infer<typeof reportPeriod>;

/** Estado de completitud de la serie. */
export const reportDataStatus = z.enum(['complete', 'partial', 'empty']);
export type ReportDataStatus = z.infer<typeof reportDataStatus>;

/** Punto de la serie (un bucket agregado). */
export const reportPoint = z.object({
  bucket_start: isoTimestamp,
  energy_kwh: kwh,
  cost_clp: clpAmount.nullable(),
  peak_power_w: powerW.nullable(),
});
export type ReportPoint = z.infer<typeof reportPoint>;

export const reportResponse = z.object({
  installation_id: uuid,
  period: reportPeriod,
  from: isoTimestamp,
  to: isoTimestamp,
  points: z.array(reportPoint),
  totals: z.object({
    energy_kwh: kwh,
    cost_clp: clpAmount.nullable(),
    peak_power_w: powerW.nullable(),
  }),
  data_status: reportDataStatus,
});
export type ReportResponse = z.infer<typeof reportResponse>;

/**
 * Query de rango para reports. Acepta `date` (ancla) o `from`/`to` explícitos;
 * todos opcionales (el backend resuelve un rango por defecto según `period`).
 */
export const reportRangeQuery = z.object({
  date: isoTimestamp.optional(),
  from: isoTimestamp.optional(),
  to: isoTimestamp.optional(),
});
export type ReportRangeQuery = z.infer<typeof reportRangeQuery>;
