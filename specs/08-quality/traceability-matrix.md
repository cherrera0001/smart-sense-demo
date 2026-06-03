# Matriz de Trazabilidad Maestra — SmartSense

> Vincula end-to-end cada **pantalla de maqueta** con su **FR real** (`01-requirements/functional-requirements.md`), **entidad(es) de dominio** y **tabla(s)** (`02-domain`, `03-data-model/relational-model.md`), **endpoint API real** (`04-api/api-overview.md`), **componente frontend real** y **ruta** (`05-frontend/{routes,components}.md`), **servicio backend real** (`06-backend/services.md`), **criterio de aceptación** y **prueba esperada** (`08-quality/test-plan.md`).
> Todos los IDs (FR, tablas, endpoints, componentes, servicios) son reales del árbol de specs; no se inventan. Tipos de prueba según `test-plan.md` (unit/integ/db/authz/iot/ui/e2e/load).

## Convención de columnas

`Pág` = página de maqueta · `FR` = requerimiento(s) funcional(es) · `Entidades` · `Tablas` · `Endpoint` (real) · `Ruta + Componente(s)` (real) · `Servicio` (real) · `Criterio de aceptación` · `Prueba esperada`.

## Matriz

| # | Pág | FR | Entidades | Tablas | Endpoint API | Ruta + Componente | Servicio | Criterio de aceptación | Prueba esperada |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 Registro | FR-AUTH-001 | User, Organization, Membership | `users`, `organizations`, `memberships` | POST `/auth/register` | `/register` · AuthCard, TextField, PasswordField, SubmitButton | AuthService | Email nuevo → user+org+membership owner+sesión; existente → 409 genérico | integ register happy + 409; unit AuthService email único |
| 2 | 2 Login | FR-AUTH-002 | User, Membership | `users`, `memberships` | POST `/auth/login` · GET `/auth/me` | `/login` · AuthCard, PasswordField | AuthService | Credenciales válidas → 200+tokens; inválidas → 401 genérico; N fallos → throttle | integ login happy/401; load throttling (NFR-004) |
| 3 | 2b Recuperar contraseña | FR-AUTH-005 | User, Notification | `users`, `notifications` | (V1) reset request/confirm | `/forgot-password` · AuthCard | AuthService, NotificationService | Token válido → cambia clave y revoca sesiones; respuesta genérica anti-enumeración | unit reset token; integ respuesta genérica |
| 4 | 21d Seguridad | FR-AUTH-010 | User, AuditLog | `users`, `audit_logs` | PATCH `/installations/{id}` (sección)/auth | `/settings` · SecurityPanel, PasswordChangeForm, SessionsList | AuthService, AuditService | Actual correcta → clave cambiada; cerrar todas → refresh invalidados | integ cambio clave; unit revocación de sesiones |
| 5 | 21c Usuarios/roles | FR-AUTH-006/007/008 | Membership, User, AuditLog, Notification | `memberships`, `users`, `audit_logs`, `notifications` | PATCH `/installations/{id}` (gestión org)/orgs | `/settings` · UsersTable, ConfirmDialog | OrganizationService, AuditService | Cambio de rol/invitación/revocación con audit; no quitar último owner | unit último owner; integ invite→active; authz admin no asciende a owner |
| 6 | transversal | FR-AUTH-009 | Membership | `memberships` | todos (motor authz) | AppSidebar (visibilidad), guards de ruta | (todos los servicios) | Acción sin permiso → 403 sin mutar; cross-tenant → 403/404 | authz matriz por rol; integ cross-tenant (NFR-001/003) |
| 7 | 3a Escaneo QR | FR-ONB-001 | EnergyKit | `energy_kits` | POST `/onboarding/kit/scan` | `/onboarding/scan-kit` · QRScanner | OnboardingService | QR unclaimed → datos del kit; inexistente → 404; retired → 409 | integ scan 200/404/409; unit scanKit estados |
| 8 | 3b Confirmar kit | FR-ONB-002 | EnergyKit, Installation, AuditLog | `energy_kits`, `installations`, `audit_logs` | POST `/onboarding/kit/claim` | `/onboarding/scan-kit` · ConfirmDialog, KitStatusIndicator | OnboardingService, AuditService | Kit unclaimed → active+audit; ya active en otra → 409 KIT_ALREADY_CLAIMED | integ claim happy+409; unit kit no active en 2 sitios; audit registrado |
| 9 | 3c Emparejamiento | FR-ONB-003/004 | DevicePairing, EnergyKit, Device | `device_pairings`, `energy_kits`, `devices` | POST `/onboarding/devices/pair` · WebSocket live | `/onboarding/pair-devices` · DeviceCard, PairingStatusBadge | OnboardingService, DeviceService | scanning→recommended→paired; aceptar recommended → Device creado | integ pair; unit transición de estados; e2e progreso en vivo |
| 10 | 4 Nombrar device | FR-ONB-005 | Device, DeviceCategory | `devices`, `device_categories` | POST `/devices` | `/onboarding/pair-devices` · DeviceCard, Select | DeviceService | Device persistido con UNIQUE(kit_id, external_ref); listo para telemetría | db UNIQUE(kit_id,external_ref); integ create device |
| 11 | 5 Tipo instalación | FR-ONB-006/008 | Installation, Organization | `installations`, `organizations` | POST `/installations` · PATCH `/installations/{id}` | `/onboarding/installation-type` · SegmentSelector | InstallationService, OnboardingService | Segmento persistido en `installations.segment`; perfil se adapta | integ create+patch segment; unit segment→shape perfil |
| 12 | 5b Nueva instalación | FR-ONB-008 | Installation, Organization | `installations`, `organizations` | POST `/installations` | `/onboarding/installation-type` · InstallationForm, TimezoneSelect | InstallationService | Instalación creada (status active), timezone default America/Santiago | integ create installation (admin/owner); authz viewer→403 |
| 13 | Onboarding (transversal) | FR-ONB-007 | Installation, EnergyKit, Device, InstallationProfile | `installations`, `energy_kits`, `devices`, `installation_profiles` | GET `/onboarding/status` | layout `(onboarding)` · OnboardingStepper | OnboardingService | Refleja avance kit→devices→perfil→boleta; permite retomar | integ status; e2e reanudar onboarding |
| 14 | 6/6b/7 Perfil | FR-PROF-001/002/003/004 | InstallationProfile, Installation | `installation_profiles`, `installations` | PATCH `/installations/{id}` (perfil) | `/onboarding/profile/{home,smb,business}` · ProfileFormHome/Smb/Business | InstallationService, OnboardingService | Perfil 1↔1 guardado; `extra` valida contra segment; occupants/power ≥0 | unit saveProfile shape; db CHECK occupants/declared_power_kw ≥0 |
| 15 | 7b Equipos críticos | FR-PROF-005 | InstallationProfile | `installation_profiles` | PATCH `/installations/{id}` | `/settings`,`/onboarding/profile/*` · CriticalEquipmentList | InstallationService | Equipo crítico no se apaga por acción automática de límite | unit límite turn_off bloqueado si isCritical |
| 16 | 8 Cargar boleta | FR-BILL-001/008 | ElectricityBill, Installation | `electricity_bills`, `installations` | POST `/installations/{installationId}/bills` | `/onboarding/bill-upload` · BillUploader | BillingService | Archivo válido → boleta uploaded con file_url; tipo no permitido → rechazado | integ upload 200/415; ui BillUploader bloqueado offline |
| 17 | 8b/8c Datos boleta | FR-BILL-002/003/004/005/006 | ElectricityBill, Distributor, Tariff | `electricity_bills`, `distributors`, `tariffs` | POST `/installations/{installationId}/bills` | `/onboarding/bill-upload` · BillDataForm, DistributorSelect, TariffForm | BillingService, TariffService | period_end ≥ period_start; consumo/montos ≥0; distribuidora/tarifa del catálogo | db CHECK period_end≥period_start; unit no-negativos |
| 18 | 8d Confirmar boleta | FR-BILL-007 | ElectricityBill | `electricity_bills` | GET `/installations/{installationId}/bills` (estado) | `/onboarding/bill-upload` · BillDataForm, SubmitButton | BillingService | Confirmar → status confirmed; base de comparación/tarifa de cálculo | integ confirm→confirmed; unit base activa por periodo |
| 19 | 9 Dashboard | FR-DASH-001/002/003/005/006 | Installation, Device, TelemetryReading, EnergyAggregate, Alert | `telemetry_readings`, `energy_aggregates`, `devices`, `alerts` | GET `/installations/{installationId}/dashboard` | `/dashboard` · DashboardPage, ConsumptionGauge, CostCard, KitStatusIndicator, AlertSummaryCard | DashboardService | Muestra consumo instantáneo (W/kW) y costo actual (CLP) del día; estado kit; alertas open | integ dashboard happy path; e2e live WebSocket; CLP null sin tarifa |
| 20 | 9 Dashboard (vivo) | FR-DASH-001 | TelemetryReading, Device | `telemetry_readings`, `devices` | WebSocket (alimentado por POST `/iot/telemetry`) · GET `/installations/{installationId}/telemetry/latest` | `/dashboard` · ConsumptionGauge | DashboardService, TelemetryIngestionService | Lectura ingerida se refleja en vivo p95 ≤2s; sin telemetría → "sin datos en vivo" | load WebSocket (NFR-022); ui ConsumptionGauge value=null |
| 21 | 9 Dashboard (costo día) | FR-DASH-003 | EnergyAggregate, Tariff, ElectricityBill | `energy_aggregates`, `tariffs`, `electricity_bills` | GET `/installations/{installationId}/dashboard` | `/dashboard` · CostCard | DashboardService, BillingService | Con tarifa → CLP estimado; sin tarifa → "configura tarifa" sin inventar | unit computeCost con/sin tarifa; ui CostCard tariffConfigured=false |
| 22 | 9b Dashboard vacío | FR-DASH-007 | — | — | GET `/installations/{installationId}/dashboard` | `/dashboard` · EmptyState | DashboardService | Instalación sin datos → dashboard usable con CTA, sin pantalla rota | ui empty state; e2e instalación nueva (NFR-018) |
| 23 | 10 Reportes día/semana/mes | FR-REP-001/002/003 | EnergyAggregate | `energy_aggregates` | GET `/installations/{installationId}/reports/{daily,weekly,monthly}` | `/reports` · ReportChart, TimeRangeSelector, MetricToggle | ReportService | Serie de buckets con kWh y CLP (CLP solo con tarifa) | integ reports por granularidad; load p95 ≤300ms (NFR-020/023) |
| 24 | 10b Últimos 3 meses | FR-REP-004 | EnergyAggregate | `energy_aggregates` | GET `/installations/{installationId}/reports/last-three-months` | `/reports` · ReportChart | ReportService | Hasta 3 buckets month; menos si no hay historial (no inventa) | integ <3 meses → devuelve disponibles |
| 25 | 10 Rango personalizado | FR-REP-005 | EnergyAggregate | `energy_aggregates` | GET `/installations/{installationId}/telemetry/range` / reports | `/reports` · TimeRangeSelector | ReportService, TelemetryIngestionService | Rango válido → serie; `from>to` → 422 INVALID_RANGE | integ range 422; ui validación from≤to |
| 26 | 11 Desglose por device/categoría | FR-BRK-001/002/005 | EnergyAggregate, Device, DeviceCategory | `energy_aggregates`, `devices`, `device_categories` | GET `/installations/{installationId}/breakdown?groupBy=device\|category` | `/breakdown` · DeviceBreakdownChart, MetricToggle | BreakdownService | Lista por device/categoría; total = suma de items | integ breakdown groupBy; unit total=Σitems |
| 27 | 11b Proporción y ranking | FR-BRK-003/004 | EnergyAggregate | `energy_aggregates` | GET `/installations/{installationId}/breakdown` | `/breakdown` · DeviceBreakdownChart | BreakdownService | Σ% ≈100; ranking desc por kWh; total=0 → empty | unit %≈100 y orden desc; ui total=0→EmptyState |
| 28 | 11c Detalle de device | FR-BRK-006 | EnergyAggregate, Device, TelemetryReading | `energy_aggregates`, `devices`, `telemetry_readings` | GET `/installations/{installationId}/telemetry/range` | `/breakdown?device={id}` · DeviceCard, ReportChart | BreakdownService, TelemetryIngestionService | Serie y pico de potencia del device del tenant | integ range por device; authz device ajeno→403/404 |
| 29 | 9/20 Alertas pendientes | FR-DASH-006, FR-ALRT-005 | Alert, User | `alerts`, `users` | GET `/installations/{installationId}/alerts` · PATCH `/alerts/{id}/review` | `/dashboard` AlertSummaryCard · `/alerts` AlertList | AlertService | Contador de alertas open; revisar → reviewed/dismissed con reviewed_by/at; baja contador | integ review open→reviewed; unit baja contador |
| 30 | 20 Alertas | FR-ALRT-001/002/003/004/006 | Alert, Notification, Device, TelemetryReading, ConsumptionLimit | `alerts`, `notifications`, `devices`, `telemetry_readings`, `consumption_limits` | GET `/installations/{installationId}/alerts` | `/alerts` · AlertList, AlertItem, SeverityBadge, AlertFilters | AlertService | Genera anomaly/high_device/over_budget/offline; orden por severidad; dedup mientras open | unit raise+dedup; integ filtros y orden por severidad |
| 31 | 20 Recomendaciones | FR-REC-001/002/003/004/005 | Recommendation, Alert, Tariff | `recommendations`, `alerts`, `tariffs` | GET `/installations/{installationId}/recommendations` | `/alerts` · RecommendationCard | RecommendationService, BillingService | Lista por prioridad/impacto; estimated_saving_clp solo con tarifa; apply/dismiss | unit sin tarifa→sin CLP; integ apply/dismiss desde new |
| 32 | 17 Control on/off | FR-CTRL-001/002/003 | ControlAction, Device, AuditLog | `control_actions`, `devices`, `audit_logs` | POST `/devices/{deviceId}/control-actions` · GET `/devices/{deviceId}/control-state` | `/control` · ControlToggle, DeviceCard | ControlService, AuditService | Con permiso → 202 ControlAction pending (resuelve async); estado on/off/unknown | integ control 202; unit pending; INV-3 audit registrado |
| 33 | 17 Control sin permiso | FR-CTRL-009 | ControlAction, AuditLog | `control_actions`, `audit_logs` | POST `/devices/{deviceId}/control-actions` | `/control` · ControlToggle (disabled viewer) | ControlService, AuditService | viewer → 403, sin comando MQTT, intento auditado | authz viewer→403; integ rejected+audit; ui toggle disabled |
| 34 | 17 Resolución async | FR-CTRL-008 | ControlAction | `control_actions` | (iot-bridge → ControlService.resolveAction) | `/control` · ControlToggle (pending→success) | ControlService | ACK → success; sin ACK en timeout → failed; idempotente ante ACK duplicado | unit resolve success/failed/idempotente |
| 35 | 17b Bitácora control | FR-CTRL-007 | ControlAction, AuditLog | `control_actions`, `audit_logs` | GET (lista control-actions + audit) | `/control` · ControlActionLog | ControlService, AuditService | Toda acción aparece con actor/tipo/estado/timestamps; append-only | integ bitácora; db append-only audit (NFR-014) |
| 36 | 18-19 Programación | FR-CTRL-004 | ControlSchedule, ControlAction, AuditLog | `control_schedules`, `control_actions`, `audit_logs` | POST `/devices/{deviceId}/control-schedules` | `/smart-control` · ScheduleEditor | ControlService | Programación válida → al cumplirse genera ControlAction auditada; valida solapamientos | unit solapamiento; integ schedule→action auditada |
| 37 | 19b Límite de consumo | FR-CTRL-005/006 | ConsumptionLimit, Alert, ControlAction | `consumption_limits`, `alerts`, `control_actions` | POST `/devices/{deviceId}/consumption-limits` | `/smart-control` · ConsumptionLimitForm | ControlService, AlertService | Límite positivo, pre_alert_pct 1..100; al exceder → alerta y/o turn_off (salvo crítico) | db CHECK limit>0 y pct 1..100; unit pre-alerta una vez por ventana |
| 38 | 12 Proyección consumo/costo | FR-PROJ-001/002 | EnergyAggregate, Tariff | `energy_aggregates`, `tariffs` | (V1) GET reports/monthly + cálculo backend | `/projections` · ProjectionChart, CostCard | ReportService, BillingService, EnergyAggregationService | Con datos del mes → kWh proyectado; con tarifa → CLP proyectado | unit proyección; integ con/sin tarifa |
| 39 | 12b Comparación/riesgo | FR-PROJ-003/004 | ElectricityBill, EnergyAggregate, Alert | `electricity_bills`, `energy_aggregates`, `alerts` | (V1) GET bills + reports/monthly | `/projections` · ComparisonBadge | BillingService, AlertService | Compara vs boleta confirmed; riesgo alto → puede disparar over_budget | unit comparación vs boleta; integ riesgo→alerta |
| 40 | 21a Ajustes instalación | FR-SET-002 | Installation, AuditLog | `installations`, `audit_logs` | PATCH `/installations/{id}` | `/settings` · InstallationForm, TimezoneSelect | InstallationService, AuditService | admin/owner edita; cambios sensibles → audit; activar/inactivar respetado | integ patch (admin); authz viewer→403; audit estado |
| 41 | 21b Ajustes dispositivos | FR-SET-003 | Device, EnergyKit, DeviceCategory, AuditLog | `devices`, `energy_kits`, `device_categories`, `audit_logs` | PATCH `/devices/{id}` | `/settings` · DeviceSettingsList | DeviceService, AuditService | Renombrar/categorizar persistido; retirar kit → retired (soft), no acepta telemetría nueva | integ patch device; iot kit retired → ingesta invalid |
| 42 | 21e Ajustes tarifa | FR-SET-004 | Installation, Tariff, Distributor | `installations`, `tariffs`, `distributors` | PATCH `/installations/{id}` | `/settings` · TariffDistributorForm, DistributorSelect | InstallationService, TariffService | Asignar tarifa → costos CLP del dashboard usan la nueva tarifa | integ assignTariff; unit computeCost con nueva tarifa |
| 43 | 21f Notificaciones | FR-SET-005 | Notification, User | `notifications`, `users` | (preferencias usuario) | `/settings` · SettingsTabs | NotificationService | Notificaciones respetan canales habilitados (in_app/email/push) | unit despacho por canal habilitado |
| 44 | 21g Plan SaaS | FR-SET-008 | Organization, AuditLog | `organizations`, `audit_logs` | (orgs updatePlan) | `/settings` · PlanPanel | OrganizationService, AuditService | Solo owner cambia plan; cambio auditado | authz solo owner; integ plan change + audit |
| 45 | iot (sin pantalla) | FR-DASH-001 (ingesta) | TelemetryReading, Device | `telemetry_readings`, `devices` | POST `/iot/telemetry` | (sin UI; iot-bridge) | TelemetryIngestionService, DeviceService | event_hash nuevo → 200 accepted; repetido → 200 duplicate; inválido → 422; markSeen | iot idempotencia/validez/rangos (NFR-028/030/031); doble timestamp (NFR-029) |

