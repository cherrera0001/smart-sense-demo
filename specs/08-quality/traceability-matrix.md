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

## Cobertura Fase 4 (backend: dashboard, reports, breakdown, billing/costeo CLP)

> Marca los endpoints de lectura agregada implementados en `apps/api` (dashboard, reports, breakdown) + `BillingService` como **IMPLEMENTADO + TESTEADO (PASS)** contra Neon real. Cubre las filas **19** (dashboard), **21** (costo del día CLP), **22** (dashboard vacío), **23** (reports day/week/month), **24** (últimos 3 meses) y **26–27** (breakdown por device/categoría con %, ranking, total=Σ) de la matriz principal, en su parte backend. **Sin migración nueva:** reutiliza `telemetry_readings`, `energy_aggregates`, `devices`, `device_categories`, `installations`, `tariffs`, `electricity_bills`, `distributors` (Fase 1).
> **Estado: ✅ IMPLEMENTADO + TESTEADO (PASS)** — 2026-06-03, `feat/phase-4-dashboard-reports`. **API 92/92 PASS** (`pnpm --filter @smartsense/api test`: 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown); **iot-bridge 23/23**; **DB 18/18**. Auditoría OpenAPI ↔ código (paths 1:1, shapes **superset**) manual: `docs/audit/phase-4-openapi-implementation-audit.md`. Runtime: `docs/audit/phase-4-runtime-verification.md`.

| Filas matriz | Endpoint API (Fase 4) | Servicio | Implementado | Testeado | Estado |
|---|---|---|---|---|---|
| 19/21/22 | GET `/installations/{id}/dashboard` | dashboard + billing | sí | sí (7) | PASS |
| 23 | GET `/installations/{id}/reports/{daily,weekly,monthly}` | reports + billing | sí | sí | PASS |
| 24 | GET `/installations/{id}/reports/last-three-months` | reports + billing | sí | sí | PASS |
| 26/27 | GET `/installations/{id}/breakdown?group_by=device\|category` | breakdown + billing | sí | sí (9) | PASS |
| 21/42 | `BillingService` (tarifa efectiva + `estimateEnergyCostClp`/`estimateSeriesCostClp`) | billing | sí | sí (11) | PASS |

**Invariantes/reglas verificadas por la suite de Fase 4** — VERIFICADO/PASS contra Neon real: **BR-031 / INV-4** (costeo CLP solo energía, entero `Math.round`, **`cost_clp=null` sin tarifa**, nunca inventa) ✅; tarifa efectiva (`installation.tariffId` → boleta `confirmed` más reciente → null) ✅; NFR-001 (no cross-tenant: 403 en los 6 endpoints) ✅; consistencia (reports `totals` derivados de `points` → cuadran; breakdown `total=Σitems`, `percentage` suman ~100, 0 si total 0) ✅; empty states (dashboard `data_status=empty`, reports buckets vacíos, breakdown total 0) ✅; estrategia de datos (agregados preferidos → fallback telemetría, sin mezclar fuentes) ✅; **0 side-effects** (ninguna lectura agregada genera alertas/recomendaciones/control) ✅.

> **Desviaciones/limitaciones documentadas (no bloquean PASS de Fase 4):** costeo **solo energía** (sin cargo fijo/demanda/punta-valle/horario); tiempos en **UTC** (timezone local de presentación → fase posterior); **breakdown solo dispositivos medidos** (no NILM); `alerts_pending_count` **fijo en 0** (Fase 5); respuestas son **superset** del `openapi.yaml` (extensión contract-first; paths conservados, `yaml` a reconciliar en Fase 7). **Pendiente (entrega frontend posterior):** shell/UI en vivo de dashboard/reports/breakdown (filas 19–27, parte UI), WebSocket vivo (fila 20). **Pendientes Fase 5+:** alertas/recomendaciones (29–31), control (32–37), proyecciones (38–39), desglose UI (fila 28).

## Cobertura Fase 5 (backend: alertas, review, recomendaciones, dashboard count real)

> Marca los endpoints de alertas y recomendaciones implementados en `apps/api/src/modules/{alerts,recommendations}/` (+ motor interno `AlertEvaluationService` y `RecommendationService.generateForAlert`) como **IMPLEMENTADO + TESTEADO (PASS)** contra Neon real. Cubre las filas **29** (alertas pendientes + review), **30** (alertas: 5 reglas, dedup, filtros/orden), **31** (recomendaciones por prioridad/impacto, CLP solo con tarifa) y la actualización de **19** (`alerts_pending_count` real) de la matriz principal, en su parte backend. **Migración aditiva 0002** (`recommendations.type`, `estimated_saving_kwh` + CHECK no-neg; no altera enums ni datos); resto reutiliza Fases 1–4.
> **Estado: ✅ IMPLEMENTADO + TESTEADO (PASS)** — 2026-06-04, `feat/phase-5-alerts-recommendations`. **API 114/114 PASS** (`pnpm --filter @smartsense/api test`: 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations); **iot-bridge 23/23**; **DB 18/18**. Auditoría OpenAPI ↔ código (paths 1:1, shapes **superset**) manual: `docs/audit/phase-5-openapi-implementation-audit.md`. Runtime: `docs/audit/phase-5-runtime-verification.md`.

