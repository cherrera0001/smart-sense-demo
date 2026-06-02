# Pantallas — Frontend SmartSense

> Deriva de `specs/05-frontend/routes.md`, `specs/01-requirements/functional-requirements.md`, `specs/01-requirements/non-functional-requirements.md` (NFR-018 resiliencia UI, NFR-022 live) y `specs/04-api/openapi.yaml`.
> Para cada pantalla: **objetivo · datos requeridos · endpoints (operationId) · estados UI (loading/empty/success/error/offline) · componentes · validaciones · criterios de aceptación**.
> Componentes citados se definen en `components.md`. Estado server/UI en `state-management.md`.

Convención de estados UI aplicada a todas las pantallas (NFR-018):
- **loading**: skeletons, nunca pantalla en blanco.
- **empty**: `EmptyState` con mensaje y CTA, nunca error cuando solo falta data.
- **error**: `ErrorState` con reintento; distingue 401 (re-login), 403 (sin permiso), 5xx (reintentable).
- **offline**: `OfflineBanner` persistente; data servida desde caché de React Query (stale) y mutaciones encoladas/bloqueadas.

---

## (auth)

### `/login` — Inicio de sesión
- **Objetivo:** autenticar y obtener tokens; redirigir según estado de onboarding.
- **Datos requeridos:** `email`, `password`.
- **Endpoints:** `authLogin` POST `/auth/login`; tras éxito `authMe` GET `/auth/me`.
- **Estados:** loading (botón en envío) · empty (formulario inicial) · success (redirect) · error (401 genérico "credenciales inválidas"; 429 throttling con `Retry-After`) · offline (banner + submit deshabilitado).
- **Componentes:** `AuthCard`, `TextField`, `PasswordField`, `SubmitButton`, `ErrorState` inline.
- **Validaciones:** email con formato; password no vacío. Mensaje de error **genérico** (anti-enumeración, FR-AUTH-002).
- **Criterios de aceptación:** credenciales válidas → 200 + tokens + redirect; inválidas → 401 genérico; tras N fallos → mensaje de throttling.

### `/register` — Registro
- **Objetivo:** crear cuenta (+ organización owner implícita).
- **Datos requeridos:** `email`, `password`, `full_name`.
- **Endpoints:** `authRegister` POST `/auth/register`.
- **Estados:** loading · empty · success (sesión iniciada → `/onboarding/scan-kit`) · error (409 email existente, genérico) · offline.
- **Componentes:** `AuthCard`, `TextField`, `PasswordField` con medidor de fortaleza, `SubmitButton`.
- **Validaciones:** email formato; fortaleza de contraseña; `full_name` requerido.
- **Criterios de aceptación:** email nuevo → cuenta + org + membership owner + sesión; existente → 409 sin enumeración explotable.

### `/forgot-password` — Recuperación (V1)
- **Objetivo:** solicitar y aplicar reset por token de un solo uso.
- **Datos:** `email` (solicitud); `token` + nueva password (confirmación).
- **Endpoints:** (V1) request + confirm de reset.
- **Estados:** loading · success (mensaje **genérico** siempre) · error (token usado/expirado) · offline.
- **Validaciones:** fortaleza de nueva contraseña.
- **Criterios:** respuesta genérica anti-enumeración; token válido → contraseña cambiada y sesiones revocadas.

---

## (onboarding)

### `/onboarding/scan-kit` — Escaneo y claim del kit
- **Objetivo:** identificar el kit por QR y reclamarlo a una instalación.
- **Datos requeridos:** `qr_code` (cámara o manual); kit resuelto (`serial`, `model`, `firmware_version`, estado); instalación destino.
- **Endpoints:** `scanKit` POST `/onboarding/kit/scan`; `createInstallation` POST `/installations` (si no existe destino); `claimKit` POST `/onboarding/kit/claim`; `onboardingStatus` GET `/onboarding/status`.
- **Estados:** loading (resolviendo QR) · empty (escáner listo, sin captura) · success (datos del kit + botón reclamar) · error (404 QR inexistente, 409 kit `retired`/ya `active` `KIT_ALREADY_CLAIMED`) · offline (escáner local OK pero claim bloqueado).
- **Componentes:** `QRScanner`, `KitStatusIndicator`, `OnboardingStepper`, `ConfirmDialog`, `ErrorState`.
- **Validaciones:** QR no vacío; formato esperado; impedir claim si no hay instalación destino.
- **Criterios de aceptación:** QR válido `unclaimed` → muestra datos + claim; QR inválido → 404 claro; kit ya `active` en otra instalación → 409 sin reclamar.

