/**
 * Helpers Zod base reutilizables por los schemas de dominio.
 * Convenciones del canon: dinero en CLP entero (>=0), energía en kWh (>=0),
 * potencia en W, timestamps ISO-8601 (timestamptz).
 */
import { z } from 'zod';

/** UUID (v7 en el canon, pero validamos formato UUID genérico). */
export const uuid = z.string().uuid();

/** Monto en CLP: entero no negativo (sin decimales). */
export const clpAmount = z.number().int().nonnegative();

/** Energía en kWh: no negativa. */
export const kwh = z.number().nonnegative();

/** Potencia en W: no negativa. */
export const powerW = z.number().nonnegative();

/** Timestamp ISO-8601 (con offset/Z). */
export const isoTimestamp = z.string().datetime({ offset: true });

/** Query de paginación basada en cursor. */
export const paginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(200).default(50),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Cuerpo de error estándar de la API. */
export const errorResponse = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  traceId: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponse>;
