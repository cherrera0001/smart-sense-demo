# Fase 1.4 — Auditoría de Constraints e Índices Críticos

> Fecha: 2026-06-02 · Verificación **estática** de FKs, UNIQUE, CHECK, índices y triggers en `migrations/0001_init/migration.sql`. (Evidencia por grep.)

## Foreign keys críticas (inline `REFERENCES`) — ✅ todas presentes

| Relación | Columna → tabla | Estado |
|---|---|---|
| memberships → users | `user_id -> users` | ✅ |
| memberships → organizations | `organization_id -> organizations` | ✅ |
| installations → organizations | `organization_id -> organizations` | ✅ |
| installation_profiles → installations | `installation_id -> installations` | ✅ |
| energy_kits → installations | `installation_id -> installations` | ✅ |
| devices → energy_kits | `kit_id -> energy_kits` | ✅ |
| devices → installations | `installation_id -> installations` | ✅ |
| devices → device_categories | `category_id -> device_categories` | ✅ |
| device_pairings → energy_kits | `kit_id -> energy_kits` | ✅ |
| telemetry_readings → devices | `device_id -> devices` | ✅ (kit_id/installation_id denormalizados sin FK, TC-002) |
| electricity_bills → installations/distributors/tariffs | `installation_id/distributor_id/tariff_id` | ✅ |
| alerts → installations | `installation_id -> installations` | ✅ |
| alerts → devices (opcional) | `device_id -> devices` | ✅ |
| alerts.reviewed_by → users | `reviewed_by -> users` | ✅ |
| recommendations → alerts | `alert_id -> alerts` | ✅ |
| recommendations → installations | `installation_id -> installations` | ✅ |
| control_actions → devices | `device_id -> devices` | ✅ |
| control_actions → users | `user_id -> users` | ✅ |
| control_schedules → devices / created_by→users | `device_id`, `created_by` | ✅ |
| consumption_limits → devices | `device_id -> devices` | ✅ |
| notifications → organizations/installations/users | `organization_id/installation_id/user_id` | ✅ |
| audit_logs → users/organizations | `user_id`, `organization_id` | ✅ |

## CHECK constraints (20) — ✅ no-negatividad y rangos
`energy_price_clp_kwh ≥ 0`, `fixed_charge_clp/demand_charge_clp_kw ≥ 0`, `occupants ≥ 0`, `declared_power_kw ≥ 0`, telemetría `voltage_v/current_a/active_power_w/apparent_power_va/energy_wh_delta ≥ 0`, `power_factor BETWEEN -1 AND 1`, `energy_kwh ≥ 0`, `cost_clp ≥ 0`, `electricity_bills.period_end ≥ period_start`, `consumption_kwh ≥ 0`, `total_clp ≥ 0`, `limit_kwh > 0`, `limit_power_w > 0`, `pre_alert_pct BETWEEN 1 AND 100`.

## Índices (36) — ✅ patrones de consulta cubiertos
- **UNIQUE:** `users.email` (citext), `organizations.legal_id`, `distributors.code`, `energy_kits.qr_code`, `energy_kits_active_serial_key` (parcial WHERE active), `devices(kit_id,external_ref)`, `telemetry_readings(event_hash,source_timestamp)`, `energy_aggregates_bucket_key`, `memberships(user_id,organization_id)`, `tariffs(distributor_id,code,valid_from)`.
- **Por tenant/relación:** `memberships(organization_id)`, `installations(organization_id)`, `energy_kits(installation_id)`, `devices(installation_id)`, `devices(category_id)`, `alerts(installation_id,status)` + parcial open, `recommendations(installation_id,status,priority)`, `notifications(user_id,read)`.
- **Telemetría temporal:** `telemetry_readings(device_id, source_timestamp DESC)`, `(installation_id, source_timestamp DESC)`.
- **Agregados:** `(installation_id,granularity,bucket_start)`, `(installation_id,category_id,...)`, `(installation_id,device_id,...)`.
- **Auditoría:** `audit_logs(organization_id,created_at)`, `(entity_type,entity_id)`.
- **Control:** `control_actions(device_id,requested_at)` + parcial pending, `control_schedules(device_id,enabled)`, `consumption_limits(device_id,enabled)`.

## Triggers / extensiones
- `set_updated_at()` + trigger por cada tabla con `updated_at`. ✅
- `audit_logs_append_only()` → `RAISE EXCEPTION` en UPDATE/DELETE (BR-061). ✅
- `create_hypertable('telemetry_readings','source_timestamp', if_not_exists, migrate_data)` envuelto en `DO/EXCEPTION` (fallback sin Timescale). ✅
- Extensiones: `uuid-ossp`, `citext`, `timescaledb` (opcional). ✅

**Conclusión:** todas las constraints/índices/triggers críticos están presentes en la migración. **No hay deuda bloqueante.** Pendiente único: ejecutar la migración contra Postgres real (requiere `DATABASE_URL`).