## Cobertura por módulo

| Módulo | Filas | FR cubiertos |
|---|---|---|
| AUTH | 1–6 | FR-AUTH-001/002/005/006/007/008/009/010 |
| ONB | 7–13 | FR-ONB-001/002/003/004/005/006/007/008 |
| PROF | 14–15 | FR-PROF-001/002/003/004/005 |
| BILL | 16–18 | FR-BILL-001/002/003/004/005/006/007/008 |
| DASH | 19–22 | FR-DASH-001/002/003/005/006/007 |
| REP | 23–25 | FR-REP-001/002/003/004/005 |
| BRK | 26–28 | FR-BRK-001/002/003/004/005/006 |
| ALRT/REC | 29–31 | FR-ALRT-001..006, FR-REC-001..005 |
| CTRL | 32–37 | FR-CTRL-001..009 |
| PROJ | 38–39 | FR-PROJ-001/002/003/004 |
| SET | 40–44 | FR-SET-002/003/004/005/008 |
| IoT (ingesta) | 45 | FR-DASH-001 (telemetría) |

**Total filas de la matriz: 45.** Cubre los 12 módulos funcionales y la ingesta IoT. Esta matriz es el artefacto vivo que se actualiza en el criterio de cierre de cada fase del roadmap (`09-implementation-plan/roadmap.md`).