| Filas matriz | Endpoint API (Fase 5) | Servicio | Implementado | Testeado | Estado |
|---|---|---|---|---|---|
| 29/30 | GET `/installations/{id}/alerts` | alerts (read) + AlertEvaluationService | sí | sí (13) | PASS |
| 29 | PATCH `/alerts/{id}/review` | alerts (review) + audit | sí | sí | PASS |
| 31 | GET `/installations/{id}/recommendations` | recommendations + RecommendationService + billing | sí | sí (8) | PASS |
| 19 | GET `/installations/{id}/dashboard` (`alerts_pending_count` **real**) | dashboard | sí | sí (regresión) | PASS |

**Invariantes/reglas verificadas por la suite de Fase 5** — VERIFICADO/PASS contra Neon real: **evidencia + dedup** (5 reglas; ventana 24h por installation+device+type; sin baseline → no alerta) ✅; **offline** (kit `active` + estuvo online + última señal >60min) ✅; **BR-031** (`estimated_saving_clp` null sin tarifa / number con tarifa; `estimated_saving_kwh`=10% del exceso observado, null si no reducible; textos sin "garantizado") ✅; NFR-001 (no cross-tenant: 403) ✅; NFR-003 (**RBAC viewer → 403** en review) ✅; NFR-013/014 (**audit append-only** `'alert.review'`; review no borra) ✅; **0 side-effects** (evaluación/lecturas no crean `control_actions`) ✅; **`alerts_pending_count` real** (count `alerts status=open`; reviewed/dismissed no cuentan; leer no crea) ✅.

> **Reconciliación canon=persistencia (decisión SDD):** alert.type expone 4 canónicos (`anomaly`/`high_device`/`over_budget`/`offline`) + subtype fino en `context`; `detected_at`=`created_at`, `metadata`=`context`; recommendation status `new`↔`active`, priority int↔enum, `type`/`estimated_saving_kwh` vía migración 0002. **Desviaciones/limitaciones documentadas (no bloquean PASS de Fase 5):** sin scheduler real (`evaluateInstallationAlerts` es función interna; worker → fase posterior); tiempos **UTC**; sin `estimatedImpactClp` en alertas; respuestas **superset** del `openapi.yaml` (`yaml` a reconciliar en Fase 7). **Pendiente (fase posterior):** `NotificationService` (fila 43, FR-SET-005) y UI `/alerts`/`/breakdown` (filas 28–31, parte UI). **Pendientes Fase 6+:** control (32–37), proyecciones (38–39).

## Cobertura Fase 6 (backend: control de dispositivos · dry-run)

> Marca los endpoints de control implementados en `apps/api/src/modules/control/` como **IMPLEMENTADO + TESTEADO (PASS · dry-run)** contra Neon real. Cubre las filas **32** (control on/off + estado), **33** (control sin permiso: viewer→403), **35** (bitácora de control: listado control-actions + audit), **36** (programación: `control-schedules`) y **37** (límite de consumo: `consumption-limits`) de la matriz principal, en su parte backend. **Migración aditiva 0003** (`control_actions.idempotency_key`+`dry_run`+UNIQUE parcial; no altera enums ni datos); resto reutiliza Fases 1–5.
> **Estado: ✅ IMPLEMENTADO + TESTEADO (PASS · dry-run)** — 2026-06-04, `feat/phase-6-device-control`. **API 140/140 PASS** (`pnpm --filter @smartsense/api test`: 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations + **26 control**); **iot-bridge 23/23**; **DB 18/18**. Auditoría OpenAPI ↔ código (paths 1:1, shapes **superset**) manual: `docs/audit/phase-6-openapi-implementation-audit.md`. Runtime: `docs/audit/phase-6-runtime-verification.md`.

| Filas matriz | Endpoint API (Fase 6) | Servicio | Implementado | Testeado | Estado |
|---|---|---|---|---|---|
| 32 | POST `/devices/{deviceId}/control-actions` (dry-run) | control (actions) | sí | sí (26) | PASS (dry-run) |
| 32 | GET `/devices/{deviceId}/control-state` (lógico) | control (state) | sí | sí | PASS (dry-run) |
| 33 | POST `/devices/{deviceId}/control-actions` (viewer→403) | control + access | sí | sí | PASS |
| 35 | GET `/devices/{deviceId}/control-actions` (bitácora + audit) | control (actions) | sí | sí | PASS |
| 36 | POST/GET `/devices/{deviceId}/control-schedules` · PATCH `/control-schedules/{id}` | control (schedules) | sí | sí | PASS (no ejecuta) |
| 37 | POST/GET `/devices/{deviceId}/consumption-limits` · PATCH `/consumption-limits/{id}` | control (limits) | sí | sí | PASS (no ejecuta) |