### `/onboarding/pair-devices` — Emparejamiento de dispositivos
- **Objetivo:** observar scanning en vivo y confirmar dispositivos (`recommended` → `paired`).
- **Datos requeridos:** lista de `DevicePairing` (estado `scanning|recommended|paired|error`); por device a confirmar: `name`, `DeviceCategory`.
- **Endpoints:** `listDevices` GET `/installations/{installationId}/devices`; `pairDevice` POST `/onboarding/devices/pair`; **WebSocket** de pairing en vivo.
- **Estados:** loading (esperando primeros pairings) · empty ("buscando dispositivos…" con spinner; aún ninguno) · success (lista con estados) · error (`pairing.failed` → item en `error` con detalle) · offline (no llega progreso live → banner + sugerir revisar conexión del kit).
- **Componentes:** `DeviceCard` (con `PairingStatusBadge`), `DeviceNameForm`, `CategorySelect`, `OnboardingStepper`, `EmptyState`.
- **Validaciones:** nombre requerido al confirmar; categoría del catálogo; `UNIQUE(kit_id, external_ref)` (error backend mapeado).
- **Criterios de aceptación:** aceptar `recommended` → `paired` + `Device` creado; ≥1 device `paired` habilita continuar.

### `/onboarding/installation-type` — Tipo de instalación (segmento)
- **Objetivo:** elegir `home|smb|business` y datos base de la instalación.
- **Datos requeridos:** `segment`; `name`, `timezone` (default `America/Santiago`), `address?`.
- **Endpoints:** `createInstallation` POST `/installations` y/o `updateInstallation` PATCH `/installations/{id}`.
- **Estados:** loading · empty (selector sin elección) · success (avanza al perfil del segmento) · error (validación) · offline.
- **Componentes:** `SegmentSelector` (tarjetas home/smb/business), `TextField`, `TimezoneSelect`, `OnboardingStepper`.
- **Validaciones:** `segment` requerido; `name` requerido; timezone válida.
- **Criterios de aceptación:** selección persistida en `installations.segment`; el flujo de perfil se adapta al segmento elegido (ruta destino).

### `/onboarding/profile/home` — Perfil hogar
- **Objetivo:** capturar perfil `home`.
- **Datos requeridos:** `occupants`, `heating_system`, `operating_hours?`, `extra` (shape home).
- **Endpoints:** `updateInstallation` PATCH `/installations/{id}` (perfil).
- **Estados:** loading · empty (formulario vacío) · success (→ bill-upload) · error (validación) · offline.
- **Componentes:** `ProfileFormHome`, `NumberField`, `Select`, `OnboardingStepper`.
- **Validaciones:** `occupants >= 0`; `declared_power_kw >= 0` (si aplica).
- **Criterios de aceptación:** perfil `home` guardado con nº personas y calefacción.

### `/onboarding/profile/smb` — Perfil PyME
- **Objetivo:** capturar perfil `smb`.
- **Datos requeridos:** `operating_hours` (horario comercial), `critical_equipment` (jsonb), `declared_power_kw?`.
- **Endpoints:** `updateInstallation` PATCH `/installations/{id}`.
- **Estados:** loading · empty · success · error (validación horarios inicio<fin) · offline.
- **Componentes:** `ProfileFormSmb`, `ScheduleEditor` (horario operación), `CriticalEquipmentList`, `OnboardingStepper`.
- **Validaciones:** horarios coherentes (inicio < fin por bloque); potencias `>= 0`.
- **Criterios de aceptación:** perfil `smb` guardado con horarios y equipos críticos.

### `/onboarding/profile/business` — Perfil empresa
- **Objetivo:** capturar perfil `business`.
- **Datos requeridos:** turnos (`operating_hours`), `critical_equipment`, `declared_power_kw`.
- **Endpoints:** `updateInstallation` PATCH `/installations/{id}`.
- **Estados:** loading · empty · success · error · offline.
- **Componentes:** `ProfileFormBusiness`, `ScheduleEditor` (turnos), `CriticalEquipmentList`, `NumberField` (`declared_power_kw`), `OnboardingStepper`.
- **Validaciones:** `declared_power_kw >= 0`; turnos coherentes.
- **Criterios de aceptación:** perfil `business` guardado con potencia declarada y turnos.

