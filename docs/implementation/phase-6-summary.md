# Fase 6 — Resumen de Implementación (Control de Dispositivos · backend · dry-run)

> Fecha: 2026-06-04 · Rama: `feat/phase-6-device-control` · Monorepo `smartsense-brownfield`.
> Implementa el plano **backend** de Fase 6: módulo `control` con **9 endpoints** de control de dispositivos en **dry-run** (acciones puntuales, estado lógico, programaciones y límites de consumo), sobre la DB de Fases 1–5 (Neon real). **Ninguna acción envía comando físico ni downlink MQTT.** Estrategia A (Preserve UI) intacta: la demo no consume la API (DEMO_MODE).

## Qué se implementó

### Módulo `control` (`apps/api/src/modules/control/`) — 9 endpoints

Todos bajo JWT + `assertDeviceAccess` (tenant-scope device→installation→organization). **Todos en dry-run** (sin downlink físico, sin iot-bridge downlink).

- **POST `/devices/{deviceId}/control-actions`** (header `Idempotency-Key` opcional) — RBAC **`ROLES.operate`** (viewer → 403). Requiere `capabilities.switch=true`; si no → **409 `DEVICE_NOT_CONTROLLABLE`**. Idempotente por `(deviceId, idempotency_key)`. Persiste `status='success'` + `dry_run=true` + `result{dry_run}`; el API expone `status='dry_run'` (derivado). Audit `control.requested` + `control.resolved`. `value`/`source`/`reason` en `payload`.
- **GET `/devices/{deviceId}/control-actions`** (`status?`, `limit?`) — lista las acciones del device.
- **GET `/devices/{deviceId}/control-state`** — `{ device_id, controllable, current_state(on|off|unknown), last_action, dry_run:true }`. **Estado LÓGICO/simulado** derivado de la última acción, **no físico confirmado**.
- **POST/GET `/devices/{deviceId}/control-schedules`**, **PATCH `/control-schedules/{id}`** — `action` `turn_on`/`turn_off` (`set_limit`-as-schedule → **422**, diferido); `name`/`value`/`cron`/`starts_at`/`ends_at` en `rule` jsonb. Audit `control_schedule.created`/`updated`. **NO ejecuta** (sin scheduler).
- **POST/GET `/devices/{deviceId}/consumption-limits`**, **PATCH `/consumption-limits/{id}`** — `limit_type` `power_w`→`limitPowerW` / `energy_kwh_day`→`limitKwh`+window `day` / `energy_kwh_month`→`limitKwh`+window `month`; `action` `notify`→`alert`|`turn_off` (`set_limit` → **422**, diferido); `threshold>0` (**422** si ≤0). Audit `consumption_limit.created`/`updated`. **NO ejecuta** (solo persiste política).

### Migración aditiva 0003 (`packages/db/prisma/migrations/0003_phase6_control/`)
- `ALTER TABLE control_actions ADD COLUMN idempotency_key text NULL` + `dry_run boolean NOT NULL DEFAULT true` + `UNIQUE (device_id, idempotency_key) WHERE idempotency_key IS NOT NULL` (índice único parcial).
- **Aditiva y no destructiva:** no altera enums existentes ni datos. Evita `ALTER TYPE ADD VALUE` (riesgo transaccional): el status `dry_run` se deriva en el API y `set_limit`-as-schedule/limit queda diferido. Aplicada con `migrate deploy` OK contra Neon dev.

### Shared schemas (`packages/shared/src/schemas/control.ts`)
- Extendido con los DTOs de control-actions/state/schedules/consumption-limits (validación Zod en la app).

### Web client (preparatorio, `apps/web/lib/api/client.ts`)
- Añadido `controlApi` con **9 métodos PREPARATORIOS**: no usados por la UI; fallan bajo DEMO_MODE. **DEMO_MODE sigue `true`; la demo queda intacta.**

## Qué NO se implementó (Fase 7+ / fase futura)
- **MQTT downlink productivo** y **comandos físicos reales** (on/off físico) — fase futura (canal IoT autenticado por kit).
- **`resolveAction` async** (ACK/timeout, resolución por bridge) — fase futura; en Fase 6 la acción resuelve lógicamente en la misma request.
- **Automatización autónoma**: scheduler ejecutor, reacción automática a alertas/límites, smart-control real — fase futura.
- **`control-state` físico confirmado** — el estado actual es **lógico/simulado** (derivado de la última acción), no leído del dispositivo.
- **UI productiva** (`/control`, `/smart-control`) — entrega frontend posterior.
- **Hardening** (seguridad/observabilidad/E2E/despliegue) — Fase 7.

## Reglas de negocio
- **Dry-run only:** ninguna acción envía comando físico; `dry_run=true`, `status` lógico `dry_run`. **No MQTT/iot-bridge downlink.**
- **RBAC operate+** (owner/admin/operator) en todas las mutaciones; **viewer → 403**.
- **Capability:** `turn_on`/`turn_off` (y `set_limit`-as-action) requieren `capabilities.switch=true`; device no controlable → **409 `DEVICE_NOT_CONTROLLABLE`**.
- **Idempotencia** por `(device_id, idempotency_key)` (header `Idempotency-Key`): misma clave ⇒ devuelve la acción existente, no duplica.
- **Auditoría obligatoria** (append-only): `control.requested` + `control.resolved`, `control_schedule.created`/`updated`, `consumption_limit.created`/`updated`.
- **Schedules y limits solo persisten política**; NO ejecutan acciones (sin scheduler productivo).
- **Nunca** crear alerts/recommendations ni reaccionar a ellas automáticamente (0 side-effects).

