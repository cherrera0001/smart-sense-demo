/**
 * DEMO_MODE — conmuta la fuente de datos del frontend entre fixtures de
 * demostración (`@/lib/fixtures`) y la API real (`@/lib/api`, futura Fase 2+).
 *
 * Fase 1: NO existe API real todavía, así que la app funciona 100% con fixtures.
 * El default es SEGURO (`true`) para que la demo siga viva aunque la variable
 * no esté definida. Solo se desactiva explícitamente con NEXT_PUBLIC_DEMO_MODE=false
 * y por módulo, cuando su endpoint exista y tenga paridad verificada.
 *
 * Ver: docs/architecture/migration-strategy.md §5 y backend-transition-plan.md §9.
 */
export const DEMO_MODE_DEFAULT = true as const

export const isDemoMode: boolean =
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? String(DEMO_MODE_DEFAULT)).toLowerCase() !== 'false'

/** Útil para banners/badges "DEMO" en la UI sin recalcular el parse. */
export function getDataSource(): 'fixtures' | 'api' {
  return isDemoMode ? 'fixtures' : 'api'
}