## Cobertura Fase 1 (estructura de datos)

> Mapea las 21 tablas → modelo Prisma (`packages/db/prisma/schema.prisma`) → migración (`packages/db/prisma/migrations/0001_init/migration.sql`) → test de integridad/constraint (`packages/db/tests/{integrity,constraints}.test.ts`).
> **Estado: estructura implementada ✅ · ejecución de migración/seed/tests ✅ VERIFICADO/PASS contra Neon real** (2026-06-02, Fase 1.4; `test:db:external` 18/18; ver `docs/audit/phase-1-vercel-neon-runtime-verification.md §Cierre Fase 1.4` y `phase-1-real-db-schema-verification.md`). Los **endpoints, servicios y pantallas** de la matriz principal (filas 1–45) siguen **pendientes (Fase 2+)**; Fase 1 solo materializa la base estructural y sus invariantes de datos.

| Tabla | Modelo Prisma | Migración | Test de integridad/constraint (suite `db`) |
|---|---|---|---|
| `users` | `User` | `0001_init` (citext email, UNIQUE) | T-F01-32 unicidad email |
| `organizations` | `Organization` (+`is_demo`) | `0001_init` | T-F01-29 migración+seed |
| `memberships` | `Membership` | `0001_init` (UNIQUE user_id,org_id) | T-F01-32 unicidad (user_id,org_id) |
| `installations` | `Installation` | `0001_init` (FK org/distributor/tariff) | T-F01-30 integridad referencial |
| `installation_profiles` | `InstallationProfile` | `0001_init` (1↔1, CHECK ≥0) | T-F01-31 no-negatividad (occupants/declared_power_kw) |
| `energy_kits` | `EnergyKit` | `0001_init` (UNIQUE qr_code, parcial active/serial) | T-F01-32 qr_code; T-F01-34 kit único activo |
| `device_categories` | `DeviceCategory` | `0001_init` (UNIQUE key) | T-F01-29 seed catálogo |
| `devices` | `Device` | `0001_init` (UNIQUE kit_id,external_ref) | T-F01-30 FK; T-F01-32 (kit_id,external_ref) |
| `device_pairings` | `DevicePairing` | `0001_init` | T-F01-30 integridad referencial |
| `telemetry_readings` | `TelemetryReading` | `0001_init` (hypertable, CHECK, UNIQUE(event_hash,source_timestamp)) | T-F01-31 no-neg/power_factor; T-F01-36 hypertable+idempotencia |
| `energy_aggregates` | `EnergyAggregate` | `0001_init` (UNIQUE compuesto, CHECK ≥0) | T-F01-31 energy_kwh≥0; T-F01-32 clave de agregado |
| `distributors` | `Distributor` | `0001_init` (UNIQUE code) | T-F01-29 seed catálogo |
| `tariffs` | `Tariff` | `0001_init` (UNIQUE(distributor_id,code,valid_from), CHECK ≥0) | T-F01-31 energy_price≥0; T-F01-32 unicidad tarifa |
| `electricity_bills` | `ElectricityBill` | `0001_init` (CHECK period_end≥period_start, montos ≥0) | T-F01-33 coherencia fechas; T-F01-31 montos/consumo |
| `alerts` | `Alert` | `0001_init` (enums type/severity/status) | T-F01-30 integridad referencial |
| `recommendations` | `Recommendation` | `0001_init` (enum source/status) | T-F01-30 integridad referencial |
| `control_actions` | `ControlAction` | `0001_init` (enums type/status) | T-F01-30 integridad referencial |
| `control_schedules` | `ControlSchedule` | `0001_init` | T-F01-30 integridad referencial |
| `consumption_limits` | `ConsumptionLimit` | `0001_init` (CHECK limit>0, pre_alert_pct 1..100) | T-F01-31 limit>0 y pct 1..100 |
| `notifications` | `Notification` | `0001_init` (enum channel) | T-F01-30 integridad referencial |
| `audit_logs` | `AuditLog` | `0001_init` (append-only trigger) | T-F01-35 append-only (UPDATE/DELETE bloqueado) |

