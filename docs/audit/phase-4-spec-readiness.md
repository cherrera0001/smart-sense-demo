# Fase 4 — Spec Readiness (Dashboard / Reports / Breakdown · backend)

> Fecha: 2026-06-03 · Rama: `feat/phase-4-dashboard-reports`.
> Declara el alcance autorizado de Fase 4 (plano backend): qué endpoints de lectura agregada se implementan, qué entidades/tablas se reutilizan, qué reglas de negocio (costeo CLP, tenant-scope, empty states) y exclusiones aplican, más riesgos. Sirve de contrato de alcance antes de cerrar la fase.

## Endpoints autorizados (6)

> Todos bajo JWT (`app.authenticate`) y `assertInstallationAccess(read)`. Solo **lectura agregada** (sin escritura). Costeo CLP vía `BillingService`.

| # | Endpoint | Método | Acceso | Descripción |
|---|---|---|---|---|
| 1 | `/installations/{id}/dashboard` | GET | `assertInstallationAccess(read)` | Estado vivo + acumulados del día/mes + comparación periodo anterior + `data_status` |
| 2 | `/installations/{id}/reports/daily` | GET | `assertInstallationAccess(read)` | Serie por horas del día; `points[]` + `totals` + `data_status` |
| 3 | `/installations/{id}/reports/weekly` | GET | `assertInstallationAccess(read)` | Serie por 7 días; `points[]` + `totals` + `data_status` |
| 4 | `/installations/{id}/reports/monthly` | GET | `assertInstallationAccess(read)` | Serie por días del mes; `points[]` + `totals` + `data_status` |
| 5 | `/installations/{id}/reports/last-three-months` | GET | `assertInstallationAccess(read)` | Serie por 3 meses; `points[]` + `totals` + `data_status` |
| 6 | `/installations/{id}/breakdown` | GET | `assertInstallationAccess(read)` | Desglose por `device` (default) o `category`; `items[]` con `percentage` + totales + `data_status` |

## Entidades / tablas de DB usadas

> **Sin migración nueva:** se reutilizan tablas materializadas en Fase 1; el MER no se altera.

| Tabla | Uso en Fase 4 |
|---|---|
| `telemetry_readings` | Fallback de cómputo cuando no hay agregados: `SUM(energy_wh_delta)/1000`, `MAX(active_power_w)`; última lectura para `current_power_w`/`latest_reading_timestamp` |
| `energy_aggregates` | Fuente preferida en rango (granularidad adecuada); `energy_kwh`, `peak_power_w` por bucket |
| `devices` | `device_count`, nombre/categoría e id para `breakdown` (group_by device) |
| `device_categories` | Agrupación en `breakdown?group_by=category` |
| `installations` | Resolución de tenant (`assertInstallationAccess`) y `tariffId` para costeo |
| `tariffs` | Tarifa efectiva (vía `installation.tariffId`) para `estimateEnergyCostClp` |
| `electricity_bills` | Fallback de tarifa: tarifa de la boleta `confirmed` más reciente |
| `distributors` | Catálogo asociado a tarifas/boletas (lectura indirecta) |

## Reglas de negocio aplicables

