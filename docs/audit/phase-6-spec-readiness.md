# Fase 6 — Spec Readiness (Control de Dispositivos)

> Fecha: 2026-06-04 · Rama `feat/phase-6-device-control`.

## Endpoints autorizados (9)
- `POST/GET /devices/:deviceId/control-actions` · `GET /devices/:deviceId/control-state`
- `POST/GET /devices/:deviceId/control-schedules` · `PATCH /control-schedules/:id`
- `POST/GET /devices/:deviceId/consumption-limits` · `PATCH /consumption-limits/:id`

## Entidades DB usadas
`control_actions` (+ migración 0003), `control_schedules`, `consumption_limits`, `devices` (capability), `installations`/`memberships` (tenant+RBAC), `audit_logs`. **No telemetry/MQTT downlink.**

## Reglas de negocio
- **Dry-run only**: ninguna acción envía comando físico. `dry_run=true`, status lógico `dry_run`. **No MQTT/iot-bridge downlink.**
- RBAC **operate+** (owner/admin/operator); **viewer prohibido** en todas las mutaciones.
- Tenant-scope vía device→installation→organization (`assertDeviceAccess`).
- Capability: `turn_on`/`turn_off` requieren `capabilities.switch=true` (o `controllable`); `set_limit` requiere `capabilities.switch` o límite. Device no controlable → **409 DEVICE_NOT_CONTROLLABLE**.
- **Idempotencia** por `Idempotency-Key` (header) → misma acción no se duplica.
- **Auditoría obligatoria**: `control.requested` y `control.resolved` (dry-run), `control_schedule.created/updated`, `consumption_limit.created/updated`. Append-only.
- Schedules y limits **solo persisten política**; NO ejecutan acciones (sin scheduler productivo).
- **Nunca** crear alerts/recommendations ni reaccionar a ellas automáticamente.

## Reconciliación contrato↔canon (ver phase-6-control-data-model-audit.md)
- control_actions: + `idempotency_key`, `dry_run` (migración 0003). `value/source/reason` en `payload`.
- schedules: action turn_on|turn_off (set_limit-as-schedule **diferido**); name/value/cron/starts_at/ends_at en `rule`.
- limits: limit_type→limitPowerW/limitKwh+window; action notify→`alert`|turn_off (set_limit-as-limit **diferido**).

## Exclusiones explícitas (fase futura)
MQTT downlink productivo, comandos físicos reales, on/off físico, automatización autónoma, reacción automática a alertas, smart-control real, scheduler ejecutor, UI productiva.

## Riesgos de seguridad
- Superficie crítica: control. Mitigación: RBAC estricto, tenant-scope, auditoría obligatoria, dry-run (sin efecto físico), idempotencia. Tests exhaustivos de autorización antes de cualquier downlink real (fase futura).