**Invariantes/NFR estructurales cubiertos por la estructura Fase 1** — **VERIFICADO/PASS contra Neon real** (2026-06-02, `test:db:external` 18/18): INV-6 (idempotencia event_hash) ✅, INV-8 (append-only audit) ✅, NFR-028 (unicidad/idempotencia) ✅, NFR-029 (doble timestamp) ✅, NFR-031 (no-negatividad/rangos) ✅, NFR-041 (migración aplicable desde cero) ✅. NFR-026 (hypertable): **N/A en Neon** (sin TimescaleDB → fallback `DO/EXCEPTION`, `telemetry_readings` como tabla normal; queda pendiente verificar Timescale en un motor que lo soporte). Endpoints/servicios/UI de las filas 1–45: **pendientes Fase 2+**.

> **Verificación runtime (Fase 1.4):** la validación de las **21 tablas** contra una PostgreSQL real (migración aplicable desde cero, seeds, integridad/constraints/append-only/idempotencia) está cubierta por **GATE-DB-001..004** (ver `08-quality/runtime-gates.md`). Estado actual: **✅ VERIFICADO/PASS** contra **Neon** (Vercel, `neondb`) — `pnpm verify:phase1:external` GATE_EXIT=0, 21/21 tablas presentes. Las filas de invariantes/NFR de arriba quedan en PASS (excepto NFR-026 hypertable, N/A en Neon).