### `/onboarding/bill-upload` — Carga de boleta (omitible)
- **Objetivo:** subir boleta y capturar datos para habilitar costos CLP; o **omitir**.
- **Datos requeridos:** archivo (imagen/PDF); periodo (`period_start`, `period_end`), `consumption_kwh`, `total_clp`, cargos, `distributor_id`, `client_number`, `tariff` (código + `energy_price_clp_kwh`).
- **Endpoints:** `createBill` POST `/installations/{installationId}/bills`; `listBills` GET (estado).
- **Estados:** loading (subiendo/guardando) · empty (uploader sin archivo) · success (`uploaded`→`parsed`→`confirmed`) · error (tipo/tamaño no permitido; `period_end < period_start`) · offline (subida bloqueada, opción "omitir y continuar").
- **Componentes:** `BillUploader`, `BillDataForm`, `DistributorSelect`, `TariffForm`, `OnboardingStepper`, `SkipButton`.
- **Validaciones:** tipo/tamaño de archivo; `period_end >= period_start`; `consumption_kwh >= 0`; `total_clp >= 0`; montos `>= 0`.
- **Criterios de aceptación:** archivo válido → `uploaded` con `file_url`; datos válidos → `parsed`; confirmación → `confirmed` (base de cálculo). Omitir → dashboard con "tarifa pendiente".

---

## (app)

### `/dashboard` — Inicio (DASH)
- **Objetivo:** snapshot en vivo: potencia, kWh y CLP del día, estado del kit, alertas open, comparación.
- **Datos requeridos:** `live_power_w` (nullable), `energy_today_kwh`, `cost_today_clp` (nullable + `tariff_configured`), `kit_status`/devices `online|offline|unknown`, `open_alerts`, comparación periodo anterior, `has_live_data`.
- **Endpoints:** `getDashboard` GET `/installations/{installationId}/dashboard`; **WebSocket** para live (NFR-022, p95 ≤ 2s); `listAlerts` (resumen badge).
- **Estados UI:**
  - **loading:** skeletons de gauge/cards.
  - **empty (NFR-018 / FR-DASH-007):** instalación sin telemetría ni historial → tarjetas en "aún sin datos", `EmptyState` con CTA (cargar boleta / esperar datos del kit). Nunca pantalla rota.
  - **success:** valores en vivo + comparación (si hay periodo anterior; si no, se omite, FR-DASH-004).
  - **error:** 5xx → `ErrorState` reintentable; 404/403 cross-tenant → mensaje de acceso.
  - **offline:** `OfflineBanner`; live congelado mostrando último valor en caché con marca "sin conexión en vivo".
- **Componentes:** `ConsumptionGauge`, `CostCard`, `ComparisonBadge`, `KitStatusIndicator`, `AlertSummaryCard`, `EmptyState`, `OfflineBanner`.
- **Validaciones:** ninguna entrada de usuario; manejo de `null` en `*_clp` → "tarifa pendiente" (no inventar valor, canon).
- **Criterios de aceptación:** con telemetría → live actualizado (p95 ≤ 2s); sin tarifa → "configura tarifa/boleta"; sin datos → dashboard usable con empty state; alertas open reflejadas en badge.

### `/reports` — Reportes (REP)
- **Objetivo:** series de consumo (kWh) y costo (CLP) por granularidad/rango.
- **Datos requeridos:** serie de buckets `{bucket_start, energy_kwh, cost_clp|null}`; granularidad `day|week|month|last-three-months` o rango personalizado (V1).
- **Endpoints:** `reportDaily` / `reportWeekly` / `reportMonthly` / `reportLastThreeMonths` GET `/installations/{installationId}/reports/{g}`.
- **Estados:** loading (skeleton de chart) · empty (sin agregados en el rango → `EmptyState` "aún no hay datos para este periodo") · success (gráfico Recharts) · error (422 `INVALID_RANGE` si `from>to`; 5xx reintentable) · offline (sirve caché stale + banner).
- **Componentes:** `TimeRangeSelector`, `ReportChart` (Recharts línea/barras), `MetricToggle` (kWh/CLP), `EmptyState`, `ExportCsvButton` (V2).
- **Validaciones:** rango `from <= to`; granularidad ∈ enum.
- **Criterios de aceptación:** serie correcta por granularidad; CLP solo si hay tarifa; `from>to` → validación 422; "últimos 3 meses" muestra los disponibles si hay <3.

