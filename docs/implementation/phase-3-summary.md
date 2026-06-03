# Fase 3 — Resumen de Implementación (IoT / Telemetría)

> Fecha: 2026-06-03 · Rama: `feat/phase-3-iot-telemetry` · Monorepo `smartsense-brownfield`.
> Implementa la ingestión idempotente de telemetría, lectura (latest/range), agregación energética horaria y el `iot-bridge` en modo dry-run, sobre la DB de Fase 1 (Neon real) y la API de Fase 2. Estrategia A (Preserve UI) intacta: la demo no consume la API.

## Qué se implementó

### Módulo `telemetry` (`apps/api/src/modules/telemetry/`)
3 endpoints, todos bajo JWT (`app.authenticate`):

- **POST `/iot/telemetry`** — body `{ device_id, kit_id, installation_id, source_timestamp, voltage_v?, current_a?, active_power_w?, reactive_power_var?, apparent_power_va?, power_factor?, energy_wh_delta?, frequency_hz?, signal_quality?, firmware_version?, raw_payload?, reading_id?, event_hash? }`. Respuesta 200 `{ reading_id, status: accepted|duplicate, event_hash, received_timestamp }`.
  - **Idempotente** por `event_hash` (UNIQUE): nuevo → `accepted`, repetido → `duplicate`.
  - **Validaciones:** `assertInstallationAccess(operate)`; device existe (404 si no); `device.kitId===kit_id` y `device.installationId===installation_id` (mismatch → 409 `DEVICE_KIT_MISMATCH`); capability meter (rechaza si `meter===false` explícito); no-negativos y `power_factor ∈ [-1,1]` (Zod → 422); `source_timestamp` no futuro `> now+120s` (422 `INVALID_TIMESTAMP`).
  - `received_timestamp` lo fija el backend; `event_hash` se calcula con `computeEventHash` de `@smartsense/shared` si falta.
  - **Post-ingest:** actualiza device (`lastSeenAt`/`state=online`) y ejecuta `upsertHourBucket` (agregación inline).
- **GET `/installations/{installationId}/telemetry/latest`** — `assertInstallationAccess(read)`; `{ installationId, latestReading|null, deviceCount, receivedTimestamp|null }`. Empty state OK.
- **GET `/installations/{installationId}/telemetry/range`** — query `{ from, to, device_id?, limit(default 500, max 5000) }` (`from<=to`, 422 si no); `device_id` ajeno → 4xx; `{ installationId, range, readings }`.

### Agregación (`energy-aggregation.service.ts`)
- `upsertHourBucket` / `upsertDayBucket` → `energy_aggregates` (granularity `hour`/`day`); `energyKwh = SUM(energy_wh_delta)/1000`, `peakPowerW = MAX(active_power_w)`.
- **Idempotente** por unique key. **Sin `costClp`** (costeo diferido). Worker real diferido: se ejecuta **inline** tras ingest, solo `hour`.

### Shared (`packages/shared`)
- Añadidos `telemetryIngestSchema`, `telemetryRangeQuerySchema`, `telemetryIngestResult`.
- `computeEventHash` (sha256 de `device_id | source_timestamp | canonical(metrics)`) en `packages/shared/src/telemetry/hash.ts` (`node:crypto`, solo backend; se añadió `@types/node` a shared).

### `iot-bridge` (`apps/iot-bridge`) — dry-run
- Modos `IOT_BRIDGE_MODE = dry-run | mqtt | file` (default `dry-run`).
- Archivos: `config.ts` (env + `maskSecret`, nunca imprime secretos), `telemetry-contract.ts` (`validateIngest`), `normalizer.ts` (mapea forma MQTT `metrics{}` o plana → DTO plano, conserva `raw_payload`, calcula `event_hash`, rechaza negativos / `power_factor` / timestamp futuro), `http-forwarder.ts` (POST `/iot/telemetry`, Bearer si hay token, no filtra token), `dry-run.ts` (no HTTP), `mqtt-client.ts` (import dinámico de `mqtt`, NO conecta salvo modo `mqtt`).
- Fixtures: `valid-reading`, `duplicate-reading` (mismo `event_hash`), `invalid-negative-power`, `invalid-future-timestamp`.
- `mqtt` como dependencia, pero **no conecta** por defecto.

## Qué NO se implementó (Fase 4+)
- **Dashboard** y **reportes** — Fase 4.
- **Costos CLP** (BillingService/TariffService): la agregación no calcula `cost_clp` — Fase 4+.
- **Alertas** y **recomendaciones** — Fase 5.
- **Control** de dispositivos — Fase 6.
- **NILM / desagregación** — fuera de MVP.
- **MQTT productivo** / broker real — fase posterior (bridge en dry-run).
- **Worker de agregación real** (day/semana/mes, recompute batch) — fase posterior.
- Conexión real frontend ↔ API (la demo sigue bajo DEMO_MODE; scaffold `apps/web/lib/api/client.ts` intacto).

