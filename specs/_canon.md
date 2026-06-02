# SmartSense — Canon de Especificación (contrato compartido)

> Documento de referencia obligatorio. Todo artefacto de `specs/` debe ser consistente con este canon. Si una spec necesita divergir, debe registrarlo en `specs/00-product/assumptions.md`.

## Producto

SmartSense / Home Energy — plataforma SaaS + IoT de monitoreo y gestión energética para tres segmentos:

- **home** — hogar residencial.
- **smb** — PyME / negocio pequeño.
- **business** — empresa / agro / retail / fábrica (segmento estratégico "OIMSAE": operador industrial mediano sin área energética).

Principio de valor: convertir la energía de costo fijo incontrolable en variable operacional gestionable en tiempo real, en **CLP**, sin requerir expertos. El cálculo de costos vive **siempre en backend**.

## Stack canónico

- Backend: Node.js + Fastify + TypeScript; Prisma ORM.
- DB: PostgreSQL 16 + TimescaleDB (hypertable para `telemetry_readings`).
- Frontend: Next.js App Router + TypeScript + Tailwind + React Query + Zustand; gráficos Recharts.
- IoT: MQTT (EMQX) → iot-bridge → API; WebSocket para dashboard en vivo.
- Auth: JWT access+refresh; RBAC multi-tenant.
- Monorepo pnpm: `apps/api`, `apps/web`, `apps/iot-bridge`, `packages/shared`, `packages/db`.

## Convenciones

- Tablas y columnas: `snake_case`, plurales para tablas.
- PK: `id` UUID v7 (`uuid` con default app-side) salvo telemetría (ver más abajo).
- Timestamps: `created_at`, `updated_at` (`timestamptz`); soft delete con `deleted_at timestamptz NULL` donde aplique.
- Todo dato con tenant: columna `organization_id` (o derivable por FK) para scoping.
- Dinero: enteros en **CLP** (sin decimales) salvo tarifas que usan `numeric(12,4)`.
- Energía: `wh` (entero) o `kwh` (`numeric(14,4)`); potencia en `w` (`numeric(12,2)`).
- IDs de requerimiento: `FR-<MOD>-NNN`. Módulos: AUTH, ONB, PROF, BILL, DASH, REP, BRK, CTRL, ALRT, REC, PROJ, SET. No funcionales: `NFR-NNN`.

## Entidades de dominio (21) y tablas

| Entidad | Tabla | Tenant scope |
|---|---|---|
| User | `users` | global (via memberships) |
| Organization | `organizations` | raíz de tenant |
| Membership | `memberships` | org |
| Installation | `installations` | org |
| InstallationProfile | `installation_profiles` | org (via installation) |
| EnergyKit | `energy_kits` | org (via installation) |
| Device | `devices` | org (via kit/installation) |
| DeviceCategory | `device_categories` | global (catálogo) |
| DevicePairing | `device_pairings` | org |
| TelemetryReading | `telemetry_readings` | org (via device) |
| EnergyAggregate | `energy_aggregates` | org (via installation) |
| ElectricityBill | `electricity_bills` | org (via installation) |
| Tariff | `tariffs` | global/distribuidora |
| Distributor | `distributors` | global |
| Alert | `alerts` | org (via installation) |
| Recommendation | `recommendations` | org |
| ControlAction | `control_actions` | org (via device) |
| ControlSchedule | `control_schedules` | org (via device) |
| ConsumptionLimit | `consumption_limits` | org (via device) |
| Notification | `notifications` | org |
| AuditLog | `audit_logs` | org |

## Enums canónicos

- `installation_segment`: `home | smb | business`
- `membership_role`: `owner | admin | operator | viewer`
- `pairing_status`: `paired | recommended | scanning | unpaired | error`
- `device_state`: `online | offline | unknown`
- `control_action_type`: `turn_on | turn_off | set_limit`
- `control_action_status`: `pending | success | failed | rejected`
- `alert_severity`: `info | warning | critical`
- `alert_status`: `open | reviewed | dismissed`
- `alert_type`: `anomaly | high_device | over_budget | offline`
- `recommendation_source`: `alert | periodic_analysis`
- `bill_status`: `uploaded | parsed | confirmed`
- `ingestion_status`: `accepted | duplicate | invalid`
- `aggregate_granularity`: `hour | day | week | month`
- `notification_channel`: `in_app | email | push`

## Telemetría (clave)

`telemetry_readings`: hypertable Timescale, PK compuesta lógica `(device_id, source_timestamp, reading_id)`. Idempotencia por `event_hash` (UNIQUE). Campos del contrato en `specs/07-iot/telemetry-model.md`. Distingue `source_timestamp` (origen) vs `received_timestamp` (recepción). Agregados materializados en `energy_aggregates`.

## Multi-tenant y seguridad (invariantes)

- Ninguna query expone datos de `organization_id` ajeno (no cross-tenant).
- Toda telemetría debe referir un `device_id` válido asociado a kit/instalación.
- Toda `control_action` queda auditada en `audit_logs`.
- Costos calculados en backend; el frontend solo renderiza.
- Secrets nunca en frontend; control remoto requiere rol `operator|admin|owner`.

## Prioridades

`MVP` (onboarding, perfil, kit, boleta manual, ingesta, dashboard, reportes, desglose, alertas básicas, recomendaciones, control básico) · `V1` · `V2` (NILM avanzado, predicción sofisticada, control autónomo, Energy Mesh sectorial).
