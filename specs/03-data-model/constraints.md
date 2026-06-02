# Constraints Relacionales — SmartSense

> Deriva de `specs/03-data-model/relational-model.md`. Documenta todas las constraints: PK, FK (con `ON DELETE`), UNIQUE (incl. parciales), CHECK, NOT NULL clave y reglas vía trigger. Refleja exactamente el modelo relacional. Reglas de negocio asociadas en `business-rules.md`.

## Convenciones de constraints

- PK por defecto: `id uuid` (UUIDv7 app-side), salvo `telemetry_readings` (PK lógica compuesta).
- FK por defecto: `ON DELETE RESTRICT`; `ON DELETE CASCADE` solo donde se indica explícitamente.
- Enums implementados como `text` + `CHECK IN (...)` (portabilidad Prisma).
- NOT NULL listado solo para columnas clave de negocio (los `created_at`/`updated_at` son NOT NULL DEFAULT now() de forma transversal).

---

## users

- **PK:** `id`.
- **UNIQUE:** `email` (citext, único global).
- **CHECK:** `status IN ('active','suspended')`.
- **NOT NULL:** `email`, `password_hash`, `full_name`, `locale` (DEFAULT `'es-CL'`), `status` (DEFAULT `'active'`).

## organizations

- **PK:** `id`.
- **UNIQUE parcial:** `legal_id` `WHERE legal_id IS NOT NULL`.
- **CHECK:** `segment_default IN ('home','smb','business')` (cuando no nulo); `plan IN ('free','pro','enterprise')`.
- **NOT NULL:** `name`, `plan` (DEFAULT `'free'`), `status` (DEFAULT `'active'`).
- **Soft delete:** `deleted_at` NULL.

## memberships

- **PK:** `id`.
- **FK:** `user_id → users(id)` ON DELETE RESTRICT; `organization_id → organizations(id)` **ON DELETE CASCADE**.
- **UNIQUE:** (`user_id`, `organization_id`).
- **CHECK:** `role IN ('owner','admin','operator','viewer')`; `status IN ('active','invited','revoked')`.
- **NOT NULL:** `user_id`, `organization_id`, `role`, `status` (DEFAULT `'active'`).
- **Vía trigger/dominio:** no eliminar el último `role='owner'` de una organización (BR-003).

## installations

- **PK:** `id`.
- **FK:** `organization_id → organizations(id)` ON DELETE RESTRICT; `distributor_id → distributors(id)` ON DELETE RESTRICT (NULL); `tariff_id → tariffs(id)` ON DELETE RESTRICT (NULL).
- **CHECK:** `segment IN ('home','smb','business')`; `status IN ('active','inactive')`.
- **NOT NULL:** `organization_id`, `name`, `segment`, `timezone` (DEFAULT `'America/Santiago'`), `status` (DEFAULT `'active'`).
- **Soft delete:** `deleted_at` NULL.

## installation_profiles

- **PK:** `id`.
- **FK:** `installation_id → installations(id)` **ON DELETE CASCADE**.
- **UNIQUE:** `installation_id` (relación 1:1).
- **CHECK:** `segment IN ('home','smb','business')`; `occupants >= 0`; `declared_power_kw >= 0`.
- **NOT NULL:** `installation_id`, `segment`.
- **Vía dominio:** shape de `extra` valida contra `segment` (BR-013).

## energy_kits

- **PK:** `id`.
- **FK:** `installation_id → installations(id)` ON DELETE RESTRICT (NULL hasta claim).
- **UNIQUE:** `qr_code` (global).
- **UNIQUE parcial:** a lo sumo una fila `status='active'` por `serial` → `UNIQUE(serial) WHERE status='active'` (BR-011, kit activo único por serial).
- **CHECK:** `status IN ('unclaimed','active','transferring','retired')`.
- **NOT NULL:** `qr_code`, `serial`, `status` (DEFAULT `'unclaimed'`).
- **Soft delete:** `deleted_at` NULL.

## device_categories

- **PK:** `id`.
- **UNIQUE:** `key`.
- **NOT NULL:** `key`, `name`. Catálogo global (sin tenant).

## devices

- **PK:** `id`.
- **FK:** `kit_id → energy_kits(id)` **ON DELETE CASCADE**; `installation_id → installations(id)` ON DELETE RESTRICT; `category_id → device_categories(id)` ON DELETE RESTRICT (NULL).
- **UNIQUE:** (`kit_id`, `external_ref`).
- **CHECK:** `state IN ('online','offline','unknown')`.
- **NOT NULL:** `kit_id`, `installation_id`, `name`, `external_ref`, `capabilities` (DEFAULT `'{}'`), `state` (DEFAULT `'unknown'`).
- **Soft delete:** `deleted_at` NULL.
- **Vía dominio:** `installation_id` denormalizado coherente con el del kit (BR-014).

## device_pairings

