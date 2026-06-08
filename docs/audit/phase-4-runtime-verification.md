# Fase 4 — Verificación de Runtime (Dashboard / Reports / Breakdown / Billing contra Neon)

> Fecha: 2026-06-03 · Rama: `feat/phase-4-dashboard-reports`.
> Registra los resultados reales de las suites de Fase 4 ejecutadas contra Postgres real (Neon dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`). Cubre dashboard, reports (4 granularidades), breakdown y billing, con los conteos y criterios verificados.

## Entorno

- **DB:** Neon Postgres dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled). **Sin migración nueva:** se reutilizan `telemetry_readings`, `energy_aggregates`, `devices`, `device_categories`, `installations`, `tariffs`, `electricity_bills`, `distributors` (Fase 1).
- **Comando:** `set -a; . packages/db/.env; set +a; pnpm --filter @smartsense/api test`.
- **Resultado global API:** **92/92 PASS** (39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown).

## Resultados verificados — Billing (11 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | Tarifa por `installation.tariffId` | `getEffectiveTariffForInstallation` resuelve la tarifa asignada a la instalación | ✅ |
| 2 | Tarifa por boleta confirmed | Sin `tariffId` → tarifa de la boleta `confirmed` más reciente | ✅ |
| 3 | Sin tarifa | Sin `tariffId` ni boleta confirmed → `null` (no inventa) | ✅ |
| 4 | `estimateEnergyCostClp` | `Math.round(energy_kwh * energy_price_clp_kwh)` → entero CLP, `estimated=true` | ✅ |
| 5 | Costeo sin tarifa (BR-031) | `cost_clp = null` cuando no hay tarifa efectiva | ✅ |
| 6 | `estimateSeriesCostClp` | Costea cada punto de la serie con la misma regla | ✅ |

## Resultados verificados — Dashboard (7 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | Dashboard con datos | `current_power_w`, `today_energy_kwh`, `today_cost_clp`, `month_*`, `comparison`, `device_count` poblados | ✅ |
| 2 | `data_status=live` | Última lectura ≤15 min → `live` | ✅ |
| 3 | `data_status=stale` | Última lectura >15 min → `stale` | ✅ |
| 4 | `data_status=empty` | Sin lecturas → `empty`, dashboard usable | ✅ |
| 5 | `cost_clp` null sin tarifa | `today_cost_clp`/`month_cost_clp` = null sin tarifa (BR-031) | ✅ |
| 6 | `alerts_pending_count=0` | Valor literal 0 (Fase 5 no implementada) | ✅ |
| 7 | Cross-tenant | Instalación de otra organización → **403** | ✅ |

## Resultados verificados — Reports (9 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | `reports/daily` | Buckets por hora; `points[]` + `totals` | ✅ |
| 2 | `reports/weekly` | 7 días | ✅ |
| 3 | `reports/monthly` | Días del mes | ✅ |
| 4 | `reports/last-three-months` | 3 meses | ✅ |
| 5 | Buckets vacíos incluidos | Buckets sin datos presentes con `energy_kwh=0` | ✅ |
| 6 | Totales cuadran | `totals` derivados de `points[]` → consistentes | ✅ |
| 7 | `data_status` | `complete|partial|empty` según cobertura | ✅ |
| 8 | `cost_clp` null sin tarifa | Puntos sin tarifa → `cost_clp=null` (BR-031) | ✅ |

## Resultados verificados — Breakdown (9 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | `group_by=device` (default) | `items[]` por device con energía medida | ✅ |
| 2 | `group_by=category` | Agrupación por categoría | ✅ |
| 3 | Rango default | Últimos 7 días si no se especifica `from`/`to` | ✅ |
| 4 | Percentages ~100 | `percentage = energy/total*100`; suman ~100 | ✅ |
| 5 | Total 0 → percentage 0 | Sin energía → `percentage=0`, empty state | ✅ |
| 6 | Solo devices medidos | No incluye devices sin energía (no inventa, no NILM) | ✅ |
| 7 | `total_energy_kwh`/`total_cost_clp` | = Σ items (cost null sin tarifa) | ✅ |
| 8 | Cross-tenant | Instalación de otra organización → **403** | ✅ |

## Criterios transversales verificados

- **Totals cuadran:** en reports y breakdown los totales se derivan de los items/points → consistentes por construcción.
- **Percentages ~100:** breakdown suma ~100 (0 si total 0).
- **`cost_clp` null sin tarifa:** BR-031 respetado en dashboard, reports y breakdown.
- **0 side-effects:** ninguna lectura agregada genera alertas, recomendaciones ni acciones de control.
- **Tenant 403:** acceso cross-tenant rechazado en los 6 endpoints.
- **Empty states:** dashboard `empty`, reports con buckets vacíos, breakdown `total=0` → usables.
- **Estrategia de datos:** agregados preferidos; fallback a telemetría; sin mezcla de fuentes.

## Suites complementarias

| Suite | Resultado | Comando |
|---|---|---|
| iot-bridge | **23/23 PASS** (sin cambios desde Fase 3) | `pnpm --filter @smartsense/iot-bridge test` |
| DB (Fase 1) | **18/18 PASS** (sin cambios) | `pnpm test:db:external` |

## Veredicto

Runtime de Fase 4 verificado end-to-end contra Neon real: billing (tarifa efectiva + costeo entero CLP + null sin tarifa), dashboard (live/stale/empty + comparación + cost null), reports (4 granularidades, buckets vacíos, totales cuadran), breakdown (device/category, percentages ~100, solo medidos), **sin side-effects** de fases posteriores y con tenant-scope (403) verificado. **Fase 4 PASS en runtime.**
