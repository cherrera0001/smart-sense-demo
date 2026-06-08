/**
 * Schemas Zod del módulo breakdown (Fase 4).
 * Reutiliza el contrato de respuesta canónico de @smartsense/shared
 * (breakdownResponse) para mantener un único shape entre API y frontend.
 * snake_case en query y respuesta (alineado con OpenAPI / shared).
 */
import { z } from 'zod';
import {
  breakdownResponse,
  breakdownQuery,
  breakdownGroupBy,
  breakdownItem,
  breakdownDataStatus,
} from '@smartsense/shared';

// Re-export del contrato compartido (response + tipos auxiliares).
export {
  breakdownResponse,
  breakdownQuery,
  breakdownGroupBy,
  breakdownItem,
  breakdownDataStatus,
};
export type {
  BreakdownResponse,
  BreakdownQuery,
  BreakdownGroupBy,
  BreakdownItem,
  BreakdownDataStatus,
} from '@smartsense/shared';

/** Path param de la ruta anidada bajo installation. */
export const breakdownParamSchema = z.object({
  installationId: z.string().uuid(),
});
export type BreakdownParam = z.infer<typeof breakdownParamSchema>;

/**
 * Query del breakdown. `breakdownQuery` de shared ya define
 * { from?, to?, group_by? }; lo reexportamos como el schema de parseo de la ruta.
 */
export const breakdownQuerySchema = breakdownQuery;