**Invariantes/reglas verificadas por la suite de Fase 6** — VERIFICADO/PASS contra Neon real: **dry-run** (persiste `status='success'`+`dry_run=true`; API expone `status='dry_run'`; **sin downlink físico ni MQTT**) ✅; **INV-3 / NFR-013/014** (audit append-only por acción: `control.requested`/`control.resolved`, `control_schedule.created/updated`, `consumption_limit.created/updated`) ✅; **INV-5 / NFR-003** (**RBAC viewer → 403** sin downlink en actions/schedules/limits) ✅; NFR-001 (no cross-tenant: 403 vía `assertDeviceAccess`) ✅; **capability** (`409 DEVICE_NOT_CONTROLLABLE` si `capabilities.switch≠true`) ✅; **idempotencia** (`(device_id, idempotency_key)` no duplica; UNIQUE parcial migración 0003) ✅; **CHECK** (`threshold>0` o 422) ✅; **0 side-effects** (control no genera alerts/recommendations; schedules/limits **no ejecutan**) ✅; **estado lógico** (`control-state` deriva de la última acción dry-run, **no** físico confirmado) ✅.

> **Desviaciones/limitaciones documentadas (no bloquean PASS · dry-run de Fase 6):** **dry-run only** (sin efecto físico, sin MQTT downlink, sin `resolveAction` async); `control-state` **lógico/simulado** (no físico confirmado); schedules/limits **solo persisten política** (sin scheduler ejecutor); `set_limit`-as-schedule/limit → 422 (diferido); respuestas **superset** del `openapi.yaml`. La **fila 34** (resolución async ACK/timeout, FR-CTRL-008) queda **pendiente** (fase futura: downlink físico — precondiciones en `docs/security/phase-6-control-safety.md`). **Pendiente (entrega frontend posterior):** UI `/control` y `/smart-control` (filas 32–37, parte UI). **Pendientes Fase 7:** hardening transversal (seguridad/observabilidad/E2E/carga/despliegue) + proyecciones (38–39, V1).

## Cobertura Fase 7 (hardening: seguridad, auth refresh, ops/health, CI, E2E)

> Fase 7 es **transversal** (endurecimiento de los 87 FR e invariantes): no agrega filas de negocio a la matriz principal, sino que materializa NFR de seguridad/operación y añade un endpoint de auth (`/auth/refresh`) y dos operativos (`/healthz`, `/readyz`). Cubre/endurece las filas **2** (login/throttling), **4** (seguridad: cambio de clave / revocación de sesiones vía refresh-token rotation) y **6** (authz transversal) en su parte de hardening, y aporta cobertura E2E (smoke) de las filas 1–2, 12, 19, 29, 31.
> **Estado: ✅ IMPLEMENTADO + TESTEADO (PASS)** — 2026-06-04, `feat/phase-7-hardening`. **API 156/156 PASS** (`pnpm --filter @smartsense/api test`: 140 de Fase 6 + security 7 + health 2 + auth-refresh 7); **iot-bridge 23/23**; **DB 18/18**. Contra Neon real (credencial **rotada**). Auditoría OpenAPI ↔ código (paths nuevos como adición Fase 7) manual: `docs/audit/phase-7-openapi-implementation-audit.md`. Runtime: `docs/audit/phase-7-runtime-verification.md`.

| Gate / Endpoint (Fase 7) | Mecanismo / Servicio | Implementado | Testeado | Estado |
|---|---|---|---|---|
| GATE-SEC-002 (secret scan + rotación Neon) | `scripts/secret-scan.mjs` + `ALTER ROLE` | sí | sí (exit 0) | PASS |
| GATE-SEC-003 (CORS sin wildcard prod) | `plugins/cors.ts` + `config/env.ts` | sí | sí (security) | PASS |
| GATE-SEC-004 (JWT fuerte prod) | `config/env.ts` | sí | sí (security) | PASS |
| GATE-SEC-005 (rate-limit auth/control) | `plugins/rate-limit.ts` | sí | sí (security, 429) | PASS |
| Cabeceras seguridad (helmet `nosniff`) | `plugins/security-headers.ts` | sí | sí (security) | PASS |
| POST `/auth/refresh` (rotación) | auth + `refresh_tokens` (mig. 0004) | sí | sí (auth-refresh) | PASS |
| POST `/auth/logout` (revoca refresh) | auth | sí | sí (auth-refresh) | PASS |
| GATE-OPS-001 (`/healthz` liveness) | `health.ts` | sí | sí (health) | PASS |
| GATE-OPS-002 (`/readyz` DB) | `health.ts` (`SELECT 1`) | sí | sí (health) | PASS |
| GATE-CI-001 (GitHub Actions) | `.github/workflows/ci.yml` | sí | sí (suites equivalentes verdes) | PASS |
| GATE-E2E-001 (smoke-api) | `scripts/smoke-api.mjs` | sí | sí (7/7 local) | **PASS (local)** · **READY-BLOCKED (staging, Fase 8.2: Railway sin auth)** |
| GATE-DEPLOY-001 (Vercel web v2 / Docker / API staging) | `smartsense-web-v2` (Vercel aislado) · Dockerfiles · runbooks staging | sí | sí (web deploy READY) | **PASS (web aislado, Fase 8.2)** · **BLOCKED (API staging por credenciales Railway · Docker entorno)** |