- **PK:** `id`.
- **FK:** `kit_id → energy_kits(id)` **ON DELETE CASCADE**; `device_id → devices(id)` ON DELETE RESTRICT (NULL).
- **CHECK:** `status IN ('paired','recommended','scanning','unpaired','error')`.
- **NOT NULL:** `kit_id`, `device_external_ref`, `status`.

## telemetry_readings (hypertable Timescale)

- **PK lógica:** (`device_id`, `source_timestamp`, `reading_id`). En la hypertable la columna de particionamiento es `source_timestamp`; el unicidad por PK lógica se sostiene a nivel de aplicación + UNIQUE de idempotencia.
- **UNIQUE:** `event_hash` (idempotencia de ingesta, BR-021).
- **FK:** `device_id → devices(id)` ON DELETE RESTRICT. (`kit_id`/`installation_id` denormalizados, sin FK dura para no penalizar la ingesta de alta cardinalidad; consistencia garantizada por el iot-bridge/ACL.)
- **CHECK:** `voltage_v >= 0`; `current_a >= 0`; `active_power_w >= 0`; `apparent_power_va >= 0`; `power_factor BETWEEN -1 AND 1`; `energy_wh_delta >= 0`; `ingestion_status IN ('accepted','duplicate','invalid')`.
- **NOT NULL:** `reading_id`, `device_id`, `kit_id`, `installation_id`, `source_timestamp`, `received_timestamp` (DEFAULT now()), `ingestion_status` (DEFAULT `'accepted'`), `event_hash`.
- **Vía dominio (ACL):** `source_timestamp` válido y no excesivamente futuro (BR-023); device asociado a kit válido (BR-020).
- **Hypertable:** `create_hypertable('telemetry_readings','source_timestamp')`; políticas de compresión/retención (ver `lifecycle-and-retention.md`).

## energy_aggregates

- **PK:** `id`.
- **FK:** `installation_id → installations(id)` ON DELETE RESTRICT; `device_id → devices(id)` ON DELETE RESTRICT (NULL); `category_id → device_categories(id)` ON DELETE RESTRICT (NULL).
- **UNIQUE:** (`installation_id`, `device_id`, `category_id`, `granularity`, `bucket_start`) — idempotencia del recálculo (BR-025). Nota: en Postgres los NULL no colisionan en UNIQUE; usar `NULLS NOT DISTINCT` (PG15+) o `COALESCE`/índice de expresión para tratar `device_id`/`category_id` NULL como un valor distinguible.
- **CHECK:** `granularity IN ('hour','day','week','month')`; `energy_kwh >= 0`; `cost_clp >= 0` (cuando no nulo).
- **NOT NULL:** `installation_id`, `granularity`, `bucket_start`, `energy_kwh` (DEFAULT 0), `recomputed_at` (DEFAULT now()).

## distributors

- **PK:** `id`.
- **UNIQUE:** `code` (cuando no nulo).
- **NOT NULL:** `name`, `country` (DEFAULT `'CL'`).

## tariffs

- **PK:** `id`.
- **FK:** `distributor_id → distributors(id)` ON DELETE RESTRICT (NULL = genérica).
- **UNIQUE:** (`distributor_id`, `code`, `valid_from`).
- **CHECK:** `segment IN ('home','smb','business')` (cuando no nulo); `energy_price_clp_kwh >= 0`; `fixed_charge_clp >= 0`; `demand_charge_clp_kw >= 0`.
- **NOT NULL:** `code`, `name`, `energy_price_clp_kwh`.

## electricity_bills

- **PK:** `id`.
- **FK:** `installation_id → installations(id)` ON DELETE RESTRICT; `distributor_id → distributors(id)` ON DELETE RESTRICT (NULL); `tariff_id → tariffs(id)` ON DELETE RESTRICT (NULL).
- **CHECK:** `period_end >= period_start`; `consumption_kwh >= 0`; `total_clp >= 0`; `status IN ('uploaded','parsed','confirmed')`.
- **NOT NULL:** `installation_id`, `period_start`, `period_end`, `consumption_kwh`, `total_clp`, `file_url` (conserva archivo original, BR-033), `status` (DEFAULT `'uploaded'`).

## alerts

- **PK:** `id`.
- **FK:** `installation_id → installations(id)` ON DELETE RESTRICT; `device_id → devices(id)` ON DELETE RESTRICT (NULL); `reviewed_by → users(id)` ON DELETE RESTRICT (NULL).
- **CHECK:** `type IN ('anomaly','high_device','over_budget','offline')`; `severity IN ('info','warning','critical')`; `status IN ('open','reviewed','dismissed')`.
- **NOT NULL:** `installation_id`, `type`, `severity`, `status` (DEFAULT `'open'`), `message`.

## recommendations

- **PK:** `id`.
- **FK:** `installation_id → installations(id)` ON DELETE RESTRICT; `alert_id → alerts(id)` ON DELETE RESTRICT (NULL).
- **CHECK:** `source IN ('alert','periodic_analysis')`; `status IN ('new','applied','dismissed')`.
- **NOT NULL:** `installation_id`, `source`, `title`, `description`, `priority` (DEFAULT 0), `status` (DEFAULT `'new'`).
- **Vía dominio:** si `source='alert'` debe existir `alert_id` (BR-042).

