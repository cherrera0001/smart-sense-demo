# Servicios de Dominio — SmartSense

> Deriva de `specs/_canon.md`, `specs/02-domain/domain-model.md`, `specs/03-data-model/relational-model.md`, `specs/04-api/api-overview.md` y `backend-architecture.md`.
> Cada servicio aísla la lógica de negocio de su bounded context. Las firmas son **conceptuales** (TypeScript ilustrativo); no contrato final. Todo método recibe implícitamente `TenantContext` (deriva `organization_id`) salvo `AuthService` (pre-tenant) y `TelemetryIngestionService` (scope de kit).

## Convenciones

- `ctx: TenantContext` = `{ organizationId, userId?, role?, requestId }`. Repositorios filtran siempre por `organizationId`.
- Eventos publicados al **event-bus** interno (ver `<mod>.events.ts`); nombres en notación `entidad.acción` del domain-model.
- Costo CLP nunca calculado fuera de `BillingService`.

---

## AuthService
**Responsabilidad:** registro, login, sesiones (JWT access+refresh), rotación y revocación de tokens, recuperación de contraseña.
**Entidades:** `users`, `memberships`, `organizations` (creación inicial), refresh tokens.
**Métodos:**
- `register(email, password, fullName)` → crea `user` + `organization` + `membership(owner)` + sesión.
- `login(email, password)` → valida (Argon2id) + emite tokens; throttling anti-fuerza-bruta.
- `refresh(refreshToken)` → rota refresh, emite nuevo access.
- `logout(refreshToken)` → revoca.
- `me(ctx)` → user + memberships activas.
- `requestPasswordReset(email)` / `resetPassword(token, newPassword)`.
**Reglas:** email único global; hash Argon2id; no operar sin membership activa; email existente en registro → 409 genérico; credenciales inválidas → 401 genérico.
**Eventos:** `user.registered`, `user.logged_in`, `user.password_reset`.

## OrganizationService
**Responsabilidad:** gestión de tenants y plan SaaS; listado de organizaciones del usuario.
**Entidades:** `organizations`, `memberships`.
**Métodos:**
- `create(ctx, { name, legalId?, segmentDefault? })` → org + membership owner del actor.
- `listForUser(userId)` → solo orgs con membership activa.
- `get(ctx, orgId)` / `updatePlan(ctx, orgId, plan)`.
- `inviteMember(ctx, { email, role })` / `changeRole(ctx, membershipId, role)` / `revokeMember(ctx, membershipId)`.
**Reglas:** ≥1 membership `owner` siempre; no se revoca/baja el último owner; par `(user_id, organization_id)` único.
**Eventos:** `organization.created`, `organization.plan_changed`, `membership.invited`, `membership.accepted`, `membership.role_changed`, `membership.revoked`.

## InstallationService
**Responsabilidad:** sitios físicos monitoreados; asignación de tarifa/distribuidora; estado.
**Entidades:** `installations`, `installation_profiles` (vía OnboardingService), `distributors`, `tariffs`.
**Métodos:**
- `list(ctx, { segment?, organizationId? })` → instalaciones del tenant en contexto.
- `create(ctx, { name, segment, address?, timezone? })`.
- `get(ctx, installationId)` → instalación + perfil.
- `update(ctx, installationId, patch)` → datos/tarifa/estado; cambios sensibles (tarifa, estado) → audit.
- `assignTariff(ctx, installationId, tariffId)`.
**Reglas:** pertenece a exactamente una org; `segment` determina el shape del profile; cambio de tarifa/estado auditado.
**Eventos:** `installation.created`, `installation.tariff_assigned`.

## OnboardingService
**Responsabilidad:** orquesta el flujo kit→devices→perfil→boleta; expone progreso reanudable. Coordina InstallationService, DeviceService, BillingService.
**Entidades:** `energy_kits`, `device_pairings`, `devices`, `installation_profiles`.
**Métodos:**
- `scanKit(ctx, qrCode)` → datos del kit; unclaimed→ok, inválido→404, retired→409.
- `claimKit(ctx, { qrCode, installationId })` → kit `active` ligado a instalación + audit.
- `pairDevice(ctx, { kitId, deviceExternalRef })` → pairing `paired` + `Device` creado.
- `saveProfile(ctx, installationId, profileData)` → valida shape contra `segment`.
- `status(ctx, installationId)` → avance del onboarding (kit→devices→perfil→boleta).
**Reglas:** ver `device-provisioning.md`; kit no `active` en dos instalaciones a la vez; `UNIQUE(kit_id, external_ref)`.
**Eventos:** `kit.scanned`, `kit.claimed`, `pairing.started`, `pairing.completed`, `pairing.failed`, `profile.updated`.

