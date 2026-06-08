# Fase 6 — Verificación de Runtime (Control de Dispositivos · dry-run · contra Neon)

> Fecha: 2026-06-04 · Rama: `feat/phase-6-device-control`.
> Registra los resultados reales de la suite de control de Fase 6 ejecutada contra Postgres real (Neon dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`). Cubre control-actions (dry-run), control-state (lógico), control-schedules y consumption-limits, con los conteos y criterios verificados. **Ninguna acción produce efecto físico ni downlink MQTT.**

## Entorno

- **DB:** Neon Postgres dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled). **Migración aditiva 0003** aplicada (`migrate deploy` OK): `control_actions.idempotency_key` (text) + `dry_run` (bool default true) + UNIQUE parcial `(device_id, idempotency_key)`. **No altera enums ni datos.** Reutiliza `control_actions`, `control_schedules`, `consumption_limits`, `devices`, `installations`/`memberships`, `audit_logs` (Fases 1–5). **Sin telemetry/MQTT downlink.**
- **Comando:** `set -a; . packages/db/.env; set +a; pnpm db:migrate:deploy; pnpm --filter @smartsense/api test`.
- **Resultado global API:** **140/140 PASS** (39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations + **26 control**).

## Resultados verificados — Control Actions (dry-run)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | POST `turn_on` dry-run | Persiste `status='success'`+`dry_run=true`+`result{dry_run}`; API expone `status='dry_run'`; **sin downlink** | ✅ |
| 2 | POST `turn_off` dry-run | Igual que turn_on; estado lógico off | ✅ |
| 3 | POST `set_limit` dry-run (como action) | Acción registrada en dry-run; `value`/`source`/`reason` en `payload` | ✅ |
| 4 | Device no controlable | `capabilities.switch≠true` → **409 `DEVICE_NOT_CONTROLLABLE`** (no crea acción) | ✅ |
| 5 | RBAC viewer | viewer → **403** (requiere `ROLES.operate`); sin acción ni downlink | ✅ |
| 6 | Cross-tenant | Device de otra organización → **403** (`assertDeviceAccess`) | ✅ |
| 7 | Idempotencia | Mismo `(device_id, idempotency_key)` → devuelve la acción existente, **no duplica** | ✅ |
| 8 | Audit | `audit_log` `control.requested` + `control.resolved` (append-only) | ✅ |
| 9 | Sin side-effects | No genera `alerts` ni `recommendations` | ✅ |
| 10 | GET control-actions | Lista por device con filtros `status?`/`limit?` | ✅ |

## Resultados verificados — Control State (lógico)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | controllable | `controllable=true` si `capabilities.switch=true` | ✅ |
| 2 | current_state unknown | Sin acción previa → `current_state='unknown'` | ✅ |
| 3 | current_state lógico | Derivado de la **última acción** (on/off), **no físico confirmado** | ✅ |
| 4 | dry_run flag | Respuesta incluye `dry_run:true` | ✅ |

## Resultados verificados — Control Schedules (no ejecuta)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | POST create | `action` turn_on/off; `name`/`value`/`cron`/`starts_at`/`ends_at` en `rule`; audit `control_schedule.created` | ✅ |
| 2 | GET list | Lista los schedules del device | ✅ |
| 3 | PATCH update | Actualiza schedule; audit `control_schedule.updated` | ✅ |
| 4 | RBAC viewer | viewer → **403** | ✅ |
| 5 | Cross-tenant | Device ajeno → **403** | ✅ |
| 6 | `set_limit` diferido | `set_limit`-as-schedule → **422** | ✅ |
| 7 | No ejecuta | NO crea `control_action` (solo persiste política) | ✅ |

## Resultados verificados — Consumption Limits (no ejecuta)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | POST create | `limit_type` power_w/energy_kwh_day/month → `limitPowerW`/`limitKwh`+window; `action` notify→alert/turn_off; audit `consumption_limit.created` | ✅ |
| 2 | `threshold ≤ 0` | → **422** (CHECK > 0) | ✅ |
| 3 | GET list | Lista los límites del device | ✅ |
| 4 | PATCH update | Actualiza límite; audit `consumption_limit.updated` | ✅ |
| 5 | RBAC viewer | viewer → **403** | ✅ |
| 6 | Cross-tenant | Device ajeno → **403** | ✅ |
| 7 | No ejecuta | NO crea `control_action` (solo persiste política) | ✅ |

## Criterios transversales verificados

- **Dry-run:** toda acción persiste `dry_run=true`+`status='success'` y se expone como `status='dry_run'`; **ningún comando físico ni downlink MQTT**.
- **Idempotencia:** `(device_id, idempotency_key)` no duplica acciones (UNIQUE parcial, migración 0003).
- **Capability:** `409 DEVICE_NOT_CONTROLLABLE` si `capabilities.switch≠true`.
- **RBAC:** mutaciones de control requieren `ROLES.operate`; **viewer → 403** (actions/schedules/limits).
- **Tenant-scope:** `assertDeviceAccess`; device de otra organización → **403**.
- **Audit:** `control.requested`/`control.resolved`, `control_schedule.created/updated`, `consumption_limit.created/updated` (append-only).
- **Sin side-effects:** ninguna operación genera `alerts`/`recommendations`; schedules/limits **no ejecutan** acciones.
- **Estado lógico:** `control-state` deriva de la última acción dry-run, **no** del dispositivo físico.
- **Tiempos UTC.**

## Suites complementarias

| Suite | Resultado | Comando |
|---|---|---|
| iot-bridge | **23/23 PASS** (sin cambios desde Fase 3; dry-run, sin downlink) | `pnpm --filter @smartsense/iot-bridge test` |
| DB (Fase 1) | **18/18 PASS** (sin cambios) | `pnpm test:db:external` |

## Veredicto

Runtime de Fase 6 verificado end-to-end contra Neon real: control-actions en **dry-run** (status lógico, idempotencia, 409 no-controlable, viewer 403, tenant 403, audit `control.requested`/`control.resolved`, sin side-effects), control-state **lógico/simulado**, schedules y limits que **persisten política sin ejecutar** (viewer/tenant 403, `set_limit`/`threshold≤0` → 422). **0 downlink físico / 0 MQTT downlink / 0 automatización.** **Fase 6 PASS en runtime.**
