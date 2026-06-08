# Reglas de Negocio — SmartSense

> Deriva de `specs/_canon.md`, `specs/02-domain/domain-model.md` y `specs/02-domain/bounded-contexts.md`. Reglas numeradas `BR-NNN`. Cada regla indica enunciado, entidad(es) afectada(s), dónde se aplica (Dominio / BD / API) y severidad si se viola.

## Leyenda

- **Capa de aplicación:**
  - **Dominio** = invariante de servicio/agregado (capa de negocio en `apps/api`).
  - **BD** = constraint/trigger en PostgreSQL/Timescale (último guardián).
  - **API** = validación en el borde (request schema / autorización antes de llegar al dominio).
- **Severidad de violación:**
  - **Crítica** = corrupción de datos, cross-tenant, dinero o control físico incorrecto → rechazar y auditar.
  - **Alta** = integridad de negocio comprometida → rechazar.
  - **Media** = dato inconsistente recuperable → rechazar o corregir.
  - **Baja** = degradación de calidad → advertir/registrar.

---

## 1. Identidad y multi-tenant

### BR-001 — Email único global
**Enunciado:** no pueden existir dos `users` con el mismo `email` (citext).
**Entidades:** `User`.
**Dónde:** BD (`UNIQUE(email)`) + API (chequeo en registro).
**Severidad:** Alta.

### BR-002 — Usuario operativo requiere membresía activa
**Enunciado:** un `User` no puede operar sobre ninguna organización sin al menos una `Membership` con `status='active'`.
**Entidades:** `User`, `Membership`.
**Dónde:** Dominio (autorización) + API (middleware de sesión).
**Severidad:** Alta.

### BR-003 — Organización conserva al menos un owner
**Enunciado:** no se puede revocar/eliminar el último `Membership` con `role='owner'` de una `Organization`.
**Entidades:** `Membership`, `Organization`.
**Dónde:** Dominio (servicio de membresías).
**Severidad:** Alta.

### BR-004 — Membresía única por par usuario-organización
**Enunciado:** el par (`user_id`, `organization_id`) es único.
**Entidades:** `Membership`.
**Dónde:** BD (`UNIQUE(user_id, organization_id)`) + API.
**Severidad:** Media.

### BR-005 — Aislamiento multi-tenant (no cross-tenant)
**Enunciado:** ninguna operación de lectura o escritura expone o modifica datos de una `organization_id` distinta a la del actor autenticado.
**Entidades:** todas las que resuelven tenant.
**Dónde:** Dominio (scoping obligatorio en repositorios) + BD (trigger/política donde aplique) + API (contexto de tenant en cada request).
**Severidad:** Crítica.

---

## 2. Onboarding, kit y dispositivos

### BR-010 — QR de kit único
**Enunciado:** `EnergyKit.qr_code` es único globalmente.
**Entidades:** `EnergyKit`.
**Dónde:** BD (`UNIQUE(qr_code)`) + API.
**Severidad:** Alta.

### BR-011 — Kit activo único por serial
**Enunciado:** a lo sumo una fila de `energy_kits` con `status='active'` por `serial`; un kit no puede estar `active` en dos instalaciones simultáneamente.
**Entidades:** `EnergyKit`.
**Dónde:** BD (UNIQUE parcial `WHERE status='active'` sobre `serial`) + Dominio (claim/transfer).
**Severidad:** Crítica.

### BR-012 — Transferencia controlada de kit
**Enunciado:** mover un kit de una instalación a otra exige pasar por `status='transferring'`; durante la transferencia el kit no acepta nueva telemetría asociada a la instalación destino hasta completar el claim.
**Entidades:** `EnergyKit`, `Installation`.
**Dónde:** Dominio (máquina de estados del kit) + Audit (`kit.transferred`).
**Severidad:** Alta.

### BR-013 — Perfil de instalación coherente con el segmento
**Enunciado:** el shape de `InstallationProfile.extra` (y campos específicos) valida contra el `segment` de la `Installation`.
**Entidades:** `Installation`, `InstallationProfile`.
**Dónde:** Dominio (validación por segmento) + API (schema condicional).
**Severidad:** Media.