## DeviceService
**Responsabilidad:** dispositivos de un kit; renombrar/categorizar; capabilities; estado online/offline.
**Entidades:** `devices`, `device_categories`, `energy_kits`.
**Métodos:**
- `listByInstallation(ctx, installationId, { state? })`.
- `create(ctx, { kitId, externalRef, name, capabilities, categoryId? })` → `UNIQUE(kit_id, external_ref)`.
- `get(ctx, deviceId)` / `update(ctx, deviceId, { name?, categoryId? })`.
- `markSeen(deviceId, ts)` → actualiza `last_seen_at` + `state=online` (invocado por ingestión).
- `markOffline(deviceId)` → `state=offline` (invocado por job offline).
**Reglas:** telemetría solo si device pertenece a kit válido; `capabilities` jsonb `{meter, switch}`.
**Eventos:** `device.paired`, `device.online`, `device.offline`.

## TelemetryIngestionService
**Responsabilidad:** punto único de ingestión de lecturas; validación, idempotencia, persistencia en `telemetry_readings`.
**Entidades:** `telemetry_readings`, `devices` (resolución + markSeen).
**Métodos:**
- `ingest(kitScope, reading)` → valida, calcula/verifica `event_hash`, UPSERT idempotente; retorna `{ ingestion_status, duplicate }`.
- `latestByDevice(ctx, installationId)` → última lectura por device.
- `range(ctx, installationId, { from, to, deviceId? })` → serie en rango (`from>to`→422).
**Reglas:** no-negativos; `power_factor ∈ [-1,1]`; `source_timestamp` no excesivamente futuro; `UNIQUE(event_hash)`; device asociado a kit/instalación válidos. Contrato en `07-iot/telemetry-model.md`.
**Eventos:** `telemetry.ingested`, `telemetry.rejected`.

## EnergyAggregationService
**Responsabilidad:** consolidar continuous aggregates de Timescale en `energy_aggregates` por granularidad, invocando costeo; recálculo idempotente.
**Entidades:** `energy_aggregates`, lectura de continuous aggregates / `telemetry_readings`.
**Métodos:**
- `rollup(installationId, granularity, bucketStart)` → SUM kwh + peak, `cost_clp` vía BillingService, UPSERT.
- `recompute(installationId, { granularity, from, to })` → recálculo idempotente.
- `getSeries(ctx, installationId, { granularity, from, to, groupBy? })`.
**Reglas:** idempotente por `(installation_id, device_id, category_id, granularity, bucket_start)`; recalculable desde telemetría; `cost_clp=null` si no hay tarifa base.
**Eventos:** `aggregate.recomputed`.

## BillingService
**Responsabilidad:** **único** cálculo kWh→CLP; gestión de boletas (`electricity_bills`); comparación consumo medido vs. boleta.
**Entidades:** `electricity_bills`, `tariffs` (vía TariffService), `installations`.
**Métodos:**
- `computeCost({ installationId, energyKwh, peakKw?, granularity, at })` → `{ cost_clp | null, tariff_configured }`.
- `uploadBill(ctx, installationId, { period, consumptionKwh, totalClp, fileUrl, ... })` → crea boleta `uploaded`.
- `confirmBill(ctx, billId, corrections?)` → `confirmed`.
- `listBills(ctx, installationId, { status? })`.
- `resolveTariffBase(installationId)` → tarifa de instalación o derivada de última boleta confirmada.
**Reglas:** costo requiere tarifa o boleta base, si no → `null` (nunca se inventa CLP); `period_end ≥ period_start`; totales/consumo no negativos; conserva `file_url` original.
**Eventos:** `bill.uploaded`, `bill.confirmed`.

## TariffService
**Responsabilidad:** catálogo de tarifas y distribuidoras; vigencia temporal.
**Entidades:** `tariffs`, `distributors`.
**Métodos:**
- `listDistributors()` / `listTariffs({ distributorId?, segment? })`.
- `getEffectiveTariff(installationId, at)` → tarifa vigente (`valid_from/valid_to`).
- `upsertTariff(payload)` (admin/catálogo).
**Reglas:** catálogo global/distribuidora; `UNIQUE(distributor_id, code, valid_from)`; precios no negativos.

## DashboardService
**Responsabilidad:** vista en vivo de la instalación: potencia viva, kWh/CLP del día, estado del kit, alertas open.
**Entidades:** lee `telemetry_readings` (live), `energy_aggregates`, `alerts`, `energy_kits`, `devices`.
**Métodos:**
- `getDashboard(ctx, installationId)` → `{ live_power_w, energy_today_kwh, cost_today_clp|null, tariff_configured, kit_state, open_alerts }`.
- `subscribeLive(ctx, installationId)` → stream WebSocket alimentado por `telemetry.ingested`.
**Reglas:** CLP solo con tarifa; sin datos → empty state.