## Cobertura Fase 2 (API base: auth, organizations, installations, devices, onboarding)

> Marca los endpoints de Fase 2 implementados en `apps/api` (Fastify 5) como **IMPLEMENTADO + TESTEADO (PASS)** contra Neon real. Cubre filas 1–2, 6–13, 40–41 de la matriz principal en lo correspondiente a sus endpoints de Fase 2 (auth/orgs/installations/devices/onboarding). Endpoints/servicios de telemetría, dashboard, reportes, desglose, boletas, alertas, recomendaciones, control y proyecciones: **pendientes Fase 3+**.
> **Estado: ✅ IMPLEMENTADO + TESTEADO (PASS)** — 2026-06-02, `feat/phase-2-api-base`. **39/39 tests PASS** (`pnpm --filter @smartsense/api test`: auth 6, orgs 4, installations 8, devices 13, onboarding 8). Auditoría OpenAPI ↔ código 1:1 (manual): `docs/audit/phase-2-openapi-implementation-audit.md`.

| Filas matriz | Endpoint API (Fase 2) | Servicio | Implementado | Testeado | Estado |
|---|---|---|---|---|---|
| 1 | POST `/auth/register` | auth | sí | sí | PASS |
| 2 | POST `/auth/login` · GET `/auth/me` | auth | sí | sí | PASS |
| 2 | POST `/auth/logout` | auth | sí | sí | PASS |
| 6 | (motor RBAC + tenant-scope `assert*Access`) | access | sí | sí | PASS |
| 5/44 | GET `/organizations` · POST `/organizations` · GET `/organizations/{id}` | organizations | sí | sí | PASS |
| 11/12/40 | GET `/installations` · POST `/installations` | installations | sí | sí | PASS |
| 13/40 | GET `/installations/{id}` · PATCH `/installations/{id}` | installations | sí | sí | PASS |
| 7 | POST `/onboarding/kit/scan` | onboarding | sí | sí | PASS |
| 8 | POST `/onboarding/kit/claim` | onboarding | sí | sí | PASS |
| 9 | POST `/onboarding/devices/pair` | onboarding | sí | sí | PASS |
| 13 | GET `/onboarding/status` | onboarding | sí | sí | PASS |
| 10/41 | GET `/installations/{installationId}/devices` · POST `/devices` | devices | sí | sí | PASS |
| 41 | GET `/devices/{id}` · PATCH `/devices/{id}` | devices | sí | sí | PASS |