### `/breakdown` — Desglose (BRK)
- **Objetivo:** consumo por dispositivo/categoría con %, ranking y total; detalle de un device (V1).
- **Datos requeridos:** items `{label, device_id|category_id, energy_kwh, cost_clp|null, pct}`; total del periodo; `groupBy`; (detalle) serie temporal y picos del device.
- **Endpoints:** `getBreakdown` GET `/installations/{installationId}/breakdown?groupBy=device|category`; (detalle) `rangeTelemetry` GET `/installations/{installationId}/telemetry/range`.
- **Estados:** loading · empty (total=0 / sin agregados → `EmptyState`) · success (dona + ranking + total) · error · offline.
- **Componentes:** `TimeRangeSelector`, `SegmentedControl` (device/categoría), `DeviceBreakdownChart` (dona/barras Recharts), `RankingList`, `TotalCard`, `DeviceDetailPanel` (V1), `EmptyState`.
- **Validaciones:** `groupBy` ∈ `device|category`; rango válido.
- **Criterios de aceptación:** lista con kWh por item; % suman ~100; ranking desc; total = suma de items; si total=0 → omite proporciones.

### `/control` — Control (CTRL)
- **Objetivo:** ver estado on/off de devices y ejecutar acciones inmediatas; ver bitácora.
- **Datos requeridos:** devices con `capabilities.switch`, `state` (`online|offline|unknown`), estado de control + última acción confirmada; historial de `control_actions`.
- **Endpoints:** `listDevices` GET `/installations/{installationId}/devices`; `getControlState` GET `/devices/{deviceId}/control-state`; `createControlAction` POST `/devices/{deviceId}/control-actions` (202 pending, resuelve async); bitácora vía historial de acciones.
- **Estados:** loading · empty (sin devices controlables → `EmptyState`) · success (toggles + bitácora) · error (403 sin permiso para `viewer` → toggle deshabilitado con tooltip; acción `failed`/timeout) · offline (toggles bloqueados, estado `unknown`).
- **Componentes:** `DeviceCard`, `ControlToggle` (con estado optimista + pending), `ControlActionLog`, `ConfirmDialog` (apagado de equipo, FR-CTRL-002), `EmptyState`, `OfflineBanner`.
- **Validaciones:** solo `operator|admin|owner` pueden actuar (FR-AUTH-009); confirmación al apagar; bloquear apagado automático de equipos críticos (FR-PROF-005) — el manual permitido con confirmación.
- **Criterios de aceptación:** con permiso → 202 `ControlAction pending` que resuelve a `success` (estado se actualiza vía WebSocket/refetch); `viewer` → 403, toggle no envía comando, intento auditado.

### `/alerts` — Alertas y recomendaciones (ALRT + REC)
- **Objetivo:** listar alertas priorizadas y recomendaciones; revisar/descartar.
- **Datos requeridos:** alertas `{id, type, severity, status, context, device_id?, estimated_impact_clp?}`; recomendaciones `{id, title, description, priority, estimated_saving_clp?, status, alert_id?}`.
- **Endpoints:** `listAlerts` GET `/installations/{installationId}/alerts?status&severity&type`; `reviewAlert` PATCH `/alerts/{id}/review`; `listRecommendations` GET `/installations/{installationId}/recommendations`.
- **Estados:** loading · empty (sin alertas/recomendaciones → `EmptyState` "todo en orden") · success (listas ordenadas por severidad/prioridad) · error (5xx reintentable; 403 al revisar sin permiso) · offline (lectura desde caché; revisar bloqueado).
- **Componentes:** `AlertList`/`AlertItem` (con `SeverityBadge`), `AlertFilters`, `RecommendationCard`, `ReviewActions` (revisar/descartar), `EmptyState`.
- **Validaciones:** transición solo desde `open`; revisar requiere `operator|admin|owner`; CLP solo si hay tarifa (no inventar).
- **Criterios de aceptación:** `critical` primero; revisar → estado + revisor persistidos y baja el badge del dashboard (FR-DASH-006); recomendaciones ordenadas por prioridad/ahorro.