## Reconciliación contrato ↔ canon (decisión SDD)
- **status dry_run derivado:** persiste `status='success'`+`dry_run=true`+`resolved_at=now`+`result{dry_run:true}`; el API serializa `status='dry_run'`.
- **`set_limit` diferido:** como schedule y como limit → 422 (solapa con consumption-limits / pendiente de canal real).
- **limit `action`:** `notify` ↔ `alert`; `turn_off` ↔ `turn_off`.
- **`power_w`** usa `window='day'` como placeholder; el serializer decide el `limit_type` por `limitPowerW != null`.
- **`value`/`source`/`reason`** de la acción viven en `payload` jsonb; `name`/`value`/`cron`/`starts_at`/`ends_at` del schedule en `rule` jsonb.
- Detalle completo: `docs/audit/phase-6-control-data-model-audit.md`.

## Tenant-scope · RBAC · Audit
- Los 9 endpoints bajo JWT; mutaciones y lecturas con `assertDeviceAccess` (device→installation→organization); device de otra organización → **403**. Sin fugas cross-tenant.
- **RBAC:** las mutaciones de control requieren `ROLES.operate`; **viewer → 403** (verificado en tests para actions/schedules/limits).
- **Audit:** toda mutación escribe `audit_log` (append-only): `control.requested`/`control.resolved`, `control_schedule.created`/`updated`, `consumption_limit.created`/`updated`.

## Tests
- **API: 140/140 PASS contra Neon real** (`pnpm --filter @smartsense/api test`): 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations + **26 control**. Cubre: actions turn_on/off/set_limit dry-run, 409 no-controlable, viewer 403, cross-tenant 403, idempotencia sin duplicar, audit `control.requested`/`control.resolved`, sin alerts/recommendations, state controllable/unknown/lógico, schedules create/list/patch + viewer/tenant 403 + `set_limit` 422 + no crea action, limits create/`threshold≤0` 422/list/patch + viewer/tenant 403 + no crea action.
- **iot-bridge: 23/23 PASS** (sin cambios respecto de Fase 3; sigue en dry-run, sin downlink).
- **DB: 18/18 PASS** (suite `db` contra Neon, sin cambios).
- `typecheck -r` ✅; `build:api`/`build:web` ✅ (web 12 rutas demo intacta bajo DEMO_MODE); `lint` ✅ (1 warning preexistente).

## Riesgos abiertos / limitaciones
1. **Sin efecto físico:** toda la fase es dry-run; el control real exige un canal IoT autenticado por kit, confirmación de dispositivo, rollback y rate-limit (fase futura). Ver `docs/security/phase-6-control-safety.md`.
2. **`control-state` es lógico, no físico:** `current_state` se infiere de la última acción dry-run, **no** del dispositivo real → puede divergir del estado físico.
3. **Schedules/limits no se ejecutan:** solo persisten política; sin scheduler ni motor de aplicación.
4. **`set_limit` diferido** (como schedule y como limit → 422): pendiente de canal real / reconciliación con consumption-limits.
5. **Idempotencia depende del cliente:** sin `Idempotency-Key`, reintentos pueden crear acciones distintas (cada una dry-run).
6. **Superset OpenAPI:** `yaml` pendiente de reconciliar con los shapes implementados (Fase 7).
7. Warning preexistente de lint (deuda demo, no bloqueante).
8. **Recordatorio de seguridad:** rotar la contraseña de Neon que pudo quedar expuesta en chat (no está trackeada en el repo, pero conviene rotarla).

## Comandos para reproducir
```bash
pnpm install
pnpm -r typecheck
pnpm build:api
pnpm build:web                # demo (12 rutas, DEMO_MODE)
pnpm -r lint                  # 1 warning preexistente

# Migración aditiva 0003 + tests de API contra Neon real (DATABASE_URL en packages/db/.env, gitignored):
set -a; . packages/db/.env; set +a
pnpm db:migrate:deploy                       # incluye 0003_phase6_control (aditiva)
pnpm --filter @smartsense/api test           # 140/140 PASS (+ 26 control)

# Suites complementarias (sin cambios desde Fase 3):
pnpm --filter @smartsense/iot-bridge test    # 23/23 PASS
pnpm test:db:external                         # 18/18 PASS
```

## Siguiente fase
**Fase 7 — Hardening:** seguridad (CSP/HSTS, URLs firmadas de boleta, rate limiting global, secret-scan/SAST en CI), observabilidad (logging estructurado, métricas, trazas), E2E completo (incl. control cross-tenant/offline) y pruebas de carga, backups/DR y retención, documentación de despliegue y contrato API final. Para el **control real** (downlink), las precondiciones de seguridad se detallan en `docs/security/phase-6-control-safety.md`. **AUTORIZABLE.**