**Invariantes/NFR verificados por la suite de API (Fase 2)** — VERIFICADO/PASS contra Neon real: NFR-001 (no cross-tenant, 403 `CROSS_TENANT_DENIED`) ✅, NFR-003 (RBAC, viewer→403) ✅, NFR-013/014 (auditoría append-only en register/login/create org/create+update installation/create+update device/claim kit/pair device) ✅. Validación de payload (422 Zod) y conflictos (409 `EMAIL_TAKEN`/`KIT_ALREADY_CLAIMED`/dup `(kitId,externalRef)`) cubiertos. `passwordHash` nunca expuesto (verificado por test).

> **Desviaciones documentadas (no bloquean PASS de Fase 2):** password con **bcryptjs (12 rounds)** en vez de Argon2id del canon (swap trivial); **JWT 7d** sin refresh rotado y **throttling** de auth pendiente (FR-AUTH-010/NFR-002/NFR-004 → Fase 7 hardening). Boletas (`bills`), telemetría, dashboard, reportes, desglose, alertas, recomendaciones, control y proyecciones: **pendientes Fase 3+** (ver matriz principal, filas 16–39, 45).

## Cobertura Fase 3 (IoT / telemetría: ingestión, latest, range, agregación)

> Marca los endpoints de telemetría implementados en `apps/api/src/modules/telemetry/` como **IMPLEMENTADO + TESTEADO (PASS)** contra Neon real. Cubre la fila **45** (ingesta IoT, `POST /iot/telemetry`) y la parte de telemetría de las filas **20** (`telemetry/latest`) y **25** (`telemetry/range`) de la matriz principal. **Sin migración nueva:** reutiliza `telemetry_readings` y `energy_aggregates` (Fase 1).
> **Estado: ✅ IMPLEMENTADO + TESTEADO (PASS)** — 2026-06-03, `feat/phase-3-iot-telemetry`. **API 56/56 PASS** (`pnpm --filter @smartsense/api test`: 39 Fase 2 + 17 telemetría); **iot-bridge 23/23**; **DB 18/18**. Auditoría OpenAPI ↔ código 1:1 (manual): `docs/audit/phase-3-telemetry-openapi-audit.md`. Runtime: `docs/audit/phase-3-telemetry-runtime-verification.md`.

