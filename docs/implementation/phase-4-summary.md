# Fase 4 — Resumen de Implementación (Dashboard / Reports / Breakdown · backend)

> Fecha: 2026-06-03 · Rama: `feat/phase-4-dashboard-reports` · Monorepo `smartsense-brownfield`.
> Implementa el plano **backend** de Fase 4: lectura agregada para dashboard, reportes (4 granularidades) y desglose por device/categoría, más el `BillingService` (costeo CLP solo energía), sobre la DB de Fase 1 (Neon real) y la telemetría/agregados de Fase 3. Estrategia A (Preserve UI) intacta: la demo no consume la API (DEMO_MODE).

## Qué se implementó

### `BillingService` (`apps/api/src/modules/billing/`)
- **`getEffectiveTariffForInstallation`** — resuelve la tarifa efectiva: `installation.tariffId` → tarifa de la **boleta `confirmed` más reciente** → `null`. Determinista; nunca inventa tarifa.
- **`estimateEnergyCostClp`** — `Math.round(energyKwh * tariff.energyPriceClpKwh)` → **entero CLP**, `estimated=true`. **`null` si no hay tarifa (BR-031).** Solo cargo por **energía** (cargo fijo/demanda/punta-valle = fase posterior).
- **`estimateSeriesCostClp`** — costea una serie de puntos energéticos con la misma regla.
- **11 tests.**

### Endpoint dashboard (`apps/api/src/modules/...`)
- **GET `/installations/{id}/dashboard`** (JWT + `assertInstallationAccess(read)`):
  `current_power_w` (última lectura), `today_energy_kwh`, `today_cost_clp`, `month_energy_kwh`, `month_cost_clp`, `comparison{previous_period_energy_kwh, delta_percent}`, `latest_reading_timestamp`, `device_count`, `alerts_pending_count=0` (literal; Fase 5 no implementada), `data_status` ∈ `live|stale(>15min)|empty`.
- **7 tests.**

### Endpoints reports
- **GET `/installations/{id}/reports/{daily|weekly|monthly|last-three-months}`** (JWT + `read`):
  `points[{bucket_start, energy_kwh, cost_clp, peak_power_w}]` (buckets vacíos incluidos), `totals` (derivados de `points` → cuadran), `data_status` ∈ `complete|partial|empty`.
  - `daily` = horas · `weekly` = 7 días · `monthly` = días del mes · `last-three-months` = 3 meses.
- **9 tests.**

### Endpoint breakdown
- **GET `/installations/{id}/breakdown?from&to&group_by`** (JWT + `read`):
  `group_by` = `device` (default) | `category`; rango default = últimos 7 días.
  `items[{id, name, category, energy_kwh, cost_clp, percentage}]`, `percentage = energy/total*100` (0 si total 0; suman ~100), `total_energy_kwh`, `total_cost_clp`, `data_status`.
  - **Solo devices con energía medida** (no inventa, no NILM).
- **9 tests.**

### Shared schemas (`packages/shared/src/schemas/`)
- `dashboard.ts`, `reports.ts`, `breakdown.ts` — contratos de respuesta compartidos.

### Web client (preparatorio, `apps/web/lib/api/client.ts`)
- Añadidos `energyApi.getDashboard`, `getReports*`, `getBreakdown` **preparatorios**: no usados por la UI; fallan bajo DEMO_MODE. **DEMO_MODE sigue `true`; la demo queda intacta.**

## Estrategia de datos (común a los 3 grupos)
- Se **prefieren `energy_aggregates`** en el rango (granularidad adecuada).
- Si no hay agregados, **fallback a `telemetry_readings`**: `energy_kwh = SUM(energy_wh_delta)/1000`, `peak_power_w = MAX(active_power_w)`.
- **NO se mezclan fuentes** en el mismo cómputo (evita doble conteo).
- **Tiempos en UTC** (timezone de instalación para presentación = fase posterior).

## Reglas de costo CLP (BR-031)
- Costeo en **backend** siempre; el cliente nunca calcula CLP.
- `cost_clp = Math.round(energy_kwh * tariff.energy_price_clp_kwh)` (entero), solo **cargo por energía**.
- **Sin tarifa efectiva → `cost_clp = null`** (nunca se inventa valor monetario).
- Cargo fijo, demanda, punta-valle y tramos horarios: **fase posterior**.

## Empty states
- **dashboard:** `data_status=empty` sin lecturas; campos numéricos coherentes (0 / null según corresponda).
- **reports:** buckets vacíos incluidos; `data_status` `complete|partial|empty`; `totals` siguen cuadrando.
- **breakdown:** `total=0` → `items` vacío / `percentage=0`, `data_status=empty`.