### `/projections` — Proyecciones (PROJ · V1)
- **Objetivo:** proyectar consumo/costo del mes y riesgo de sobreconsumo.
- **Datos requeridos:** kWh proyectado, CLP proyectado (nullable), boleta anterior `confirmed` (comparación), nivel de confianza/riesgo.
- **Endpoints:** (V1) proyección derivada de `reportMonthly` + `listBills` (boleta confirmed); cálculo en backend.
- **Estados:** loading · empty (mes sin datos suficientes → `EmptyState` "necesitamos más días del mes"; baja confianza señalizada) · success (proyección + comparación si hay boleta) · error · offline.
- **Componentes:** `ProjectionChart` (Recharts, real vs proyectado), `ComparisonBadge` (vs boleta anterior), `RiskIndicator`, `ConfidenceTag`, `EmptyState`.
- **Validaciones:** ninguna entrada; sin tarifa → solo kWh; sin boleta previa → omite comparación.
- **Criterios de aceptación:** con datos del mes → kWh proyectado; con tarifa → CLP; con boleta previa → variación %; proyección > base → riesgo alto.

### `/smart-control` — Control inteligente (CTRL-004/005/006 · V1)
- **Objetivo:** crear/gestionar programación horaria y límites de consumo con pre-alerta.
- **Datos requeridos:** device objetivo; `ControlSchedule` (`rule` jsonb: días/horarios, `action`); `ConsumptionLimit` (`limit_kwh?`/`limit_power_w?`, `window` day|month, `pre_alert_pct?`, `action_on_exceed` alert|turn_off).
- **Endpoints:** `listDevices`; `createControlSchedule` POST `/devices/{deviceId}/control-schedules`; `createConsumptionLimit` POST `/devices/{deviceId}/consumption-limits`.
- **Estados:** loading · empty (sin programaciones/límites → `EmptyState` con CTA crear) · success (lista de reglas + límites) · error (solapamiento de horarios; validación de límites; 403 sin permiso) · offline (creación bloqueada).
- **Componentes:** `DeviceSelect`, `ScheduleEditor`, `ConsumptionLimitForm`, `ScheduleList`, `LimitList`, `EmptyState`.
- **Validaciones:** requiere `operator|admin|owner`; horarios sin solapamiento (inicio<fin); límites positivos; `pre_alert_pct` 1..100; `action_on_exceed=turn_off` no aplica a equipos críticos (FR-PROF-005).
- **Criterios de aceptación:** programación válida → al cumplirse genera `ControlAction` auditada; al alcanzar `pre_alert_pct` → `Alert(over_budget, warning)` una vez por ventana; superar límite → alerta y/o apagado auditado.

### `/settings` — Ajustes (SET)
- **Objetivo:** gestionar perfil de usuario, instalación, dispositivos, tarifa/distribuidora, seguridad, usuarios (V1) y plan (V2).
- **Secciones y datos:**
  - **Perfil (FR-SET-001):** `full_name`, `phone`, `locale`.
  - **Instalación (FR-SET-002):** `name`, `address`, `timezone`, `status`.
  - **Dispositivos (FR-SET-003):** renombrar/categorizar device; retirar kit (`retired`, soft).
  - **Tarifa/Distribuidora (FR-SET-004):** `distributor_id`, `tariff_id`.
  - **Seguridad (FR-SET-006/AUTH-010):** cambio de contraseña, sesiones activas, cerrar todas; logout.
  - **Usuarios (FR-SET-007/AUTH-006/007/008 · V1):** invitar, cambiar rol, revocar.
  - **Plan (FR-SET-008 · V2):** ver/cambiar plan SaaS (solo owner).
- **Endpoints:** `authMe`; `updateInstallation` PATCH `/installations/{id}`; `updateDevice` PATCH `/devices/{id}`; `authLogout` POST `/auth/logout`; (V1) gestión usuarios/roles; (V2) plan.
- **Estados:** loading · empty (sección sin datos, p. ej. sin dispositivos) · success (formularios persistidos) · error (validación; 403 si rol insuficiente → sección oculta/deshabilitada) · offline (guardado bloqueado).
- **Componentes:** `SettingsTabs`, `ProfileForm`, `InstallationForm`, `DeviceSettingsList`, `TariffDistributorForm`, `SecurityPanel` (`PasswordChangeForm`, `SessionsList`), `UsersTable` (V1), `PlanPanel` (V2), `ConfirmDialog`.
- **Validaciones:** un usuario solo edita su propio perfil; instalación/dispositivos/tarifa requieren `admin|owner`; cambio de contraseña exige actual correcta y fortaleza; no degradar/eliminar último owner.
- **Criterios de aceptación:** cambios guardados y reflejados; tras asignar tarifa los costos CLP usan la nueva tarifa; "cerrar todas las sesiones" invalida refresh tokens; gestión de usuarios/plan visible solo para roles autorizados.
