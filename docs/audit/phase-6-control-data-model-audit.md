# Fase 6 — Auditoría Modelo de Datos de Control

> Fecha: 2026-06-04. Reconciliación del contrato Fase 6 contra `schema.prisma`. Decisión: migración **aditiva** mínima (solo `control_actions`); schedules/limits mapean a columnas/enums canónicos; `rule`/`payload` jsonb absorben campos del API.

| Entidad | Tabla | Campo requerido (API) | Existe | Brecha | Decisión |
|---|---|---|---|---|---|
| ControlAction | control_actions | action (turn_on/off/set_limit) | ✅ `type` (ControlActionType) | — | usar `type` |
| | | status (pending/…/dry_run) | ✅ `status` (4 valores, sin dry_run) | falta dry_run | persistir `status=success` + **`dry_run=true`**; API expone `status='dry_run'` (derivado) |
| | | **idempotency_key** | ❌ | falta | **migración 0003**: `idempotency_key text` + UNIQUE parcial `(device_id, idempotency_key)` |
| | | **dry_run** | ❌ | falta | **migración 0003**: `dry_run boolean default true` |
| | | value / source / reason | ❌ columnas | — | en `payload` jsonb |
| | | resolved_at / result_payload | ✅ `resolvedAt` / `result` | — | usar |
| ControlSchedule | control_schedules | action (turn_on/off/set_limit) | ✅ `action` (turn_on/off, **sin set_limit**) | set_limit | API schedule: solo turn_on/off; **set_limit-as-schedule diferido** (documentado; solapa con consumption-limits) |
| | | name/value/cron/starts_at/ends_at/enabled | parcial (`enabled` sí; resto no) | columnas | en `rule` jsonb (`enabled` columna) |
| ConsumptionLimit | consumption_limits | limit_type (power_w/energy_kwh_day/month) | ✅ `limitPowerW`/`limitKwh`+`window` | — | mapeo: power_w→limitPowerW; energy_kwh_day→limitKwh+window=day; energy_kwh_month→limitKwh+window=month |
| | | threshold | ✅ (en limitPowerW/limitKwh) | — | CHECK>0 (ya existe) |
| | | action (notify/turn_off/set_limit) | ✅ `actionOnExceed` (alert/turn_off) | notify, set_limit | notify→`alert`; turn_off→turn_off; **set_limit-as-limit diferido** |

## Migración 0003 (aditiva, no destructiva)
Solo `control_actions`: `idempotency_key text NULL`, `dry_run boolean NOT NULL DEFAULT true`, `UNIQUE(device_id, idempotency_key) WHERE idempotency_key IS NOT NULL`. **No altera enums** (evita riesgos de `ALTER TYPE ADD VALUE` transaccional) **ni datos**.

## Reconciliación de status/dry-run
- Toda acción Fase 6 es **dry-run**: `dry_run=true`, `status` persistido = `success` (resuelta lógicamente, sin downlink), `resolved_at=now`, `result={dry_run:true,...}`. API serializa `status='dry_run'`.
- Idempotencia: misma `(device_id, idempotency_key)` ⇒ devuelve la acción existente (no duplica).
