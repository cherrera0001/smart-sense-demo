/**
 * Tipos/schemas del BillingService (Fase 4).
 *
 * BR-030/BR-031: el costo monetario se calcula SIEMPRE en backend y NUNCA se
 * inventa. Si no hay tarifa/boleta base aplicable, `costClp` queda en `null` y
 * `estimated=false`.
 */
import { z } from 'zod';

/** Origen del cálculo de costo. */
export const costBasis = z.enum(['tariff', 'none']);
export type CostBasis = z.infer<typeof costBasis>;

/** Resultado de una estimación de costo puntual. */
export const costEstimate = z.object({
  /** CLP entero (>=0) o null si no hay base de cálculo. */
  costClp: z.number().int().nonnegative().nullable(),
  /** true solo si se aplicó una tarifa real. */
  estimated: z.boolean(),
  basis: costBasis,
  /** code de la tarifa aplicada (solo cuando basis='tariff'). */
  tariffCode: z.string().optional(),
});
export type CostEstimate = z.infer<typeof costEstimate>;

/** Punto de una serie con su costo resuelto. */
export const seriesCostPoint = z.object({
  energyKwh: z.number().nonnegative(),
  costClp: z.number().int().nonnegative().nullable(),
});
export type SeriesCostPoint = z.infer<typeof seriesCostPoint>;

/** Resultado de estimar una serie completa con una única resolución de tarifa. */
export const seriesCostEstimate = z.object({
  points: z.array(seriesCostPoint),
  totalCostClp: z.number().int().nonnegative().nullable(),
  estimated: z.boolean(),
  basis: costBasis,
  tariffCode: z.string().optional(),
});
export type SeriesCostEstimate = z.infer<typeof seriesCostEstimate>;