## control_actions

- **PK:** `id`.
- **FK:** `device_id → devices(id)` ON DELETE RESTRICT; `user_id → users(id)` ON DELETE RESTRICT.
- **CHECK:** `type IN ('turn_on','turn_off','set_limit')`; `status IN ('pending','success','failed','rejected')`.
- **NOT NULL:** `device_id`, `user_id`, `type`, `status` (DEFAULT `'pending'`), `requested_at` (DEFAULT now()).
- **Vía dominio:** requiere rol `operator|admin|owner` (BR-050); toda acción se inserta en `audit_logs` (BR-051).

## control_schedules

- **PK:** `id`.
- **FK:** `device_id → devices(id)` **ON DELETE CASCADE**; `created_by → users(id)` ON DELETE RESTRICT.
- **CHECK:** `action IN ('turn_on','turn_off')`.
- **NOT NULL:** `device_id`, `action`, `rule`, `enabled` (DEFAULT true), `created_by`.

## consumption_limits

- **PK:** `id`.
- **FK:** `device_id → devices(id)` **ON DELETE CASCADE**.
- **CHECK:** `limit_kwh > 0` (cuando no nulo); `limit_power_w > 0` (cuando no nulo); `window IN ('day','month')`; `pre_alert_pct BETWEEN 1 AND 100` (cuando no nulo); `action_on_exceed IN ('alert','turn_off')`.
- **NOT NULL:** `device_id`, `window`, `action_on_exceed` (DEFAULT `'alert'`), `enabled` (DEFAULT true).
- **Vía dominio:** al menos uno de `limit_kwh`/`limit_power_w` definido (BR-054).

## notifications

- **PK:** `id`.
- **FK:** `organization_id → organizations(id)` ON DELETE RESTRICT; `installation_id → installations(id)` ON DELETE RESTRICT (NULL); `user_id → users(id)` ON DELETE RESTRICT (NULL).
- **CHECK:** `channel IN ('in_app','email','push')`.
- **NOT NULL:** `organization_id`, `channel`, `title`, `body`, `created_at` (DEFAULT now()).

## audit_logs (append-only)

- **PK:** `id`.
- **FK:** `organization_id → organizations(id)` ON DELETE RESTRICT; `user_id → users(id)` ON DELETE RESTRICT (NULL = acción de sistema).
- **NOT NULL:** `organization_id`, `action`, `entity_type`, `created_at` (DEFAULT now()).
- **Vía trigger (BR-061):** trigger `BEFORE UPDATE OR DELETE` que lanza excepción → tabla append-only (sin UPDATE/DELETE). Revocar además privilegios UPDATE/DELETE a nivel de rol de aplicación.

---

## Constraints transversales / multi-tenant

- **TC-001 — No cross-tenant (BR-005):** toda query de la app debe filtrar por `organization_id` (directo o derivado por FK). Se aplica en la capa de repositorio; opcionalmente reforzable con **Row-Level Security (RLS)** por `organization_id` en Postgres usando `current_setting('app.org_id')`. Las tablas sin `organization_id` directo (`installations`, `devices`, `telemetry_readings`, etc.) lo resuelven por cadena de FK hasta `organizations`.
- **TC-002 — Integridad de denormalización:** `devices.installation_id`, `telemetry_readings.kit_id`/`installation_id` y `energy_aggregates.installation_id` deben ser coherentes con la cadena `kit → installation → organization`. Garantizado por el dominio/ACL (no por FK dura en telemetría por rendimiento).
- **TC-003 — Auditoría obligatoria de acciones sensibles:** control remoto (`control_actions`), cambios de rol (`memberships`), claim/transfer de kit (`energy_kits`) y confirmación de boleta (`electricity_bills`) deben generar fila en `audit_logs` desde el servicio de dominio.
- **TC-004 — Inmutabilidad de auditoría:** trigger append-only sobre `audit_logs` (TC + BR-061).
- **TC-005 — Soft delete consistente:** entidades con `deleted_at` (`organizations`, `installations`, `energy_kits`, `devices`) se filtran por `deleted_at IS NULL` en todas las queries operativas; los UNIQUE parciales relevantes consideran solo filas no borradas cuando corresponda.
- **TC-006 — Enums sincronizados:** todos los `CHECK IN (...)` reflejan exactamente los enums de `_canon.md`; cambiar un enum requiere migración coordinada del CHECK y del código TypeScript.
- **TC-007 — Idempotencia de ingesta y agregación:** `UNIQUE(event_hash)` en telemetría y `UNIQUE(installation_id, device_id, category_id, granularity, bucket_start)` en agregados garantizan reprocesos sin duplicar.
- **TC-008 — Dinero en CLP entero:** columnas `*_clp` son `bigint` (sin decimales) con `CHECK >= 0` donde aplique; precios de tarifa usan `numeric(12,4)`.
