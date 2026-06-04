# Fase 6 — Auditoría OpenAPI ↔ Implementación (Control de Dispositivos · dry-run)

> Fecha: 2026-06-04 · Rama: `feat/phase-6-device-control`.
> Reconcilia el contrato OpenAPI (`specs/04-api/openapi.yaml` / `api-overview.md`) con los endpoints de control implementados en `apps/api/src/modules/control/` y su cobertura de tests, para el alcance de Fase 6.
> **Verificación contract-first manual:** los paths se cotejaron 1:1 contra el contrato a mano (sin tooling automático de validación OpenAPI), consistente con Fases 2–5.
> **Toda la fase es dry-run:** ninguna acción envía comando físico ni downlink MQTT; ver `docs/security/phase-6-control-safety.md`.

## Endpoints de Fase 6 (implementados)

> 9 endpoints en `apps/api/src/modules/control/`, todos bajo JWT + `assertDeviceAccess`. **26 tests de Fase 6 PASS** dentro de la suite API (**140/140** total contra Neon real: 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations + **26 control**).

| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| POST `/devices/{deviceId}/control-actions` | sí | sí | sí (26) | PASS |
| GET `/devices/{deviceId}/control-actions` | sí (superset) | sí | sí | PASS |
| GET `/devices/{deviceId}/control-state` | sí | sí | sí | PASS |
| POST `/devices/{deviceId}/control-schedules` | sí | sí | sí | PASS |
| GET `/devices/{deviceId}/control-schedules` | sí (superset) | sí | sí | PASS |
| PATCH `/control-schedules/{id}` | sí (superset) | sí | sí | PASS |
| POST `/devices/{deviceId}/consumption-limits` | sí | sí | sí | PASS |
| GET `/devices/{deviceId}/consumption-limits` | sí (superset) | sí | sí | PASS |
| PATCH `/consumption-limits/{id}` | sí (superset) | sí | sí | PASS |

**Total Fase 6: 9/9 endpoints — OpenAPI=sí, Implementado=sí, Test=sí, Estado=PASS.**

> El `openapi.yaml` (Control) declara los paths base POST `/devices/{deviceId}/control-actions`, GET `/devices/{deviceId}/control-state`, POST `/devices/{deviceId}/control-schedules` y POST `/devices/{deviceId}/consumption-limits`. Los GET de colección (`control-actions`/`control-schedules`/`consumption-limits`) y los PATCH (`/control-schedules/{id}`, `/consumption-limits/{id}`) son extensión contract-first del mismo recurso (lectura/edición), consistente con el patrón REST del contrato.

## Nota de reconciliación (canon = persistencia; API mapea)

El vocabulario del prompt de Fase 6 **no coincide 1:1** con el canon/Prisma. Se reconcilió tratando la persistencia como verdad y mapeando en el API (decisión SDD ya registrada en `docs/audit/phase-6-control-data-model-audit.md` y `phase-6-spec-readiness.md`):

| Aspecto | API (expuesto) | Canon/Prisma (persistencia) | Reconciliación |
|---|---|---|---|
| ControlAction `action` | `turn_on`/`turn_off`/`set_limit` | `type` (ControlActionType) | usar `type`. |
| ControlAction `status` (dry-run) | `dry_run` (derivado) | `status='success'` + **`dry_run=true`** | dry-run lógico: persiste `success`+`dry_run`, API serializa `status='dry_run'`. |
| ControlAction `idempotency_key` / `dry_run` | header `Idempotency-Key` / campo | **columnas nuevas** | aportadas por **migración aditiva 0003** + UNIQUE parcial `(device_id, idempotency_key)`. |
| ControlAction `value`/`source`/`reason` | campos del API | `payload` (jsonb) | absorbidos en `payload`. |
| ControlSchedule `action` | `turn_on`/`turn_off` | `action` (turn_on/off, **sin set_limit**) | `set_limit`-as-schedule **diferido** → 422 (solapa con consumption-limits). `name`/`value`/`cron`/`starts_at`/`ends_at` en `rule` jsonb. |
| ConsumptionLimit `limit_type` | `power_w`/`energy_kwh_day`/`energy_kwh_month` | `limitPowerW` / `limitKwh`+`window` | power_w→`limitPowerW`; energy_kwh_day→`limitKwh`+window=`day`; energy_kwh_month→`limitKwh`+window=`month` (power_w usa `window='day'` placeholder; serializer decide por `limitPowerW!=null`). |
| ConsumptionLimit `action` | `notify`/`turn_off` | `actionOnExceed` (`alert`/`turn_off`) | notify→`alert`; turn_off→turn_off; `set_limit`-as-limit **diferido** → 422. `threshold>0` (422 si ≤0). |

