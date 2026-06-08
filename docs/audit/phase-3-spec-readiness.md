# Fase 3 — Spec Readiness (IoT / Telemetría)

> Fecha: 2026-06-03 · Rama: `feat/phase-3-iot-telemetry`.
> Declara el alcance autorizado de Fase 3: qué endpoints se implementan, qué entidades/tablas se usan, qué reglas de negocio y constraints aplican, riesgos y exclusiones explícitas. Sirve de contrato de alcance antes de cerrar la fase.

## Endpoints autorizados (3)

> Todos bajo JWT (`app.authenticate`). Módulo `apps/api/src/modules/telemetry/`.

| Endpoint | Método | Acceso | Descripción |
|---|---|---|---|
| `/iot/telemetry` | POST | `assertInstallationAccess(operate)` | Ingestión idempotente de una lectura; respuesta `{ reading_id, status, event_hash, received_timestamp }` |
| `/installations/{installationId}/telemetry/latest` | GET | `assertInstallationAccess(read)` | Última lectura de la instalación + conteo de devices; empty state OK |
| `/installations/{installationId}/telemetry/range` | GET | `assertInstallationAccess(read)` | Lecturas en rango `[from, to]` con `device_id?` y `limit` (default 500, max 5000) |

## Entidades / tablas de DB usadas

> Sin migración nueva: se reutilizan tablas materializadas en Fase 1.

| Tabla | Uso en Fase 3 |
|---|---|
| `telemetry_readings` | Persistencia de lecturas; idempotencia por `event_hash` UNIQUE; doble timestamp (`source_timestamp` / `received_timestamp`) |
| `energy_aggregates` | Rollup horario (`granularity=hour`) vía `upsertHourBucket`; `energy_kwh=SUM(energy_wh_delta)/1000`, `peak_power_w=MAX(active_power_w)` |
| `devices` (lectura/update) | Validación `kit_id`/`installation_id`, capability meter; actualización `last_seen_at`/`state=online` tras ingest |

## Reglas de negocio aplicables

1. **Idempotencia por `event_hash`** (UNIQUE): lectura nueva → `accepted`; repetida (mismo hash) → `duplicate`. `event_hash` se calcula con `computeEventHash` de `@smartsense/shared` si falta.
2. **No-negatividad** de métricas y `power_factor ∈ [-1, 1]` (validación Zod → 422).
3. **Timestamp válido**: `source_timestamp` no puede ser futuro más allá de `now + 120s` (422 `INVALID_TIMESTAMP`). `received_timestamp` lo fija el backend.
4. **No cross-tenant**: `assertInstallationAccess` con scoping por `organization_id`; acceso ajeno → 403. En `range`, `device_id` ajeno → 4xx.
5. **Coherencia device/kit/installation**: `device.kitId === kit_id` y `device.installationId === installation_id`; mismatch → 409 `DEVICE_KIT_MISMATCH`; device inexistente → 404.
6. **Capability meter**: rechaza ingestión si el device tiene `meter === false` explícito.
7. **Rango válido**: `from <= to` (422 si no); `limit` acotado (default 500, max 5000).
8. **Side-effect post-ingest**: actualiza device (`lastSeenAt`/`state=online`) y ejecuta `upsertHourBucket` (agregación inline).

## Constraints aplicables (a nivel DB, Fase 1)

- `telemetry_readings`: CHECK no-negatividad y `power_factor ∈ [-1,1]`; UNIQUE de idempotencia (físicamente `(event_hash, source_timestamp)` por requisito de hypertable).
- `energy_aggregates`: UNIQUE compuesto `(installation_id, device_id, category_id, granularity, bucket_start)`; CHECK `energy_kwh ≥ 0`.

## Riesgos

1. **`event_hash` con `device_id` (no `kit_qr`/`device_ref`)**: la API recibe UUIDs ya resueltos, por lo que el hash usa `device_id`. Desviación respecto del `.md` MQTT §5; coherente para el plano API.
2. **Telemetría sin auditoría**: por alto volumen, la ingestión **no** escribe `audit_logs` (decisión documentada). Riesgo de menor trazabilidad fina de ingestión.
3. **Agregación inline (no worker)**: `upsertHourBucket` se ejecuta en el path de ingest; el worker real (rollup day/semana/mes, recompute batch) queda diferido.
4. **Device auth = JWT de usuario**: aún no hay API key / token con scope de kit; hardening de auth de dispositivo diferido a Fase 7.

## Exclusiones explícitas (NO en Fase 3)

- **Dashboard** (`GET /installations/{id}/dashboard`) → Fase 4.
- **Reportes** (`reports/daily|weekly|monthly|last-three-months`) → Fase 4.
- **Costos CLP** (BillingService/TariffService): la agregación **no** calcula `cost_clp` → Fase 4+.
- **Alertas** y **recomendaciones** → Fase 5.
- **Control** de dispositivos → Fase 6.
- **NILM / desagregación** → fuera de alcance MVP.
- **MQTT productivo / broker real**: el `iot-bridge` corre en `dry-run` por defecto; conexión a broker productivo → Fase posterior.
- **Worker de agregación real** (day/semana/mes, recompute batch) → Fase posterior.

## Veredicto

Alcance de Fase 3 acotado y trazable: 3 endpoints, 2 tablas reutilizadas (+`devices`), reglas de idempotencia/validación/tenant-scope/capability definidas, riesgos y exclusiones explícitos. **Fase 3 lista para implementar y cerrar dentro de este alcance.**