### BR-014 — Device pertenece a un kit válido
**Enunciado:** todo `Device` pertenece a exactamente un `EnergyKit` existente; `installation_id` denormalizado debe coincidir con el del kit (cuando el kit está claimed).
**Entidades:** `Device`, `EnergyKit`.
**Dónde:** BD (FK `kit_id` + FK `installation_id`) + Dominio (consistencia de denormalización).
**Severidad:** Alta.

### BR-015 — external_ref único dentro del kit
**Enunciado:** el par (`kit_id`, `external_ref`) es único.
**Entidades:** `Device`.
**Dónde:** BD (`UNIQUE(kit_id, external_ref)`).
**Severidad:** Media.

### BR-016 — Solo dispositivos con switch se controlan
**Enunciado:** una acción de control o programación solo es válida si el `Device` declara capacidad `switch` en `capabilities`.
**Entidades:** `Device`, `ControlAction`, `ControlSchedule`.
**Dónde:** Dominio (validación de capacidad) + API.
**Severidad:** Alta.

---

## 3. Telemetría e ingesta

### BR-020 — Telemetría solo de dispositivo asociado a kit válido
**Enunciado:** no se registra `TelemetryReading` cuyo `device_id` no pertenezca a un `Device` existente asociado a un `EnergyKit` válido (claimed/active); de lo contrario `ingestion_status='invalid'`.
**Entidades:** `TelemetryReading`, `Device`, `EnergyKit`.
**Dónde:** Dominio (iot-bridge/ACL valida) + BD (FK `device_id`).
**Severidad:** Crítica.

### BR-021 — Idempotencia por event_hash
**Enunciado:** `event_hash` es único; una lectura repetida se marca `ingestion_status='duplicate'` y no duplica el dato.
**Entidades:** `TelemetryReading`.
**Dónde:** BD (`UNIQUE(event_hash)`) + Dominio (upsert/skip idempotente).
**Severidad:** Alta.

### BR-022 — Consumos y magnitudes no negativas
**Enunciado:** `energy_wh_delta`, `active_power_w`, `apparent_power_va`, `voltage_v`, `current_a` no pueden ser negativos; `power_factor` está en `[-1, 1]`.
**Entidades:** `TelemetryReading`.
**Dónde:** BD (CHECK) + Dominio (validación pre-ingesta).
**Severidad:** Media.

### BR-023 — Timestamp de origen válido y no excesivamente futuro
**Enunciado:** `source_timestamp` debe ser un timestamp válido y no superar `received_timestamp` en más de una tolerancia de reloj definida (sugerido: ≤ 5 minutos hacia el futuro); lecturas con `source_timestamp` excesivamente futuro se marcan `invalid`.
**Entidades:** `TelemetryReading`.
**Dónde:** Dominio (iot-bridge valida contra reloj del servidor) + API de ingesta.
**Severidad:** Media.

### BR-024 — Distinción origen vs recepción
**Enunciado:** `source_timestamp` (instante del dispositivo) y `received_timestamp` (instante de recepción) se almacenan ambos; la serie temporal se particiona por `source_timestamp`.
**Entidades:** `TelemetryReading`.
**Dónde:** Dominio + BD (hypertable por `source_timestamp`).
**Severidad:** Baja.

### BR-025 — Agregados recalculables e idempotentes
**Enunciado:** un `EnergyAggregate` es único por (`installation_id`, `device_id`, `category_id`, `granularity`, `bucket_start`) y puede recalcularse desde la telemetría cruda sin duplicar filas (upsert por la clave).
**Entidades:** `EnergyAggregate`, `TelemetryReading`.
**Dónde:** BD (UNIQUE compuesto) + Dominio (job de recálculo idempotente).
**Severidad:** Media.

### BR-026 — energy_kwh del agregado no negativo
**Enunciado:** `energy_kwh >= 0` y, si existe, `cost_clp >= 0`.
**Entidades:** `EnergyAggregate`.
**Dónde:** BD (CHECK).
**Severidad:** Media.

---

## 4. Boletas, tarifas y cálculo monetario

