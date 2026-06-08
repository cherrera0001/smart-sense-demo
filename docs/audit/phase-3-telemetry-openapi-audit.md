# Fase 3 — Auditoría OpenAPI ↔ Implementación (Telemetría)

> Fecha: 2026-06-03 · Rama: `feat/phase-3-iot-telemetry`.
> Reconcilia el contrato OpenAPI (`specs/04-api/openapi.yaml` / `api-overview.md`) con los endpoints de telemetría implementados en `apps/api/src/modules/telemetry/` y su cobertura de tests, para el alcance de Fase 3.
> **Verificación contract-first manual:** los paths fueron cotejados 1:1 contra el contrato a mano (no se usó tooling automático de validación OpenAPI). Cada endpoint implementado existe en el contrato y viceversa para el alcance de Fase 3.

## Endpoints de Fase 3 (implementados)

> 3 endpoints. Todos: presentes en OpenAPI (`OpenAPI=sí`), implementados (`Implementado=sí`), con cobertura de tests (`Test=sí`), **Estado=PASS**.
> Tests: **17 tests de telemetría PASS** dentro de la suite API (56/56 total contra Neon real: 39 de Fase 2 + 17 de telemetría).

| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| POST `/iot/telemetry` | sí | sí | sí | PASS |
| GET `/installations/{installationId}/telemetry/latest` | sí | sí | sí | PASS |
| GET `/installations/{installationId}/telemetry/range` | sí | sí | sí | PASS |

**Total Fase 3: 3/3 endpoints — OpenAPI=sí, Implementado=sí, Test=sí, Estado=PASS.**

## Cobertura de casos de prueba (resumen)

Los 17 tests de telemetría cubren, además del happy path:
- **POST /iot/telemetry:** `accepted` (lectura nueva), `duplicate` (mismo `event_hash`), **404** device inexistente, **403** cross-tenant, **409** `DEVICE_KIT_MISMATCH`, **422** negativos / `power_factor` fuera de `[-1,1]` / `source_timestamp` futuro (`INVALID_TIMESTAMP`).
- **GET telemetry/latest:** OK con lectura y empty state (`latestReading: null`).
- **GET telemetry/range:** OK, **422** `from > to`, device ajeno → 4xx.
- **Agregación:** la ingestión crea/actualiza filas en `energy_aggregates` (granularity `hour`).
- **0 side-effects:** sin alertas, recomendaciones ni acciones de control generadas por la ingestión.

## Endpoints en OpenAPI NO implementados (Fase 4+)

> Presentes en el contrato pero **DIFERIDOS** por fase; fuera del alcance de Fase 3.

| Grupo | Endpoint(s) | Estado | Fase prevista |
|---|---|---|---|
| Dashboard | GET `/installations/{installationId}/dashboard` | DIFERIDO | Fase 4 |
| Reports | GET `/installations/{installationId}/reports/{daily,weekly,monthly,last-three-months}` | DIFERIDO | Fase 4 |
| Breakdown | GET `/installations/{installationId}/breakdown` | DIFERIDO | Fase 5 |
| Alerts / Recommendations | GET `/installations/{installationId}/{alerts,recommendations}`, PATCH `/alerts/{id}/review` | DIFERIDO | Fase 5 |
| Control | POST `/devices/{deviceId}/control-*`, GET `/devices/{deviceId}/control-state` | DIFERIDO | Fase 6 |

## Nota contract-first

La alineación OpenAPI ↔ código se realizó de forma **manual** (sin tooling automático de validación de esquema). Se recomienda incorporar validación OpenAPI en CI en Fase 7 (hardening), consistente con la observación equivalente de Fase 2.

## Veredicto

Contrato y código alineados 1:1 para los 3 endpoints de telemetría de Fase 3 (verificación manual). Cobertura de tests completa (17/17 telemetría, dentro de 56/56 API contra Neon real). Endpoints de fases posteriores correctamente diferidos. **Fase 3 PASS.**