## ReportService
**Responsabilidad:** series temporales por granularidad fija (daily/weekly/monthly/last-three-months) desde `energy_aggregates`.
**Entidades:** `energy_aggregates`.
**Métodos:**
- `daily(ctx, installationId, { from, to })` / `weekly(...)` / `monthly(...)` / `lastThreeMonths(ctx, installationId)`.
**Reglas:** buckets con kWh y CLP (CLP solo si hay tarifa); hasta 3 meses según historial disponible; rango `from>to`→422.

## BreakdownService
**Responsabilidad:** desglose de consumo por device o categoría, con %, ranking y total.
**Entidades:** `energy_aggregates` (con `device_id`/`category_id`), `devices`, `device_categories`.
**Métodos:**
- `breakdown(ctx, installationId, { from, to, groupBy: 'device'|'category' })` → items ordenados desc + `total = Σ items`.
**Reglas:** total = suma de items; CLP por item solo si hay tarifa.

## AlertService
**Responsabilidad:** generar, deduplicar y resolver alertas (`anomaly|high_device|over_budget|offline`).
**Entidades:** `alerts`, lee `telemetry_readings`/`energy_aggregates`/`consumption_limits`.
**Métodos:**
- `evaluateStreaming(reading)` → umbrales/límites en caliente (high_device, over_budget por límite).
- `evaluateBatch(installationId)` → anomalía + proyección (over_budget) periódica.
- `raise({ installationId, deviceId?, type, severity, message, context, estimatedImpactClp? })` → dedup si equivalente sigue `open`.
- `list(ctx, installationId, { status?, severity?, type? })` → orden por severidad.
- `review(ctx, alertId, { status: reviewed|dismissed })` → `reviewed_by/at`.
**Reglas:** toda alerta tiene severidad y estado; dedup mientras esté `open`; `estimated_impact_clp` vía BillingService.
**Eventos:** `alert.raised`, `alert.reviewed`, `alert.dismissed`.

## RecommendationService
**Responsabilidad:** generar recomendaciones de ahorro (`alert` / `periodic_analysis`) con impacto en CLP.
**Entidades:** `recommendations`, lee `alerts`/`energy_aggregates`/desglose.
**Métodos:**
- `fromAlert(alert)` → recomendación ligada (`source=alert`).
- `runPeriodicAnalysis(installationId)` → recomendaciones (`source=periodic_analysis`).
- `list(ctx, installationId)` → orden por prioridad/impacto.
- `apply(ctx, recommendationId)` / `dismiss(ctx, recommendationId)`.
**Reglas:** `estimated_saving_clp` vía BillingService; sin tarifa/boleta → se omite CLP (nunca se inventa).
**Eventos:** `recommendation.created`, `recommendation.applied`.

## ControlService
**Responsabilidad:** acciones de control puntual (on/off/límite), programaciones y límites de consumo; despacho downlink y resolución async.
**Entidades:** `control_actions`, `control_schedules`, `consumption_limits`, `devices`.
**Métodos:**
- `requestAction(ctx, deviceId, { type, payload? })` → crea `control_action` `pending`, publica downlink MQTT, audita; viewer→`rejected`+403+audit.
- `resolveAction(actionId, result)` → `success|failed` al recibir ack (invocado por bridge/evento).
- `getControlState(ctx, deviceId)` → on/off/unknown + última acción confirmada.
- `createSchedule(ctx, deviceId, { action, rule, enabled })` → valida solapamientos.
- `createLimit(ctx, deviceId, { limitKwh?, limitPowerW?, window, preAlertPct?, actionOnExceed })`.
**Reglas:** requiere `operator|admin|owner`; toda acción auditada (incluida la rechazada); valida solapamiento de schedules; límites positivos.
**Eventos:** `control.requested`, `control.resolved`.

## NotificationService
**Responsabilidad:** entrega de notificaciones in_app/email/push y registro; marcado de lectura.
**Entidades:** `notifications`; integraciones email/push.
**Métodos:**
- `notify({ organizationId, installationId?, userId?, channel, title, body, relatedType?, relatedId? })` → persiste + despacha.
- `list(ctx, { unread? })` / `markRead(ctx, notificationId)`.
**Reglas:** canal del enum `in_app|email|push`; despacho externo tras puerto (resiliencia/reintentos en worker).
**Eventos:** `notification.sent`, `notification.read`.

## AuditService
**Responsabilidad:** bitácora inmutable de acciones sensibles (append-only).
**Entidades:** `audit_logs`.
**Métodos:**
- `record({ organizationId, userId?, action, entityType, entityId?, before?, after?, ip? })` → INSERT.
- `query(ctx, { entityType?, entityId?, from?, to? })`.
**Reglas:** solo INSERT (nunca UPDATE/DELETE); registra control, cambios de rol, claim/transfer de kit, cambios de tarifa/estado.
