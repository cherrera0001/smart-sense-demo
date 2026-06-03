# Fase 1.4 — Auditoría MER → Prisma → Migración

> Fecha: 2026-06-02 · Verificación **estática** (sin DB) de que el schema Prisma y la migración `0001_init` reflejan el MER (`specs/03-data-model/mer-conceptual.md`) y el modelo relacional (`relational-model.md`). Evidencia extraída de `packages/db/prisma/schema.prisma` y `migrations/0001_init/migration.sql`.

## Resumen
- **21/21** entidades del MER → modelo Prisma (`@@map`) → `CREATE TABLE` en la migración. **Sin tablas faltantes ni extra.**
- 35 referencias FK, 20 CHECK, 36 índices, triggers `set_updated_at` + append-only, `create_hypertable`. (Conteos verificados por grep.)

## Tabla de trazabilidad MER → tabla → Prisma → migración

| Entidad MER | Tabla esperada | Modelo Prisma | Migración SQL | Estado |
|---|---|---|---|---|
| User | users | `model User @@map("users")` | `CREATE TABLE "users"` | ✅ |
| Organization | organizations | `model Organization` | `CREATE TABLE "organizations"` | ✅ |
| Membership | memberships | `model Membership` | `CREATE TABLE "memberships"` | ✅ |
| Installation | installations | `model Installation` | `CREATE TABLE "installations"` | ✅ |
| InstallationProfile | installation_profiles | `model InstallationProfile` | `CREATE TABLE "installation_profiles"` | ✅ |
| EnergyKit | energy_kits | `model EnergyKit` | `CREATE TABLE "energy_kits"` | ✅ |
| DeviceCategory | device_categories | `model DeviceCategory` | `CREATE TABLE "device_categories"` | ✅ |
| Device | devices | `model Device` | `CREATE TABLE "devices"` | ✅ |
| DevicePairing | device_pairings | `model DevicePairing` | `CREATE TABLE "device_pairings"` | ✅ |
| TelemetryReading | telemetry_readings | `model TelemetryReading` | `CREATE TABLE "telemetry_readings"` (hypertable) | ✅ |
| EnergyAggregate | energy_aggregates | `model EnergyAggregate` | `CREATE TABLE "energy_aggregates"` | ✅ |
| Distributor | distributors | `model Distributor` | `CREATE TABLE "distributors"` | ✅ |
| Tariff | tariffs | `model Tariff` | `CREATE TABLE "tariffs"` | ✅ |
| ElectricityBill | electricity_bills | `model ElectricityBill` | `CREATE TABLE "electricity_bills"` | ✅ |
| Alert | alerts | `model Alert` | `CREATE TABLE "alerts"` | ✅ |
| Recommendation | recommendations | `model Recommendation` | `CREATE TABLE "recommendations"` | ✅ |
| ControlAction | control_actions | `model ControlAction` | `CREATE TABLE "control_actions"` | ✅ |
| ControlSchedule | control_schedules | `model ControlSchedule` | `CREATE TABLE "control_schedules"` | ✅ |
| ConsumptionLimit | consumption_limits | `model ConsumptionLimit` | `CREATE TABLE "consumption_limits"` | ✅ |
| Notification | notifications | `model Notification` | `CREATE TABLE "notifications"` | ✅ |
| AuditLog | audit_logs | `model AuditLog` | `CREATE TABLE "audit_logs"` | ✅ |

## Enums (24)
14 canónicos del MER/canon (`installation_segment`, `membership_role`, `pairing_status`, `device_state`, `control_action_type`, `control_action_status`, `alert_severity`, `alert_status`, `alert_type`, `recommendation_source`, `bill_status`, `ingestion_status`, `aggregate_granularity`, `notification_channel`) + 10 de estado de tabla (`user_status`, `organization_plan`, `organization_status`, `membership_status`, `installation_status`, `energy_kit_status`, `recommendation_status`, `control_schedule_action`, `limit_window`, `limit_action_on_exceed`). Implementados como enums nativos Postgres/Prisma.

## Divergencias detectadas
| # | Divergencia | Resolución |
|---|---|---|
| 1 | `organizations.is_demo` (no está en `relational-model.md` original) | **Adición controlada** (marca de datos demo). Documentada en `relational-model.md §Notas de implementación Fase 1`. |
| 2 | UNIQUE de telemetría: lógico `event_hash` vs físico `(event_hash, source_timestamp)` | Requisito de hypertable Timescale (debe incluir la columna de particionamiento). `event_hash` único por diseño del bridge → idempotencia preservada. |
| 3 | `telemetry_readings.kit_id`/`installation_id` sin FK dura (denormalizados) | Decisión de rendimiento de ingesta (TC-002). FK dura solo en `device_id`. Sin relación Prisma huérfana (verificado: `prisma generate` ✅). |

**Conclusión:** schema Prisma y migración representan fielmente el MER. **Sin inconsistencias silenciosas.** Apto para migrar contra Postgres real.
