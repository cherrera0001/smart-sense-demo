# Guía de API — Fase 6: Control de Dispositivos (dry-run)

> Fecha: 2026-06-04 · Rama: `feat/phase-6-device-control`.
> Guía operativa de los **9 endpoints** de Fase 6 (control de dispositivos backend). **Todo en dry-run:** ninguna acción envía comando físico ni downlink MQTT; `control-state` es **lógico/simulado**. Contrato base en `specs/04-api/openapi.yaml` (los shapes implementados son un **superset** documentado; `control_actions.idempotency_key`/`dry_run` provienen de la **migración aditiva 0003**; ver `docs/audit/phase-6-openapi-implementation-audit.md`). Modelo de seguridad: `docs/security/phase-6-control-safety.md`.

## Autenticación y autorización

- **JWT obligatorio:** `Authorization: Bearer <access_token>` (`app.authenticate`).
- **Tenant-scope:** todas las operaciones bajo `assertDeviceAccess` (device → installation → organization). Device de otra organización → **403**.
- **RBAC:** las **mutaciones** de control (POST/PATCH actions/schedules/limits) requieren `ROLES.operate` (owner/admin/operator); **viewer → 403**. Las lecturas (GET) requieren `read`.

## Convenciones comunes

- **Tiempos:** ISO8601 en **UTC**.
- **Energía:** `kWh` (number). **Potencia:** `W` (number).
- **Dry-run:** toda acción persiste `dry_run=true` + `status='success'`; el API serializa `status='dry_run'`. **Sin efecto físico.**
- **Idempotency-Key:** header opcional (UUID/opaco) en POST `/control-actions`. Misma clave por device → devuelve la acción existente, **no re-ejecuta ni duplica**.
- **Capability:** `turn_on`/`turn_off` (y `set_limit`-as-action) requieren `capabilities.switch=true` en el device; si no → **409 `DEVICE_NOT_CONTROLLABLE`**.

## Mapeo API ↔ canon (persistencia)

| API | Persistencia (Prisma) |
|---|---|
| action `turn_on`/`turn_off`/`set_limit` | `control_actions.type` (ControlActionType) |
| `status='dry_run'` | `status='success'` + `dry_run=true` (derivado en API) |
| `Idempotency-Key` / `dry_run` | columnas `idempotency_key`/`dry_run` (**migración 0003**) + UNIQUE parcial `(device_id, idempotency_key)` |
| action `value`/`source`/`reason` | `control_actions.payload` (jsonb) |
| schedule `name`/`value`/`cron`/`starts_at`/`ends_at` | `control_schedules.rule` (jsonb); `action`∈{turn_on,turn_off} |
| limit `power_w` | `limitPowerW` (window=`day` placeholder; serializer decide por `limitPowerW!=null`) |
| limit `energy_kwh_day` / `energy_kwh_month` | `limitKwh` + `window`=`day`/`month` |
| limit `action` `notify`/`turn_off` | `actionOnExceed` `alert`/`turn_off` |

---

## 1. POST `/devices/{deviceId}/control-actions`

Crea una acción de control en **dry-run**. **RBAC `ROLES.operate`** (viewer → 403). Requiere `capabilities.switch=true` (si no → 409). Idempotente por header `Idempotency-Key`.

**Headers:** `Idempotency-Key: <uuid>` (opcional).

**Body:**
```json
{ "action": "turn_on", "value": null, "source": "user", "reason": "Apagar standby" }
```

| Campo | Notas |
|---|---|
| `action` | `turn_on` / `turn_off` / `set_limit` |
| `value` | opcional (p. ej. setpoint para `set_limit`); va a `payload` |
| `source` | opcional (`user`/…); va a `payload` |
| `reason` | opcional; va a `payload` |

**Respuesta (200/202, dry-run):**
```json
{
  "id": "action-uuid",
  "device_id": "dev-uuid",
  "action": "turn_on",
  "status": "dry_run",
  "dry_run": true,
  "value": null,
  "source": "user",
  "reason": "Apagar standby",
  "requested_at": "2026-06-04T14:00:00Z",
  "resolved_at": "2026-06-04T14:00:00Z",
  "result": { "dry_run": true }
}
```

- **Dry-run:** persiste `status='success'`+`dry_run=true`+`resolved_at`+`result{dry_run:true}`; **no hay downlink**.
- **Idempotencia:** reintento con el mismo `Idempotency-Key` (mismo device) → devuelve esta misma acción.
- **Audit:** `control.requested` + `control.resolved`.

---

## 2. GET `/devices/{deviceId}/control-actions`

Lista las acciones del device (`read`).

**Query params:** `status?`, `limit?`.