## Decisiones técnicas y desviaciones documentadas
1. **`event_hash` usa `device_id`** (no `kit_qr`/`device_ref` del `.md` MQTT §5) porque la API recibe UUIDs ya resueltos. Coherente con el plano API.
2. **Telemetría NO audita** (`audit_logs`): alto volumen de ingestión. Documentado como decisión consciente.
3. **Agregación inline:** `upsertHourBucket` se ejecuta en el path de ingest; el worker real (rollup day/semana/mes, recompute batch) es fase posterior.
4. **Device auth = JWT de usuario:** API key / token con scope de kit es hardening de Fase 7.
5. **Sin migración nueva:** se reutilizan `telemetry_readings` y `energy_aggregates` de Fase 1; el MER no se altera.

## Idempotencia
- **Ingestión:** `event_hash` UNIQUE; lectura repetida → `duplicate` (sin doble inserción). `computeEventHash` determinista (sha256 sobre `device_id | source_timestamp | canonical(metrics)`).
- **Agregación:** `upsertHourBucket` idempotente por unique key compuesto de `energy_aggregates`; re-ingest no duplica buckets.

## Validaciones
- No-negatividad de métricas y `power_factor ∈ [-1,1]` (Zod → 422).
- `source_timestamp` no futuro `> now+120s` (422 `INVALID_TIMESTAMP`).
- Coherencia device/kit/installation (409 `DEVICE_KIT_MISMATCH`); device inexistente → 404; capability meter (rechaza `meter===false`).
- Rango `from<=to` (422); `limit` acotado (default 500, max 5000).

## Tenant-scope
- POST: `assertInstallationAccess(operate)`; GET latest/range: `assertInstallationAccess(read)`. Acceso ajeno → 403. En `range`, `device_id` de otro tenant → 4xx. Sin fugas entre organizaciones.

## Tests
- **API: 56/56 PASS contra Neon real** (`pnpm --filter @smartsense/api test`): 39 de Fase 2 + **17 de telemetría** (ingest accepted/duplicate, 404 device inexistente, 403 cross-tenant, 409 mismatch, 422 negativos/power_factor/timestamp futuro, latest OK/empty, range OK/from>to/device ajeno, agregación crea `energy_aggregates`, 0 side-effects de alertas/recs/control).
- **iot-bridge: 23/23 PASS** (`pnpm --filter @smartsense/iot-bridge test`): normalizer 10, contract 6, http-forwarder 7.
- **DB: 18/18 PASS** (suite `db` contra Neon, sin cambios respecto de Fase 1).
- `typecheck -r` ✅; `build:api`/`build:iot-bridge`/`build:web` ✅ (web 12 rutas demo intacta bajo DEMO_MODE); `lint` ✅ (1 warning preexistente).

## Riesgos abiertos
1. **Sin auditoría de ingestión** (decisión por volumen): menor trazabilidad fina de telemetría.
2. **Agregación inline, no worker:** solo `hour` en el path de ingest; rollup day/semana/mes y recompute batch pendientes.
3. **Device auth = JWT de usuario:** API key / token de kit pendiente (Fase 7).
4. **Sin costeo CLP** en agregados: dependerá de BillingService/TariffService (Fase 4+).
5. **MQTT productivo no validado:** bridge solo verificado en dry-run; broker real pendiente.
6. **Contract-first manual:** alineación OpenAPI ↔ código cotejada a mano (sin tooling en CI).
7. Warning preexistente de lint (deuda demo, no bloqueante).

## Comandos para reproducir
```bash
pnpm install
pnpm -r typecheck
pnpm build:api
pnpm build:iot-bridge
pnpm build:web                # demo (12 rutas, DEMO_MODE)
pnpm -r lint                  # 1 warning preexistente

# Tests de API contra Neon real (DATABASE_URL en packages/db/.env, gitignored):
set -a; . packages/db/.env; set +a
pnpm --filter @smartsense/api test          # 56/56 PASS (39 Fase 2 + 17 telemetría)

# Tests del iot-bridge (no requieren DB ni broker):
pnpm --filter @smartsense/iot-bridge test   # 23/23 PASS
```

## Siguiente fase
**Fase 4 — Dashboard y reportes (frontend + endpoints de lectura agregada):** `GET /installations/{id}/dashboard`, `reports/{daily,weekly,monthly,last-three-months}`, costeo CLP (BillingService/TariffService) y la UI en vivo sobre la telemetría ingerida. Dependencias: Fase 2 (auth/installations) + Fase 3 (telemetría/agregados). **AUTORIZABLE.**
