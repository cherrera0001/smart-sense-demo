# Modelo de Dominio — SmartSense

> Ver `specs/_canon.md` para entidades, enums y convenciones. Este documento define propósito, atributos, relaciones, reglas y eventos por entidad.

## Convenciones

- Toda entidad raíz tiene `id` (UUID), `created_at`, `updated_at`.
- Las entidades con borrado lógico tienen `deleted_at`.
- "Tenant" = `Organization`. El aislamiento multi-tenant es invariante de dominio.

---

## User
**Propósito:** persona que accede a la plataforma.
**Atributos:** `id`, `email` (único), `password_hash`, `full_name`, `phone?`, `locale` (default `es-CL`), `status` (`active|suspended`), `last_login_at?`.
**Relaciones:** N↔N con Organization vía Membership; 1→N AuditLog.
**Reglas:** email único global; password con hash Argon2id; no puede operar sin al menos una Membership activa.
**Eventos:** `user.registered`, `user.logged_in`, `user.password_reset`.
**Dudas abiertas:** ¿login social (Google) en MVP? → ver assumptions.

## Organization
**Propósito:** tenant raíz; agrupa instalaciones, usuarios y facturación SaaS.
**Atributos:** `id`, `name`, `legal_id` (RUT?), `segment_default?`, `plan` (`free|pro|enterprise`), `status`.
**Relaciones:** 1→N Membership, Installation, Notification, AuditLog.
**Reglas:** una Organization debe tener al menos un Membership `owner`.
**Eventos:** `organization.created`, `organization.plan_changed`.
**Dudas:** persona natural (hogar) = Organization implícita de 1 usuario.

## Membership
**Propósito:** vínculo User↔Organization con rol (RBAC).
**Atributos:** `id`, `user_id`, `organization_id`, `role` (`owner|admin|operator|viewer`), `status` (`active|invited|revoked`), `invited_at?`, `accepted_at?`.
**Relaciones:** N→1 User, N→1 Organization.
**Reglas:** par (`user_id`,`organization_id`) único; no se elimina el último `owner`.
**Eventos:** `membership.invited`, `membership.accepted`, `membership.role_changed`, `membership.revoked`.

## Installation
**Propósito:** sitio físico monitoreado (hogar, local PyME, planta).
**Atributos:** `id`, `organization_id`, `name`, `segment` (`home|smb|business`), `address?`, `timezone` (default `America/Santiago`), `distributor_id?`, `tariff_id?`, `status` (`active|inactive`).
**Relaciones:** N→1 Organization; 1→1 InstallationProfile; 1→N EnergyKit, ElectricityBill, EnergyAggregate, Alert, Notification.
**Reglas:** pertenece a exactamente una Organization; el segmento determina qué InstallationProfile aplica.
**Eventos:** `installation.created`, `installation.tariff_assigned`.

## InstallationProfile
**Propósito:** caracterización por segmento (datos de las pantallas 5–7 de la maqueta).
**Atributos comunes:** `id`, `installation_id`, `segment`, `occupants?`, `heating_system?`, `critical_equipment?` (jsonb), `declared_power_kw?`, `operating_hours?` (jsonb), `extra` (jsonb específico por segmento).
**Relaciones:** 1→1 Installation.
**Reglas:** el shape de `extra` valida contra el `segment` de la Installation.
**Eventos:** `profile.updated`.

## EnergyKit
**Propósito:** kit IoT identificado por QR; agrupa dispositivos de medición/control.
**Atributos:** `id`, `installation_id?` (NULL hasta claim), `qr_code` (único), `serial`, `model`, `firmware_version?`, `status` (`unclaimed|active|transferring|retired`), `claimed_at?`.
**Relaciones:** N→1 Installation; 1→N Device.
**Reglas:** un kit no puede estar `active` en dos instalaciones a la vez (salvo `transferring` controlado).
**Eventos:** `kit.scanned`, `kit.claimed`, `kit.transferred`.

## Device
**Propósito:** dispositivo físico (enchufe inteligente, sensor, medidor de circuito).
**Atributos:** `id`, `kit_id`, `installation_id` (denormalizado para scoping), `category_id?`, `name`, `external_ref` (id en el kit/broker), `capabilities` (jsonb: `{meter, switch}`), `state` (`online|offline|unknown`), `last_seen_at?`.
**Relaciones:** N→1 EnergyKit, N→1 DeviceCategory; 1→N TelemetryReading, ControlAction, ControlSchedule, ConsumptionLimit.
**Reglas:** la telemetría solo se acepta si el device pertenece a un kit válido.
**Eventos:** `device.paired`, `device.online`, `device.offline`.

## DeviceCategory
**Propósito:** catálogo de categorías para desglose (refrigeración, climatización, iluminación, etc.).
**Atributos:** `id`, `key`, `name`, `icon?`, `typical_power_w?`.
**Relaciones:** 1→N Device.
**Reglas:** catálogo global, no por tenant.

## DevicePairing
**Propósito:** historial/estado del proceso de emparejamiento (estados de la pág. 3).
**Atributos:** `id`, `kit_id`, `device_external_ref`, `status` (`paired|recommended|scanning|unpaired|error`), `device_id?`, `detail?` (jsonb).
**Relaciones:** N→1 EnergyKit; N→0..1 Device.
**Eventos:** `pairing.started`, `pairing.completed`, `pairing.failed`.