**Respuesta (200):**
```json
{ "device_id": "dev-uuid", "items": [ { "id": "action-uuid", "action": "turn_on", "status": "dry_run", "dry_run": true, "requested_at": "2026-06-04T14:00:00Z" } ], "total": 1 }
```

---

## 3. GET `/devices/{deviceId}/control-state`

Estado **lógico/simulado** del device (`read`). **No es el estado físico confirmado.**

**Respuesta (200):**
```json
{ "device_id": "dev-uuid", "controllable": true, "current_state": "on", "last_action": { "id": "action-uuid", "action": "turn_on", "requested_at": "2026-06-04T14:00:00Z" }, "dry_run": true }
```

| Campo | Notas |
|---|---|
| `controllable` | `true` si `capabilities.switch=true` |
| `current_state` | `on` / `off` / `unknown` — **lógico**, derivado de la última acción dry-run (sin acción previa → `unknown`) |
| `last_action` | última acción registrada o `null` |
| `dry_run` | siempre `true` en Fase 6 |

---

## 4. POST `/devices/{deviceId}/control-schedules`

Crea una programación. **RBAC `ROLES.operate`**. **NO ejecuta** (sin scheduler).

**Body:**
```json
{ "action": "turn_off", "name": "Noche", "value": null, "cron": "0 23 * * *", "starts_at": "2026-06-04T00:00:00Z", "ends_at": null }
```

| Campo | Notas |
|---|---|
| `action` | `turn_on` / `turn_off` (**`set_limit` → 422**, diferido) |
| `name`/`value`/`cron`/`starts_at`/`ends_at` | persistidos en `rule` jsonb |

**Respuesta (200/201):** `{ id, device_id, action, name, value, cron, starts_at, ends_at, enabled }`. Audit `control_schedule.created`. **No crea `control_action`.**

## 5. GET `/devices/{deviceId}/control-schedules`

Lista los schedules del device (`read`).

## 6. PATCH `/control-schedules/{id}`

Actualiza un schedule. **RBAC `ROLES.operate`**. Audit `control_schedule.updated`. **No ejecuta.**

---

## 7. POST `/devices/{deviceId}/consumption-limits`

Crea un límite de consumo. **RBAC `ROLES.operate`**. **NO ejecuta** (solo persiste política).

**Body:**
```json
{ "limit_type": "energy_kwh_day", "threshold": 5.0, "action": "notify", "pre_alert_pct": 80 }
```

| Campo | Notas |
|---|---|
| `limit_type` | `power_w` → `limitPowerW` · `energy_kwh_day` → `limitKwh`+window=day · `energy_kwh_month` → `limitKwh`+window=month |
| `threshold` | **> 0** (≤0 → 422) |
| `action` | `notify` → `alert` · `turn_off` (**`set_limit` → 422**, diferido) |
| `pre_alert_pct` | 1..100 (opcional) |

**Respuesta (200/201):** `{ id, device_id, limit_type, threshold, action, window, pre_alert_pct, enabled }`. Audit `consumption_limit.created`. **No crea `control_action`.**

## 8. GET `/devices/{deviceId}/consumption-limits`

Lista los límites del device (`read`).

## 9. PATCH `/consumption-limits/{id}`

Actualiza un límite. **RBAC `ROLES.operate`**. Audit `consumption_limit.updated`. **No ejecuta.**

---

## Errores

| Código | Causa |
|---|---|
| 401 | Falta/expira el JWT |
| 403 | Device de otra organización (`CROSS_TENANT_DENIED`) o **viewer en mutación** (RBAC) |
| 404 | Device/schedule/limit inexistente |
| 409 | **`DEVICE_NOT_CONTROLLABLE`** (`capabilities.switch≠true`) |
| 422 | Body/query inválido (`set_limit`-as-schedule/limit diferido, `threshold≤0`, action no permitido) |

## Notas de implementación

- **Migración aditiva 0003:** `control_actions.idempotency_key` (text) + `dry_run` (bool default true) + UNIQUE parcial `(device_id, idempotency_key)`; no altera enums ni datos.
- **Dry-run / sin downlink:** ninguna acción envía comando físico; sin MQTT downlink; schedules/limits no ejecutan; `control-state` es lógico/simulado. Ver `docs/security/phase-6-control-safety.md`.
- **0 side-effects:** ninguna operación de control genera `alerts`/`recommendations`.
- **Web client preparatorio:** `apps/web/lib/api/client.ts` expone `controlApi` (9 métodos; no usados por la UI; fallan bajo DEMO_MODE).
- **Referencias:** `docs/implementation/phase-6-summary.md`, `docs/audit/phase-6-{precheck,spec-readiness,control-data-model-audit,openapi-implementation-audit,runtime-verification}.md`, `docs/security/phase-6-control-safety.md`.