**Invariantes/NFR verificados por la suite de Fase 7** — VERIFICADO/PASS contra Neon real: **NFR-006** (no secretos versionados; secret-scan exit 0; **secreto Neon rotado**) ✅; **NFR-009** (cabeceras de seguridad helmet `nosniff`; CORS sin wildcard en prod) ✅; **NFR-004** (rate-limit global + estricto auth/control → 429) ✅; **NFR-002/FR-AUTH-010** (access 15m + refresh 7d rotado; reuso de refresh revocado → 401 + revoca árbol; logout revoca; access sin `passwordHash`) ✅; **NFR-036** (logging estructurado redactado + request-id) ✅; **NFR-037** (health/readiness `/healthz`+`/readyz`, 503 degraded) ✅; **NFR-041** (migración aditiva 0004 aplicable; CI con migrate:deploy+seed+test:db:external sobre Postgres efímero) ✅.

> **Desviaciones/limitaciones documentadas (no bloquean PASS de Fase 7):** **GATE-DEPLOY-001 (build de imágenes Docker) = BLOCKED por entorno** (Docker no disponible local; Dockerfiles listos para CI — no FAIL); `/metrics` Prometheus y **tracing distribuido (NFR-038)** **diferidos** (Fase 8; hoy métricas vía logs); `/auth/refresh`, `/healthz`, `/readyz` se documentan como **adición Fase 7** (superset; `openapi.yaml` a reconciliar en Fase 8, NFR-045); **backups/DR y retención Timescale/audit (NFR-019/033/034/035)** diferidos a Fase 8; `apps/web` en **DEMO_MODE** (no consume la API). **Roadmap F0–F7 COMPLETO.** Pendiente (Fase 8, requiere autorización): despliegue productivo real + downlink IoT físico (fila 34, FR-CTRL-008) + proyecciones (38–39, V1).
>
> **Nota Fase 8.1 (Staging Deployment Verification, 2026-06-06, READY-BLOCKED):** rama `release/smartsense-f0-f7` pusheada; **CI PASS** (run `27052719013`); **PR #1** de revisión abierto (base `master`, head release, **sin merge**; riesgo de prod de `master` en el body). **GATE-E2E-001 staging = READY-BLOCKED** (sin API de staging: ningún CLI de hosting autenticado); **GATE-DEPLOY-001 = BLOCKED** (sin Docker/host). Vercel preview pendiente de autorización (riesgo de prod en `master`). **Producción intacta.** Detalle: `docs/audit/phase-8-1-{precheck,staging-migration,staging-health,staging-smoke,vercel-preview,pr}.md`.
>
> **Nota Fase 8.2 (Despliegue controlado, 2026-06-06, HEAD `8244169`, PARTIAL):** **GATE-DEPLOY-001 (web) = PASS** — proyecto Vercel **aislado** `smartsense-web-v2` (scope `cherrera0001s-projects`, `apps/web`, `NEXT_PUBLIC_DEMO_MODE=true`) deploy **READY** (build exitoso; HTTP 401 = Deployment Protection, no fallo de build; **producción `smart-sense-demo` / `smartsense.c4a.cl` intacta**). **GATE-DEPLOY-001 (API staging) = BLOCKED por credenciales** (Railway `whoami` Unauthorized, `RAILWAY_TOKEN` ausente bash+win; no se desplegó, no se inventó). **GATE-E2E-001 staging = READY-BLOCKED** (depende de API staging). PR #1 comentado (sin merge). Runbooks Railway/Render/VPS + cutover EXIGENTE listos. Desbloqueo: `railway login` o `RAILWAY_TOKEN`. Detalle: `docs/audit/phase-8-2-{execution-precheck,railway-auth,vercel-web-v2-preview,api-staging-railway,pr-update}.md`, `docs/deployment/phase-8-2-{api-staging-manual-render,api-staging-manual-vps,production-cutover-runbook}.md`.