### BR-030 — Costo calculado siempre en backend, en CLP
**Enunciado:** todo valor monetario (`cost_clp`, `estimated_impact_clp`, `estimated_saving_clp`) se calcula en backend; el frontend solo renderiza valores ya calculados.
**Entidades:** `EnergyAggregate`, `Alert`, `Recommendation`.
**Dónde:** Dominio (servicio de costos).
**Severidad:** Alta.

### BR-031 — Cálculo monetario requiere tarifa o boleta base
**Enunciado:** no se calcula un costo o impacto monetario sin una `Tariff` aplicable o una `ElectricityBill` base suficiente; si falta, se omite el campo CLP (no se inventa un valor).
**Entidades:** `Tariff`, `ElectricityBill`, `EnergyAggregate`, `Recommendation`, `Alert`.
**Dónde:** Dominio (guard del servicio de costos).
**Severidad:** Alta.

### BR-032 — Recomendación monetaria sin base se omite el CLP
**Enunciado:** una `Recommendation` puede crearse sin `estimated_saving_clp` cuando no hay tarifa/boleta suficiente; el campo queda NULL en lugar de un valor estimado sin respaldo.
**Entidades:** `Recommendation`.
**Dónde:** Dominio.
**Severidad:** Media.

### BR-033 — Boleta conserva archivo original / referencia segura
**Enunciado:** toda `ElectricityBill` mantiene `file_url` apuntando al archivo original (storage privado/firmado); no se descarta el documento de respaldo.
**Entidades:** `ElectricityBill`.
**Dónde:** BD (`file_url NOT NULL`) + Dominio (storage seguro).
**Severidad:** Alta.

### BR-034 — Montos y consumo de boleta no negativos
**Enunciado:** `consumption_kwh >= 0` y `total_clp >= 0`.
**Entidades:** `ElectricityBill`.
**Dónde:** BD (CHECK).
**Severidad:** Media.

### BR-035 — Periodo de boleta coherente
**Enunciado:** `period_end >= period_start`.
**Entidades:** `ElectricityBill`.
**Dónde:** BD (`CHECK(period_end >= period_start)`).
**Severidad:** Media.

### BR-036 — Ciclo de estado de boleta
**Enunciado:** la boleta transita `uploaded → parsed → confirmed`; solo en `confirmed` se usa como base autoritativa de cálculo/comparación.
**Entidades:** `ElectricityBill`.
**Dónde:** Dominio (máquina de estados) + Audit (`bill.confirmed`).
**Severidad:** Media.

### BR-037 — Precio de tarifa no negativo
**Enunciado:** `energy_price_clp_kwh >= 0`, `fixed_charge_clp >= 0`, `demand_charge_clp_kw >= 0`.
**Entidades:** `Tariff`.
**Dónde:** BD (CHECK).
**Severidad:** Media.

---

## 5. Alertas y recomendaciones (Insights)

### BR-040 — Toda alerta tiene severidad y estado
**Enunciado:** toda `Alert` se crea con `severity ∈ {info, warning, critical}` y `status ∈ {open, reviewed, dismissed}` (default `open`).
**Entidades:** `Alert`.
**Dónde:** BD (CHECK + NOT NULL) + Dominio.
**Severidad:** Media.

### BR-041 — Revisión de alerta registra revisor
**Enunciado:** al pasar a `reviewed`/`dismissed`, se setean `reviewed_by` y `reviewed_at`.
**Entidades:** `Alert`, `User`.
**Dónde:** Dominio (servicio de alertas).
**Severidad:** Baja.

### BR-042 — Recomendación con fuente válida
**Enunciado:** toda `Recommendation` declara `source ∈ {alert, periodic_analysis}`; si `source='alert'` debe referir un `alert_id` existente.
**Entidades:** `Recommendation`, `Alert`.
**Dónde:** BD (CHECK + FK) + Dominio.
**Severidad:** Media.

---

## 6. Control físico de dispositivos

### BR-050 — Control requiere permiso sobre la instalación
**Enunciado:** no se controla un `Device` sin rol `operator | admin | owner` en la `Organization` dueña de la instalación del device; sin permiso la acción se rechaza (`status='rejected'`).
**Entidades:** `ControlAction`, `ControlSchedule`, `Membership`, `Device`, `Installation`.
**Dónde:** API (autorización RBAC) + Dominio.
**Severidad:** Crítica.