| Filas matriz | Endpoint API (Fase 3) | Servicio | Implementado | Testeado | Estado |
|---|---|---|---|---|---|
| 45 | POST `/iot/telemetry` | telemetry (ingest) + energy-aggregation | sí | sí | PASS |
| 20 | GET `/installations/{installationId}/telemetry/latest` | telemetry (read) | sí | sí | PASS |
| 25 | GET `/installations/{installationId}/telemetry/range` | telemetry (read) | sí | sí | PASS |

**Invariantes/NFR verificados por la suite de telemetría (Fase 3)** — VERIFICADO/PASS contra Neon real: INV-6 / NFR-028 (idempotencia por `event_hash` UNIQUE: `accepted`/`duplicate`) ✅; NFR-029 (doble timestamp: `received_timestamp` backend) ✅; NFR-030/031 (validez: no-negatividad, `power_factor ∈ [-1,1]`, `INVALID_TIMESTAMP`, rango `from>to` → 422) ✅; NFR-032 (agregación idempotente `energy_aggregates` granularity `hour`, `energy_kwh=SUM/1000`, `peak_power_w=MAX`) ✅; NFR-001 (no cross-tenant: 403; device ajeno en range → 4xx) ✅. Coherencia device/kit/installation (409 `DEVICE_KIT_MISMATCH`), device inexistente (404) y capability meter cubiertos. **0 side-effects** (ingestión no genera alertas/recomendaciones/control).

> **Desviaciones documentadas (no bloquean PASS de Fase 3):** `event_hash` usa `device_id` (no `kit_qr`/`device_ref` del `.md` MQTT §5); telemetría **NO** audita (alto volumen → `audit_logs` no escrito en ingest); **agregación inline** (worker real day/semana/mes + recompute batch diferido); **device auth = JWT de usuario** (API key/kit-scope → Fase 7); **sin costeo CLP** en agregados (BillingService/TariffService → Fase 4+); MQTT productivo fuera de alcance (`iot-bridge` en dry-run). **Pendientes Fase 4+:** dashboard (fila 19/21/22), reportes (filas 23–24, parte de 25), desglose (26–28), alertas/recomendaciones (29–31), control (32–37), proyecciones (38–39).