**Migración 0003 = aditiva y no destructiva:** solo `control_actions` (+`idempotency_key text NULL`, `dry_run boolean NOT NULL DEFAULT true`, UNIQUE parcial); **no altera enums ni datos**. Aplicada con `migrate deploy` OK contra Neon dev. Evita `ALTER TYPE ADD VALUE` (riesgo transaccional) modelando `set_limit` diferido y `dry_run` status como derivado.

## Nota de superset (extensión contract-first)

Como en Fases 4–5, los cuerpos de respuesta implementados son un **superset** del shape original del `openapi.yaml` (**paths base conservados 1:1**, shapes más ricos + endpoints de lectura/edición del mismo recurso):

- **control-actions (POST):** `{ id, device_id, action, status:'dry_run', dry_run:true, value, source, reason, requested_at, resolved_at, result{dry_run} }`.
- **control-actions (GET):** `{ device_id, items[...], total }` con filtros `status?`/`limit?`.
- **control-state (GET):** `{ device_id, controllable, current_state(on|off|unknown), last_action, dry_run:true }` — estado **lógico/simulado** desde la última acción, no físico confirmado.
- **control-schedules (POST/GET/PATCH):** `{ id, device_id, action, name, value, cron, starts_at, ends_at, enabled }` (campos de `rule` jsonb).
- **consumption-limits (POST/GET/PATCH):** `{ id, device_id, limit_type, threshold, action, window, pre_alert_pct, enabled }`.

**Decisión documentada:** se trata el shape implementado como **extensión contract-first** (superset retrocompatible). **No se reescribe el `openapi.yaml`**; se reconcilia el `yaml` con estos shapes (y los de Fases 4–5) en Fase 7 (hardening) junto con la incorporación de validación OpenAPI en CI.

## Cobertura de casos de prueba (resumen)

Los 26 tests de Fase 6 cubren, además del happy path:
- **control-actions:** `turn_on`/`turn_off`/`set_limit` en **dry-run** (status `dry_run`, `dry_run=true`, sin downlink); **409 `DEVICE_NOT_CONTROLLABLE`** si `capabilities.switch≠true`; **RBAC viewer → 403**; **cross-tenant → 403**; **idempotencia** por `(device_id, idempotency_key)` (no duplica); audit `control.requested` + `control.resolved`; **sin alerts/recommendations** generadas.
- **control-state:** `controllable`; `current_state` `unknown`/lógico desde última acción; `dry_run:true`.
- **control-schedules:** create/list/patch; viewer → 403; tenant → 403; **`set_limit` → 422** (diferido); **no crea control_action**.
- **consumption-limits:** create; **`threshold≤0` → 422**; list; patch; viewer → 403; tenant → 403; **no crea control_action**.

## Endpoints en OpenAPI NO implementados (Fase 7+ / fase futura)

> Presentes en el contrato o en el alcance funcional pero **DIFERIDOS**; fuera del alcance de Fase 6.

| Grupo | Endpoint / capacidad | Estado | Fase prevista |
|---|---|---|---|
| Bills | POST/GET `/installations/{id}/bills` | DIFERIDO | Fase posterior (UI/CRUD boletas) |
| Control (downlink real) | resolución async vía MQTT, on/off físico, ACK/timeout | DIFERIDO | Fase futura (canal IoT autenticado) |
| Control (automatización) | scheduler ejecutor, reacción a límites/alertas, smart-control | DIFERIDO | Fase futura |

> No hay **resolveAction async** ni **downlink MQTT**: toda acción resuelve lógicamente (`status='success'`+`dry_run=true`) en la misma request. Schedules/limits **no ejecutan**.

## Veredicto

Contrato y código alineados a nivel de **paths** para los 9 endpoints de Fase 6 (verificación manual); shapes implementados = **superset** documentado; `control_actions.idempotency_key`/`dry_run` aportados por la **migración aditiva 0003**. Cobertura de tests completa (26/26 Fase 6, dentro de 140/140 API contra Neon real). Downlink físico, resolución async y automatización correctamente diferidos a fase futura. **Fase 6 PASS.**