## Tenant-scope
- Los 6 endpoints bajo JWT + `assertInstallationAccess(read)`; acceso a instalación de otra organización → **403**. Sin fugas cross-tenant.

## Qué NO se implementó (Fase 5+)
- **Alertas** (`/alerts`, `/alerts/{id}/review`) y **recomendaciones** (`/recommendations`) — Fase 5. `alerts_pending_count` queda fijo en 0.
- **Control** de dispositivos — Fase 6.
- **NILM / desagregación** de cargas no medidas — fuera de MVP.
- **Predicción / proyección** de consumo/costo — fase posterior (V1).
- **Costeo completo** (cargo fijo/demanda/punta-valle/horario) — fase posterior.
- **Timezone local** de presentación — fase posterior (todo en UTC).
- **UI en vivo / WebSocket** — la demo sigue bajo DEMO_MODE; los métodos `energyApi.*` son preparatorios.
- **Sin migración nueva** — se reutilizan tablas de Fase 1; el MER no se altera.

## Decisiones técnicas y desviaciones documentadas
1. **Costeo solo energía** (BR-031): cargo fijo/demanda/horario diferidos.
2. **Tiempos en UTC:** buckets de día/mes en UTC, no en tz de la instalación.
3. **Breakdown solo dispositivos medidos:** no NILM; el total puede ser menor al consumo real.
4. **`alerts_pending_count = 0` literal:** Fase 5 no implementada.
5. **Superset de OpenAPI:** las respuestas son más ricas que el shape original del `openapi.yaml`; se documenta como **extensión contract-first** (paths conservados, shapes superset). No se reescribe el `yaml`.
6. **Sin migración nueva:** reutiliza `telemetry_readings`, `energy_aggregates`, `devices`, `device_categories`, `installations`, `tariffs`, `electricity_bills`, `distributors`.

## Tests
- **API: 92/92 PASS contra Neon real** (`pnpm --filter @smartsense/api test`): 39 Fase 2 + 17 telemetría + **11 billing** + **7 dashboard** + **9 reports** + **9 breakdown**. Incluye: 0 side-effects (alerts/recommendations/control=0), tenant-scope 403, empty states, totals consistentes (derivados de points), percentages ~100, `cost_clp` null sin tarifa.
- **iot-bridge: 23/23 PASS** (sin cambios respecto de Fase 3).
- **DB: 18/18 PASS** (suite `db` contra Neon, sin cambios).
- `typecheck -r` ✅; `build:api`/`build:web` ✅ (web 12 rutas demo intacta bajo DEMO_MODE); `lint` ✅ (1 warning preexistente).

## Riesgos abiertos / limitaciones
1. **Costeo parcial (solo energía):** `cost_clp` subestima la boleta real (sin cargo fijo/demanda/horario).
2. **Tiempos UTC:** fronteras de día/mes pueden desfasar respecto del tz local del usuario.
3. **Breakdown solo medido:** cargas sin medidor no aparecen (no NILM).
4. **`alerts_pending_count` fijo en 0:** sin alertas reales hasta Fase 5.
5. **Superset OpenAPI:** `yaml` pendiente de reconciliar con los shapes implementados (Fase 7).
6. **Contract-first manual:** alineación OpenAPI ↔ código cotejada a mano (sin tooling en CI).
7. Warning preexistente de lint (deuda demo, no bloqueante).

## Comandos para reproducir
```bash
pnpm install
pnpm -r typecheck
pnpm build:api
pnpm build:web                # demo (12 rutas, DEMO_MODE)
pnpm -r lint                  # 1 warning preexistente

# Tests de API contra Neon real (DATABASE_URL en packages/db/.env, gitignored):
set -a; . packages/db/.env; set +a
pnpm --filter @smartsense/api test          # 92/92 PASS (39 F2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown)

# Suites complementarias (sin cambios desde Fase 3):
pnpm --filter @smartsense/iot-bridge test   # 23/23 PASS
pnpm test:db:external                        # 18/18 PASS
```

## Siguiente fase
**Fase 5 — Desglose avanzado, alertas y recomendaciones:** `AlertService` (anomaly/high_device/over_budget/offline; dedup; orden por severidad), `RecommendationService` (impacto CLP solo con tarifa), `NotificationService`, y la UI `/breakdown` + `/alerts`. El `alerts_pending_count` del dashboard pasará a reflejar alertas reales. Dependencias: Fase 3 (agregados) + Fase 4 (dashboard/reports/breakdown + BillingService). **AUTORIZABLE.**