1. **BR-031 — Costeo CLP solo energía, nunca inventado.** `BillingService.estimateEnergyCostClp = Math.round(energyKwh * tariff.energyPriceClpKwh)` (entero CLP, `estimated=true`). **Si no hay tarifa efectiva → `cost_clp = null`** (no se inventa valor monetario). Solo cargo por **energía**; cargo fijo/demanda/punta-valle son fase posterior.
2. **Tarifa efectiva** (`getEffectiveTariffForInstallation`): `installation.tariffId` → tarifa de la **boleta `confirmed` más reciente** → `null`. Determinista; sin fallback inventado.
3. **Tenant-scope.** `assertInstallationAccess(read)` con scoping por `organization_id`; acceso a instalación de otra organización → **403**. Ninguna respuesta expone datos cross-tenant.
4. **Empty states.** Toda respuesta es usable sin datos: dashboard `data_status=empty`; reports incluyen **buckets vacíos** (`energy_kwh=0`, `cost_clp` según tarifa) y `data_status` ∈ `complete|partial|empty`; breakdown con `total=0` → `items` vacío/`percentage=0`, `data_status=empty`.
5. **Estrategia de datos (común).** Se prefieren `energy_aggregates` en el rango; si no hay agregados, **fallback** a `telemetry_readings`. **Nunca se mezclan ambas fuentes** en el mismo cómputo (evita doble conteo).
6. **Consistencia de totales.** En reports, `totals` se derivan de `points[]` → cuadran por construcción. En breakdown, `total_energy_kwh = Σ items.energy_kwh` y `percentage = energy/total*100` (0 si total 0; suman ~100).
7. **Solo datos medidos.** El breakdown lista **solo devices con energía medida** (no inventa consumo ni desagrega por NILM).
8. **Tiempos en UTC.** Todos los buckets/rangos en UTC; el timezone de la instalación para presentación es fase posterior.
9. **`alerts_pending_count = 0` (literal).** El dashboard expone el campo, pero Fase 5 (alertas) no está implementada → valor fijo `0`.

## `data_status` (semántica)

| Endpoint | Valores | Criterio |
|---|---|---|
| dashboard | `live` · `stale` · `empty` | `live` con lectura ≤15 min; `stale` si la última lectura es >15 min; `empty` sin lecturas |
| reports | `complete` · `partial` · `empty` | `complete` todos los buckets con datos; `partial` algunos; `empty` ninguno |
| breakdown | `complete` · `partial` · `empty` | análogo, sobre devices con energía medida |

## Exclusiones explícitas (NO en Fase 4)

- **Alertas** (`/alerts`, `/alerts/{id}/review`) y **recomendaciones** (`/recommendations`) → Fase 5. `alerts_pending_count` queda fijo en 0.
- **Control** de dispositivos (`/devices/{id}/control-*`) → Fase 6.
- **NILM / desagregación** de cargas no medidas → fuera de alcance MVP.
- **Predicción / proyección** de consumo/costo → fase posterior (V1).
- **Costeo completo** (cargo fijo, demanda, punta-valle, tramos horarios) → fase posterior; Fase 4 solo cargo por energía.
- **Timezone local** de presentación → fase posterior (todo en UTC).
- **UI en vivo / WebSocket**: la demo sigue bajo DEMO_MODE; los métodos `energyApi.*` del web client son preparatorios (no usados por la UI).

## Riesgos

1. **Costeo parcial (solo energía):** el `cost_clp` subestima la boleta real (sin cargo fijo/demanda/horario). Documentado; se completa en fase posterior.
2. **Tiempos UTC:** los buckets "día"/"mes" se calculan en UTC, no en el timezone de la instalación; puede desfasar fronteras de día respecto de la percepción del usuario.
3. **Breakdown solo medido:** cargas sin medidor no aparecen; el total puede ser menor al consumo real de la instalación (no NILM).
4. **`alerts_pending_count` fijo en 0:** el dashboard no refleja alertas reales hasta Fase 5.
5. **Superset de OpenAPI:** las respuestas implementadas son más ricas que el shape original del `openapi.yaml` (extensión contract-first). Se documenta como superset; el `yaml` conserva los paths.
6. **Contract-first manual:** alineación OpenAPI ↔ código cotejada a mano (sin tooling en CI), consistente con Fases 2/3.

## Veredicto

Alcance de Fase 4 acotado y trazable: **6 endpoints de lectura agregada** (dashboard + 4 reports + breakdown), 8 tablas reutilizadas (sin migración), reglas de costeo (BR-031), tenant-scope, empty states y estrategia de datos (agregados→fallback telemetría sin mezclar) definidas; exclusiones (alertas/recs/control/NILM/predicción) y riesgos explícitos. **Fase 4 lista para implementar y cerrar dentro de este alcance.**
