/**
 * Contrato de Breakdown (desglose de consumo por device o categoría) — Fase 4.
 * snake_case en respuestas. cost_clp puede ser null (BR-031: sin tarifa no hay costo).
 * `percentage` es el % de energía del item respecto al total del periodo.
 */
import { z } from 'zod';
import { uuid, kwh, clpAmount, isoTimestamp } from './common.js';

/** Dimensión de agrupación del desglose. */
export const breakdownGroupBy = z.enum(['device', 'category']);
export type BreakdownGroupBy = z.infer<typeof breakdownGroupBy>;

/** Estado de los datos del desglose. */
export const breakdownDataStatus = z.enum(['complete', 'partial', 'empty']);
export type BreakdownDataStatus = z.infer<typeof breakdownDataStatus>;

/** Item del desglose (un device o una categoría). */
export const breakdownItem = z.object({
  id: uuid,
  name: z.string(),
  category: z.string().nullable(),
  energy_kwh: kwh,
  cost_clp: clpAmount.nullable(),
  percentage: z.number().min(0).max(100),
});
export type BreakdownItem = z.infer<typeof breakdownItem>;

export const breakdownResponse = z.object({
  installation_id: uuid,
  from: isoTimestamp,
  to: isoTimestamp,
  group_by: breakdownGroupBy,
  items: z.array(breakdownItem),
  total_energy_kwh: kwh,
  total_cost_clp: clpAmount.nullable(),
  data_status: breakdownDataStatus,
});
export type BreakdownResponse = z.infer<typeof breakdownResponse>;

/** Query de breakdown: rango opcional + dimensión de agrupación. */
export const breakdownQuery = z.object({
  from: isoTimestamp.optional(),
  to: isoTimestamp.optional(),
  group_by: breakdownGroupBy.optional(),
});
export type BreakdownQuery = z.infer<typeof breakdownQuery>;
