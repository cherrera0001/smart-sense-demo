/**
 * Contrato de respuesta del Dashboard (Fase 4).
 * snake_case en las respuestas (igual que telemetry). Montos CLP enteros o null
 * (BR-031: sin tarifa, los campos *_cost_clp quedan null). alerts_pending_count
 * es literal 0 en Fase 4 (alerts es fase posterior).
 */
import { z } from 'zod';
import { uuid, kwh, powerW, clpAmount } from './common.js';

/** Comparación contra el periodo anterior (mes vs mes previo). */
export const dashboardComparison = z.object({
  previous_period_energy_kwh: kwh.nullable(),
  delta_percent: z.number().nullable(),
});
export type DashboardComparison = z.infer<typeof dashboardComparison>;

/** Estado de los datos del dashboard. */
export const dashboardDataStatus = z.enum(['live', 'stale', 'empty']);
export type DashboardDataStatus = z.infer<typeof dashboardDataStatus>;

export const dashboardResponse = z.object({
  installation_id: uuid,
  current_power_w: powerW.nullable(),
  today_energy_kwh: kwh,
  today_cost_clp: clpAmount.nullable(),
  month_energy_kwh: kwh,
  month_cost_clp: clpAmount.nullable(),
  comparison: dashboardComparison,
  latest_reading_timestamp: z.string().nullable(),
  device_count: z.number().int().nonnegative(),
  alerts_pending_count: z.literal(0),
  data_status: dashboardDataStatus,
});
export type DashboardResponse = z.infer<typeof dashboardResponse>;