### BR-051 — Toda acción de control es auditada
**Enunciado:** cada `ControlAction` (solicitud y resolución) genera un registro en `audit_logs`.
**Entidades:** `ControlAction`, `AuditLog`.
**Dónde:** Dominio (servicio de control escribe audit) + Audit context.
**Severidad:** Crítica.

### BR-052 — Resultado de acción acotado a enum
**Enunciado:** el resultado/`status` de una `ControlAction` es siempre uno de `pending | success | failed | rejected`; `resolved_at` se setea al salir de `pending`.
**Entidades:** `ControlAction`.
**Dónde:** BD (CHECK) + Dominio (máquina de estados).
**Severidad:** Media.

### BR-053 — Programación de control válida
**Enunciado:** una `ControlSchedule` requiere permiso de control, `action ∈ {turn_on, turn_off}` y una `rule` válida; se validan solapamientos lógicos contradictorios.
**Entidades:** `ControlSchedule`.
**Dónde:** Dominio (validación de regla y solapamientos) + API.
**Severidad:** Media.

### BR-054 — Límite de consumo positivo y accionable
**Enunciado:** un `ConsumptionLimit` define al menos uno de `limit_kwh`/`limit_power_w` (> 0), `window ∈ {day, month}`, `pre_alert_pct ∈ [1,100]` si se usa, y `action_on_exceed ∈ {alert, turn_off}`.
**Entidades:** `ConsumptionLimit`.
**Dónde:** BD (CHECK) + Dominio.
**Severidad:** Media.

### BR-055 — Exceso de límite dispara alerta y/o control
**Enunciado:** al superarse un `ConsumptionLimit`, según `action_on_exceed` se genera una `Alert` (`over_budget`/`high_device`) y/o una `ControlAction` (`turn_off`); la pre-alerta se emite al alcanzar `pre_alert_pct`.
**Entidades:** `ConsumptionLimit`, `Alert`, `ControlAction`.
**Dónde:** Dominio (evaluador contra telemetría/agregados).
**Severidad:** Alta.

---

## 7. Notificaciones y auditoría

### BR-060 — Notificación con canal válido y tenant resuelto
**Enunciado:** toda `Notification` tiene `channel ∈ {in_app, email, push}` y un `organization_id` válido.
**Entidades:** `Notification`.
**Dónde:** BD (CHECK + FK) + Dominio.
**Severidad:** Media.

### BR-061 — Bitácora append-only
**Enunciado:** `audit_logs` solo admite INSERT; cualquier UPDATE/DELETE se bloquea por trigger de protección.
**Entidades:** `AuditLog`.
**Dónde:** BD (trigger append-only).
**Severidad:** Crítica.

### BR-062 — Auditoría conserva tenant y opcionalmente actor
**Enunciado:** todo `AuditLog` resuelve `organization_id`; `user_id` puede ser NULL solo para acciones de sistema.
**Entidades:** `AuditLog`.
**Dónde:** BD (`organization_id NOT NULL`) + Dominio.
**Severidad:** Alta.

---

## 8. Matriz de trazabilidad resumida

| Regla | Entidades | Capa principal | Severidad |
|---|---|---|---|
| BR-005 | (todas) | Dominio + BD + API | Crítica |
| BR-011 | EnergyKit | BD (UNIQUE parcial) | Crítica |
| BR-020 | TelemetryReading/Device/Kit | Dominio + BD | Crítica |
| BR-050 | ControlAction/Membership | API + Dominio | Crítica |
| BR-051 | ControlAction/AuditLog | Dominio | Crítica |
| BR-061 | AuditLog | BD (trigger) | Crítica |
| BR-031 | Tariff/Bill/Aggregate | Dominio | Alta |
| BR-021 | TelemetryReading | BD + Dominio | Alta |
| BR-022/BR-026/BR-034 | (no negativos) | BD (CHECK) | Media |
| BR-023 | TelemetryReading | Dominio | Media |
