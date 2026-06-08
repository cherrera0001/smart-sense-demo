# Fase 4 — Auditoría OpenAPI ↔ Implementación (Dashboard / Reports / Breakdown)

> Fecha: 2026-06-03 · Rama: `feat/phase-4-dashboard-reports`.
> Reconcilia el contrato OpenAPI (`specs/04-api/openapi.yaml` / `api-overview.md`) con los endpoints de lectura agregada implementados en `apps/api/src/modules/` (dashboard, reports, breakdown) y su cobertura de tests, para el alcance de Fase 4.
> **Verificación contract-first manual:** los paths fueron cotejados 1:1 contra el contrato a mano (sin tooling automático de validación OpenAPI). Cada endpoint implementado existe en el contrato y viceversa para el alcance de Fase 4.

## Endpoints de Fase 4 (implementados)

> 6 endpoints. Todos: presentes en OpenAPI (`OpenAPI=sí`), implementados (`Implementado=sí`), con cobertura de tests (`Test=sí`), **Estado=PASS**.
> Tests: **25 tests de Fase 4 PASS** (dashboard 7 + reports 9 + breakdown 9) dentro de la suite API (**92/92** total contra Neon real: 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown).

| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| GET `/installations/{id}/dashboard` | sí | sí | sí (7) | PASS |
| GET `/installations/{id}/reports/daily` | sí | sí | sí | PASS |
| GET `/installations/{id}/reports/weekly` | sí | sí | sí | PASS |
| GET `/installations/{id}/reports/monthly` | sí | sí | sí | PASS |
| GET `/installations/{id}/reports/last-three-months` | sí | sí | sí | PASS |
| GET `/installations/{id}/breakdown` | sí | sí | sí (9) | PASS |

> Reports: 9 tests cubren las 4 granularidades (`daily`/`weekly`/`monthly`/`last-three-months`) + empty/partial states + consistencia de totales.

**Total Fase 4: 6/6 endpoints — OpenAPI=sí, Implementado=sí, Test=sí, Estado=PASS.**

## Nota de superset (extensión contract-first)

Las respuestas implementadas son un **superset** del shape original del `openapi.yaml`: los **paths se conservan 1:1**, pero los cuerpos de respuesta son **más ricos** que el contrato original:

- **dashboard:** `current_power_w`, `today_energy_kwh`, `today_cost_clp`, `month_energy_kwh`, `month_cost_clp`, `comparison{previous_period_energy_kwh, delta_percent}`, `latest_reading_timestamp`, `device_count`, `alerts_pending_count` (=0, Fase 5), `data_status`.
- **reports:** `points[{bucket_start, energy_kwh, cost_clp, peak_power_w}]` (incluye buckets vacíos), `totals` (derivados de `points` → cuadran), `data_status`.
- **breakdown:** `items[{id, name, category, energy_kwh, cost_clp, percentage}]`, `total_energy_kwh`, `total_cost_clp`, `data_status`.

**Decisión documentada:** se trata el shape implementado como **extensión contract-first** (superset retrocompatible: campos nuevos sobre los paths existentes). **No se reescribe el `openapi.yaml`**; se anota como superset. Recomendación: reconciliar el `yaml` con estos shapes en Fase 7 (hardening) junto con la incorporación de validación OpenAPI en CI.

## Cobertura de casos de prueba (resumen)

Los 25 tests de Fase 4 cubren, además del happy path:
- **dashboard:** `data_status` live/stale(>15min)/empty; `comparison.delta_percent`; `cost_clp` null sin tarifa; `device_count`; `alerts_pending_count=0`; 403 cross-tenant.
- **reports (4 granularidades):** buckets vacíos incluidos; `totals` derivados de `points` (cuadran); `data_status` complete/partial/empty; `cost_clp` null sin tarifa.
- **breakdown:** group_by device (default) y category; `percentage` suma ~100 (0 si total 0); solo devices con energía medida; `total_energy_kwh`/`total_cost_clp`; empty state; 403 cross-tenant.
- **billing (11 tests):** `getEffectiveTariffForInstallation` (tariffId → boleta confirmed → null), `estimateEnergyCostClp` (entero CLP, null sin tarifa, BR-031), `estimateSeriesCostClp`.
- **0 side-effects:** ninguna lectura agregada genera alertas, recomendaciones ni acciones de control.

## Endpoints en OpenAPI NO implementados (Fase 5+)

> Presentes en el contrato pero **DIFERIDOS** por fase; fuera del alcance de Fase 4.

| Grupo | Endpoint(s) | Estado | Fase prevista |
|---|---|---|---|
| Bills | POST/GET `/installations/{id}/bills` | DIFERIDO | Fase posterior (UI/CRUD boletas) |
| Alerts / Recommendations | GET `/installations/{id}/{alerts,recommendations}`, PATCH `/alerts/{id}/review` | DIFERIDO | Fase 5 |
| Control | POST `/devices/{id}/control-*`, GET `/devices/{id}/control-state` | DIFERIDO | Fase 6 |

## Nota contract-first

La alineación OpenAPI ↔ código se realizó de forma **manual** (sin tooling automático de validación de esquema), consistente con Fases 2 y 3. Se recomienda incorporar validación OpenAPI en CI en Fase 7 (hardening), incluyendo la reconciliación del `yaml` con los shapes superset de Fase 4.

## Veredicto

Contrato y código alineados 1:1 a nivel de **paths** para los 6 endpoints de Fase 4 (verificación manual); los shapes implementados son un **superset** documentado del contrato. Cobertura de tests completa (25/25 Fase 4, dentro de 92/92 API contra Neon real). Endpoints de fases posteriores correctamente diferidos. **Fase 4 PASS.**