## TelemetryReading
**Propósito:** lectura energética instantánea de un device (serie temporal). Contrato completo en `07-iot/telemetry-model.md`.
**Atributos clave:** `reading_id`, `device_id`, `kit_id`, `installation_id`, `source_timestamp`, `received_timestamp`, `active_power_w`, `energy_wh_delta`, `voltage_v`, `current_a`, `power_factor`, `event_hash` (idempotencia), `ingestion_status`, `raw_payload` (jsonb).
**Reglas:** consumos no negativos; `source_timestamp` válido y no excesivamente futuro; `event_hash` único.
**Eventos:** `telemetry.ingested`, `telemetry.rejected`.

## EnergyAggregate
**Propósito:** agregados precalculados (hora/día/semana/mes) por instalación y opcionalmente device/categoría, para reportes y desglose.
**Atributos:** `id`, `installation_id`, `device_id?`, `category_id?`, `granularity` (`hour|day|week|month`), `bucket_start`, `energy_kwh`, `cost_clp`, `peak_power_w?`, `recomputed_at`.
**Reglas:** recalculables desde telemetría; idempotentes por (`installation_id`,`device_id`,`granularity`,`bucket_start`).
**Eventos:** `aggregate.recomputed`.

## ElectricityBill
**Propósito:** boleta eléctrica cargada (pág. 8); base de tarifa y comparación.
**Atributos:** `id`, `installation_id`, `distributor_id?`, `tariff_id?`, `client_number?`, `period_start`, `period_end`, `consumption_kwh`, `total_clp`, `fixed_charge_clp?`, `variable_charge_clp?`, `due_date?`, `file_url`, `status` (`uploaded|parsed|confirmed`), `raw_extraction?` (jsonb).
**Reglas:** conserva archivo original (referencia segura); el total y consumo no negativos.
**Eventos:** `bill.uploaded`, `bill.confirmed`.

## Tariff
**Propósito:** estructura tarifaria (AT/BT, cargo fijo, energía, cargo por demanda).
**Atributos:** `id`, `distributor_id?`, `code`, `name`, `segment?`, `energy_price_clp_kwh` (`numeric`), `fixed_charge_clp?`, `demand_charge_clp_kw?`, `valid_from?`, `valid_to?`.
**Relaciones:** 1→N ElectricityBill, Installation.
**Reglas:** un cálculo de costo monetario requiere una tarifa o boleta base.

## Distributor
**Propósito:** distribuidora eléctrica (Enel, CGE, etc.).
**Atributos:** `id`, `name`, `country` (default `CL`), `code?`.
**Relaciones:** 1→N Tariff, ElectricityBill.

## Alert
**Propósito:** alerta por consumo anómalo / dispositivo elevado / sobreconsumo / offline.
**Atributos:** `id`, `installation_id`, `device_id?`, `type` (`anomaly|high_device|over_budget|offline`), `severity` (`info|warning|critical`), `status` (`open|reviewed|dismissed`), `message`, `context` (jsonb), `estimated_impact_clp?`, `reviewed_by?`, `reviewed_at?`.
**Relaciones:** N→1 Installation; N→0..1 Device; 1→N Recommendation.
**Reglas:** toda alerta tiene severidad y estado.
**Eventos:** `alert.raised`, `alert.reviewed`, `alert.dismissed`.

## Recommendation
**Propósito:** sugerencia de ahorro con impacto estimado en CLP (pág. 20).
**Atributos:** `id`, `installation_id`, `alert_id?`, `source` (`alert|periodic_analysis`), `title`, `description`, `estimated_saving_clp?`, `priority`, `status` (`new|applied|dismissed`).
**Relaciones:** N→0..1 Alert; N→1 Installation.
**Reglas:** sin tarifa/boleta suficiente no se genera impacto monetario (se omite el campo CLP, no se inventa).
**Eventos:** `recommendation.created`, `recommendation.applied`.

## ControlAction
**Propósito:** acción de control puntual sobre un device (on/off/límite).
**Atributos:** `id`, `device_id`, `user_id`, `type` (`turn_on|turn_off|set_limit`), `status` (`pending|success|failed|rejected`), `payload?` (jsonb), `result?` (jsonb), `requested_at`, `resolved_at?`.
**Reglas:** requiere permiso `operator|admin|owner` sobre la instalación; siempre auditada.
**Eventos:** `control.requested`, `control.resolved`.

## ControlSchedule
**Propósito:** programación horaria de encendido/apagado (págs. 18–19).
**Atributos:** `id`, `device_id`, `action` (`turn_on|turn_off`), `cron_or_rule` (jsonb), `enabled`, `created_by`.
**Reglas:** requiere permiso de control; valida solapamientos lógicos.

## ConsumptionLimit
**Propósito:** límite de consumo por device con alerta previa.
**Atributos:** `id`, `device_id`, `limit_kwh?`, `limit_power_w?`, `window` (`day|month`), `pre_alert_pct?`, `action_on_exceed` (`alert|turn_off`), `enabled`.
**Reglas:** límites positivos; al exceder puede generar Alert y/o ControlAction.

## Notification
**Propósito:** notificación entregada al usuario (in-app/email/push).
**Atributos:** `id`, `organization_id`, `installation_id?`, `user_id?`, `channel` (`in_app|email|push`), `title`, `body`, `read_at?`, `related_type?`, `related_id?`.
**Eventos:** `notification.sent`, `notification.read`.

## AuditLog
**Propósito:** bitácora inmutable de acciones sensibles (control, cambios de rol, claim de kit).
**Atributos:** `id`, `organization_id`, `user_id?`, `action`, `entity_type`, `entity_id?`, `before?` (jsonb), `after?` (jsonb), `ip?`, `created_at`.
**Reglas:** solo inserción (append-only); nunca update/delete.
