# Fase 3 — Verificación de Runtime (Telemetría contra Neon)

> Fecha: 2026-06-03 · Rama: `feat/phase-3-iot-telemetry`.
> Registra los resultados reales de la suite de telemetría ejecutada contra Postgres real (Neon dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`). Cubre ingest/duplicate, latest, range y agregación, con los conteos y criterios verificados.

## Entorno

- **DB:** Neon Postgres dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled). Sin migración nueva: tablas `telemetry_readings` y `energy_aggregates` de Fase 1.
- **Comando:** `set -a; . packages/db/.env; set +a; pnpm --filter @smartsense/api test`.
- **Resultado global API:** **56/56 PASS** (39 Fase 2 + 17 telemetría).

## Resultados verificados (telemetría, 17 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | Ingest lectura nueva | 200 `status=accepted`, fila creada en `telemetry_readings`, `event_hash` presente, `received_timestamp` fijado por backend | ✅ |
| 2 | Ingest duplicado | Re-ingest del mismo `event_hash` → 200 `status=duplicate`, **sin** doble inserción (idempotencia por UNIQUE) | ✅ |
| 3 | Device inexistente | `device_id` desconocido → **404** | ✅ |
| 4 | Cross-tenant | Instalación/device de otra organización → **403** | ✅ |
| 5 | Device/kit/installation mismatch | `device.kitId !== kit_id` o `installationId` distinto → **409** `DEVICE_KIT_MISMATCH` | ✅ |
| 6 | Métricas negativas | Potencia/energía negativa → **422** (Zod) | ✅ |
| 7 | `power_factor` fuera de rango | `power_factor` ∉ `[-1,1]` → **422** | ✅ |
| 8 | Timestamp futuro | `source_timestamp > now+120s` → **422** `INVALID_TIMESTAMP` | ✅ |
| 9 | Latest con datos | `latestReading` poblada + `deviceCount` + `receivedTimestamp` | ✅ |
| 10 | Latest vacío | Instalación sin lecturas → `latestReading: null` (empty state) | ✅ |
| 11 | Range OK | Rango válido → `readings` dentro de `[from,to]` | ✅ |
| 12 | Range `from > to` | **422** (rango inválido) | ✅ |
| 13 | Range device ajeno | `device_id` de otro tenant → 4xx | ✅ |
| 14 | Agregación inline | Tras ingest se crea/actualiza fila en `energy_aggregates` (granularity `hour`), `energy_kwh=SUM/1000`, `peak_power_w=MAX` | ✅ |
| 15 | 0 side-effects | La ingestión **no** genera alertas, recomendaciones ni acciones de control | ✅ |

> Los 17 tests agrupan estos criterios (varios comparten describe). El conteo reportado por el runner es 17 tests de telemetría dentro de la suite API.

## Agregación — verificación específica

- `upsertHourBucket` crea bucket `hour` con clave compuesta única; re-ingest del mismo periodo **no** duplica el bucket (idempotencia por unique key de `energy_aggregates`).
- `energy_kwh = SUM(energy_wh_delta)/1000`; `peak_power_w = MAX(active_power_w)`.
- **Sin `cost_clp`** (costeo diferido a Fase 4+).

## Suites complementarias

| Suite | Resultado | Comando |
|---|---|---|
| iot-bridge | **23/23 PASS** (normalizer 10, contract 6, http-forwarder 7) | `pnpm --filter @smartsense/iot-bridge test` |
| DB (Fase 1) | **18/18 PASS** (sin cambios) | `pnpm test:db:external` |

## Veredicto

Runtime de telemetría verificado end-to-end contra Neon real: ingestión idempotente (`accepted`/`duplicate`), validaciones (404/403/409/422), lectura (latest/range incl. empty y `from>to`) y agregación horaria, **sin side-effects** de fases posteriores. **Fase 3 PASS en runtime.**
