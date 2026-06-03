# Desglose de Tareas — SmartSense

> Deriva de `09-implementation-plan/{roadmap,milestones}.md`, `03-data-model/relational-model.md` (21 tablas), `06-backend/services.md`, `04-api/api-overview.md`, `05-frontend/*` y `08-quality/*`.
> Convención de ID: `T-FNN-NN` (FNN = fase, NN = nº de tarea). Cada tarea: descripción · entregable · dependencias · FR/spec relacionada.
> **FASE 1 está detallada al máximo por ser la próxima a implementar.** Las fases 2–7 listan tareas accionables de nivel superior.
> **FASE 0.5 (Brownfield Reconciliation) bloquea la Fase 1** — debe cerrarse con go/no-go aprobado antes de iniciar T-F01-*.

---

## FASE 0.5 — Brownfield Reconciliation (bloquea Fase 1)

> Auditar y reconciliar el repo demo (`github.com/cherrera0001/smart-sense-demo`) contra las specs. Estrategia elegida: **A — Preserve UI, add backend gradually** (+ B-lite). Restricción: solo auditoría/diseño; sin implementar, borrar, mover código, push ni PR.

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-005-01 | Clonar/sincronizar repo real en carpeta limpia; crear rama `chore/brownfield-spec-reconciliation` | repo clonado + rama (✅ hecho) | FASE 0 | — |
| T-005-02 | Inventario técnico completo (stack, configs, app/components/lib/docs/scripts) | `docs/audit/brownfield-current-state.md` (✅) | T-005-01 | — |
| T-005-03 | Mapa rutas actuales (ES) vs rutas objetivo (EN) + decisión idioma/redirects | `docs/audit/routes-reconciliation.md` (✅) | T-005-02 | 05-frontend/routes.md |
| T-005-04 | Inventario de componentes con decisión keep/refactor/replace/delete/archive | `docs/audit/component-inventory.md` (✅) | T-005-02 | 05-frontend/components.md |
| T-005-05 | Inventario de mocks/hardcode → fixtures/seed/DEMO_MODE | `docs/audit/mock-data-inventory.md` (✅) | T-005-02 | 03-data-model, 04-api |
| T-005-06 | Análisis spec-code gap (FR cubiertos/no/parciales; contradicciones; specs a ajustar) | `docs/audit/spec-code-gap-analysis.md` (✅) | T-005-03/04/05 | 01-requirements |
| T-005-07 | Estrategia de migración (A/B/C → elegir y justificar) | `docs/architecture/migration-strategy.md` (✅) | T-005-06 | roadmap |
| T-005-08 | Plan de transición frontend (estructura objetivo, mapeo componentes, DEMO_MODE) | `docs/architecture/frontend-transition-plan.md` (✅) | T-005-07 | 05-frontend/* |
| T-005-09 | Plan de transición backend (monorepo, Prisma/Postgres/Timescale, mock↔API) | `docs/architecture/backend-transition-plan.md` (✅) | T-005-07 | 06-backend/* |
| T-005-10 | Decisión final go/no-go Fase 1 (aprobación de estrategia + resolución de decisiones abiertas) | acta de cierre + autorización de Cristóbal | T-005-07/08/09 | — |

**Cierre de Fase 0.5:** todos los entregables publicados + T-005-10 aprobado. Recién entonces inician las tareas `T-F01-*`.

---

## FASE 1 — Base de datos y dominio (detallada)

> **Precondición:** FASE 0.5 cerrada (T-005-10 go/no-go aprobado).
>
> **Leyenda de estado:** ✅ implementado y versionado · ⏳ pendiente de ejecución contra Postgres real (entorno de validación sin Docker → suite `db` se salta; `db:migrate`/`db:seed` no corridos). Guía de ejecución: `docs/database/phase-1-db-setup.md`.

### Setup de monorepo y tooling

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ✅ | T-F01-01 | Inicializar monorepo pnpm con workspaces `apps/api`, `apps/web`, `apps/iot-bridge`, `packages/shared`, `packages/db` | `pnpm-workspace.yaml`, `package.json` raíz, estructura de carpetas | — | NFR-040, canon §Stack |
| ✅ | T-F01-02 | Inicializar git (`.gitignore` node/prisma/env, rama base + rama de trabajo) y convención de commits | repo git con primer commit de scaffolding | T-F01-01 | NFR-039 |
| ✅ | T-F01-03 | Configurar TypeScript base + tsconfig compartido en `packages/shared`; ESLint + Prettier; scripts `lint`/`typecheck` | tooling de calidad ejecutable | T-F01-01 | NFR-039 |
| ✅ | T-F01-04 | Configurar Vitest + Testcontainers (Postgres 16 + TimescaleDB) para suite `db` (con guard de Docker) | runner de tests de integridad contra DB efímera | T-F01-01 | test-plan §6 |
| ⏳ | T-F01-05 | Configurar Docker Compose de desarrollo (Postgres+Timescale, EMQX) | `docker-compose.yml` dev | T-F01-01 | canon §Stack, NFR-041 |

> T-F01-05: snippet de Docker Compose (Postgres+Timescale) documentado en `docs/database/phase-1-db-setup.md`; `docker-compose.yml` en raíz + EMQX quedan pendientes (EMQX no aplica hasta Fase 3).

### Prisma + Postgres + Timescale

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ✅ | T-F01-06 | Instalar y configurar Prisma en `packages/db`; `DATABASE_URL` por env; datasource Postgres | `packages/db/prisma/` configurado | T-F01-05 | NFR-006/041 |
| ✅ | T-F01-07 | Decidir e implementar generación de UUIDv7 app-side (helper en `packages/shared`) | util `uuidv7()` + default de IDs | T-F01-03 | canon §Convenciones |
| ✅ | T-F01-08 | Habilitar extensión TimescaleDB y `citext` en la migración (SQL raw) | extensiones activas | T-F01-06 | relational-model, users.email citext |

### schema.prisma (21 tablas)

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ✅ | T-F01-09 | Modelar identidad/tenant: `users`, `organizations`, `memberships` (enums role/status; UNIQUE email citext y (user_id,organization_id)) | modelos Prisma | T-F01-06/07 | FR-AUTH-001/006; relational-model |
| ✅ | T-F01-10 | Modelar sitios: `installations`, `installation_profiles` (1↔1, CHECK occupants/declared_power_kw ≥0) | modelos Prisma | T-F01-09 | FR-ONB-008, FR-PROF-001..004 |
| ✅ | T-F01-11 | Modelar kits/devices: `energy_kits` (UNIQUE qr_code, enum status), `device_categories`, `devices` (UNIQUE(kit_id,external_ref), enum state), `device_pairings` (enum pairing_status) | modelos Prisma | T-F01-10 | FR-ONB-001..005 |
| ✅ | T-F01-12 | Modelar telemetría: `telemetry_readings` (campos del contrato, CHECK no-negativos y power_factor∈[-1,1], enum ingestion_status, UNIQUE event_hash) — sin PK Prisma estándar, PK lógica (device_id,source_timestamp,reading_id) | modelo Prisma + nota hypertable | T-F01-11 | FR-DASH-001, NFR-028/029/031; 07-iot |
| ✅ | T-F01-13 | Modelar agregados: `energy_aggregates` (enum granularity, CHECK energy_kwh/cost_clp ≥0, UNIQUE(installation_id,device_id,category_id,granularity,bucket_start)) | modelo Prisma | T-F01-11 | FR-DASH-002, FR-REP-*, NFR-032 |
| ✅ | T-F01-14 | Modelar tarificación: `distributors`, `tariffs` (CHECK precios ≥0, UNIQUE(distributor_id,code,valid_from)), `electricity_bills` (CHECK period_end≥period_start, montos/consumo ≥0, enum bill_status) | modelos Prisma | T-F01-10 | FR-BILL-001..008, FR-SET-004 |
| ✅ | T-F01-15 | Modelar alertas/recomendaciones: `alerts` (enums type/severity/status), `recommendations` (enum source/status) | modelos Prisma | T-F01-13 | FR-ALRT-*, FR-REC-* |
| ✅ | T-F01-16 | Modelar control: `control_actions` (enums type/status), `control_schedules`, `consumption_limits` (CHECK limit_kwh>0, limit_power_w>0, pre_alert_pct 1..100, enum window/action_on_exceed) | modelos Prisma | T-F01-11 | FR-CTRL-001..009 |
| ✅ | T-F01-17 | Modelar transversales: `notifications` (enum channel), `audit_logs` (append-only, ip inet) | modelos Prisma | T-F01-09 | FR-SET-005, NFR-013/014 |
| ✅ | T-F01-18 | Definir soft delete (`deleted_at`) en organizations/installations/energy_kits/devices y timestamps created/updated en todas | columnas comunes consistentes | T-F01-09..17 | canon §Convenciones, NFR-011 |

### Migración inicial, hypertable, constraints y triggers

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ✅ | T-F01-19 | Generar migración inicial Prisma con las 21 tablas, enums (nativos Postgres), índices del relational-model | migración SQL versionada (`0001_init`, 592 líneas) | T-F01-09..18 | NFR-041; relational-model |
| ✅ | T-F01-20 | Añadir paso SQL raw a la migración: `create_hypertable('telemetry_readings','source_timestamp')` (en DO/EXCEPTION, fallback si no hay Timescale) | hypertable creada | T-F01-12/19 | NFR-026; canon §Telemetría |
| ⏳ | T-F01-21 | Configurar políticas Timescale: compresión de chunks antiguos y retención (cruda ≥90d, agregados ≥24m) | políticas activas | T-F01-20 | NFR-026/033 |
| ✅ | T-F01-22 | Constraint parcial: a lo sumo una fila `energy_kits.status='active'` por `serial` (índice único parcial) | constraint en migración | T-F01-11/19 | FR-ONB-002 |
| ✅ | T-F01-23 | Trigger append-only en `audit_logs`: bloquea UPDATE y DELETE | trigger + función en migración | T-F01-17/19 | NFR-014, INV-8 |
| ✅ | T-F01-24 | Verificar índices de tenant/serie: `(organization_id)`, `(installation_id,granularity,bucket_start)`, `(installation_id,status)` alerts, `(device_id,requested_at)` control_actions, `(user_id,read_at)` notifications | índices presentes en migración | T-F01-19 | NFR-027 |

> T-F01-21: las políticas de compresión/retención de Timescale no están en `0001_init`; quedan pendientes (NFR-026/033, candidatas a Fase 7 §hardening de datos).

### Seeds

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ✅ | T-F01-25 | Seed de `device_categories` (refrigeración, climatización, electrónica, iluminación, lavado, con typical_power_w) | script seed idempotente | T-F01-19 | FR-BRK-002 |
| ✅ | T-F01-26 | Seed de `distributors` (catálogo CL: CGE, Enel) | script seed | T-F01-19 | FR-BILL-003 |
| ✅ | T-F01-27 | Seed de `tariffs` demo (BT-1 CGE, BT-1A Enel; energy_price_clp_kwh, valid_from) ligadas a distribuidoras | script seed | T-F01-26 | FR-BILL-004, FR-SET-004 |
| ✅ | T-F01-28 | Orquestar seed unificado (`pnpm db:seed`) idempotente; catálogo global + datos demo bajo `organizations.is_demo=true` | comando de seed | T-F01-25/26/27 | NFR-041 |

> Seeds: escritos y versionados (`seed.ts`). Su **ejecución** real (`pnpm db:seed`) está cubierta por T-F01-29 ⏳ (pendiente de DB).

### Tests de integridad (suite `db`)

> Todos los tests de integridad están **escritos y versionados** (`packages/db/tests/{integrity,constraints}.test.ts`, `setup.ts` con guard de Docker). El estado ⏳ refleja que **no se han ejecutado en verde contra un Postgres real** (entorno sin Docker → se saltan).

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ⏳ | T-F01-29 | Test: migraciones aplican desde cero + seeds OK en DB efímera | test verde | T-F01-19/28 | NFR-041 |
| ⏳ | T-F01-30 | Test integridad referencial: FK inexistente (device con kit_id falso, telemetría con device_id falso) → error | test verde | T-F01-29 | INV-2, NFR-030 |
| ⏳ | T-F01-31 | Test no-negatividad: insert negativo en consumption_kwh/total_clp/active_power_w/energy_kwh/energy_price_clp_kwh → rechazado; power_factor fuera de [-1,1] → rechazado; pre_alert_pct fuera 1..100 → rechazado | test verde | T-F01-29 | NFR-031 |
| ⏳ | T-F01-32 | Test unicidad: email, (user_id,organization_id), qr_code, (kit_id,external_ref), event_hash, clave de agregado, (distributor_id,code,valid_from) | test verde | T-F01-29 | NFR-028, relational-model |
| ⏳ | T-F01-33 | Test coherencia fechas: electricity_bills period_end<period_start → rechazado | test verde | T-F01-29 | FR-BILL-002/005 |
| ⏳ | T-F01-34 | Test kit único activo: dos `energy_kits` `active` con mismo serial → rechazado | test verde | T-F01-22 | FR-ONB-002 |
| ⏳ | T-F01-35 | Test append-only: UPDATE/DELETE sobre audit_logs → bloqueado por trigger | test verde | T-F01-23 | NFR-014, INV-8 |
| ⏳ | T-F01-36 | Test hypertable: `telemetry_readings` es hypertable e idempotencia por event_hash (insert duplicado → 1 fila) | test verde | T-F01-20 | NFR-028, INV-6 |
| ⏳ | T-F01-37 | Actualizar `08-quality/validation-matrix.md` y `traceability-matrix.md`: INV-6/7/8, NFR-026/028/029/031/032/041 → `EN PROGRESO` | matrices actualizadas | T-F01-29..36 | criterio de cierre FASE 1 |

> **Resumen Fase 1:** estructura ✅ (monorepo, shared, schema 21 tablas + 24 enums, migración `0001_init`, hypertable en DO/EXCEPTION, constraints/triggers, seeds, tests escritos, apps/api+iot-bridge esqueletos). Ejecución contra DB real ⏳ (T-F01-05 compose, T-F01-21 políticas Timescale, T-F01-29..37 ejecución de migrate/seed/tests + matrices). El cierre de Fase 1 se completa al correr estos pasos en verde en un entorno con Docker/Postgres.

---

## FASE 1.2 — External PostgreSQL Runtime Verification

> Destrabar el cierre runtime de Fase 1 sin Docker local, verificando migración/seed/tests contra una **PostgreSQL externa de desarrollo**.
> **Estados posibles:** ✅ PASS · ⏳ READY-BLOCKED · ❌ FAIL. **Estado actual de la subfase: READY-BLOCKED** (falta `DATABASE_URL` dev; sin Docker ni Postgres nativo).

| Estado | ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|---|
| ✅ | T-012-01 | Soporte de **modo dual** en la suite `db` (`SMARTSENSE_DB_TEST_MODE` = `docker`/`external`), resolución de modo y estados explícitos PASS/FAIL/BLOCKED sin skip silencioso | `packages/db/tests/setup.ts` (`resolveTestDbMode`, `startExternalDb`, `BLOCKED_MESSAGE`) | T-F01-04 | runtime-gates GATE-DB-004 |
| ✅ | T-012-02 | **Scripts de verificación**: `db:migrate:deploy`, `test:db:docker`/`test:db:external`, agregador `verify:phase1[:docker\|:external]` (`db:generate → db:migrate:deploy → db:seed → test:db:external → typecheck → lint → build:web → build:api`) | scripts en `package.json` raíz + `packages/db` | T-012-01 | NFR-041, runtime-gates |
| ✅ | T-012-03 | **Guard de seguridad** anti-producción (`assertSafeExternalUrl`: rechaza `prod\|production\|live\|primary\|master\|main`; exige señal `dev\|test\|staging\|sandbox\|smartsense_dev` o `SMARTSENSE_DB_ALLOW_UNSAFE=1`) + `maskDbUrl()` | guard + enmascarado en `setup.ts` | T-012-01 | NFR-006, GATE-SEC-001 |
| ✅ | T-012-04 | **Docs**: gates de runtime, guía external (proveedores/comandos/seeds/limpieza), precheck; actualización de `phase-1-runtime-verification.md`, `phase-1-summary.md`, `phase-1-db-setup.md`, matrices | `specs/08-quality/runtime-gates.md`, `docs/database/phase-1-external-postgres-verification.md`, `docs/audit/phase-1-external-runtime-precheck.md` (+ updates) | T-012-01/02/03 | runtime-gates, traceability-matrix |
| ⏳ | T-012-05 | **Ejecución condicionada a `DATABASE_URL`**: correr `pnpm verify:phase1:external` contra una Postgres dev real → cerrar GATE-DB-002/003/004 en PASS; registrar resultados y actualizar matrices a `EN PROGRESO`/`VALIDADO` | gates DB en PASS + matrices | T-012-01..04, `DATABASE_URL` dev | criterio de cierre Fase 1, GATE-SDD-001 |

> **Resumen Fase 1.2:** soporte external + guard + scripts + docs ✅; ejecución contra DB real ⏳ (READY-BLOCKED por falta de `DATABASE_URL` dev). Al pasar T-012-05 a verde, Fase 1 cierra en PASS y se desbloquea Fase 2.

---

## FASE 2 — API base

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-F02-01 | Bootstrap Fastify + plugins (validación schema, JWT, error-model) en `apps/api` | servidor base | T-F01-* | NFR-007; 04-api |
| T-F02-02 | Capa de repositorios con scoping obligatorio por `organization_id` (TenantContext) | repos base | T-F02-01 | NFR-001/040 |
| T-F02-03 | AuthService: register/login/refresh/logout/me (Argon2id, JWT access≤15min + refresh rotado, throttling) | endpoints `/auth/*` | T-F02-01 | FR-AUTH-001..004/010, NFR-002/004 |
| T-F02-04 | Motor RBAC (matriz FR-AUTH-009) como guard de Fastify | middleware authz | T-F02-03 | NFR-003 |
| T-F02-05 | OrganizationService + endpoints `/organizations` | endpoints | T-F02-03 | FR-AUTH-001/006/007/008, FR-SET-008 |
| T-F02-06 | InstallationService + `/installations` (GET/POST/PATCH); audit en tarifa/estado | endpoints | T-F02-04 | FR-ONB-008, FR-SET-002/004 |
| T-F02-07 | OnboardingService + `/onboarding/{kit/scan,kit/claim,devices/pair,status}` (audit en claim) | endpoints | T-F02-06 | FR-ONB-001..008 |
| T-F02-08 | DeviceService + `/devices` y `/installations/{id}/devices` | endpoints | T-F02-06 | FR-ONB-005, FR-SET-003 |
| T-F02-09 | AuditService (record/query) integrado en acciones sensibles | servicio + append-only | T-F02-02 | NFR-013/014 |
| T-F02-10 | OpenAPI de estos grupos + tests integ (happy/error/authz/cross-tenant) | suite verde + openapi.yaml | T-F02-03..08 | test-plan §3/§5/§7 |

## FASE 3 — IoT y telemetría

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-F03-01 | iot-bridge: consumo MQTT (EMQX) y normalización al contrato `07-iot/telemetry-model.md` | bridge | T-F02-* | NFR-008/021 |
| T-F03-02 | TelemetryIngestionService.ingest: validación, event_hash, UPSERT idempotente, markSeen | lógica de ingesta | T-F03-01 | NFR-028/030/031, INV-2/6/7 |
| T-F03-03 | `POST /iot/telemetry` (token de kit, Idempotency-Key) → accepted/duplicate/invalid | endpoint | T-F03-02 | FR-DASH-001 |
| T-F03-04 | `telemetry/latest` y `telemetry/range` (422 INVALID_RANGE) | endpoints | T-F03-02 | FR-DASH-001, FR-BRK-006 |
| T-F03-05 | EnergyAggregationService: rollup + recompute idempotente; continuous aggregates | agregación | T-F03-02 | NFR-032 |
| T-F03-06 | BillingService.computeCost + TariffService.getEffectiveTariff (CLP backend, null sin tarifa) | costeo | T-F03-05 | INV-4, FR-DASH-003 |
| T-F03-07 | ReportService daily/weekly/monthly/last-three-months + endpoints | endpoints | T-F03-05/06 | FR-REP-001..005 |
| T-F03-08 | Suite iot (idempotencia/validez/rangos/doble timestamp/reconexión) + integ reports | suite verde | T-F03-03..07 | NFR-017/020/023 |

## FASE 4 — Frontend dashboard y reportes

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-F04-01 | Layouts `(auth)`/`(onboarding)`/`(app)`, AppSidebar, header + InstallationSwitcher, middleware/guards | shell | T-F02-* | routes.md |
| T-F04-02 | Providers React Query + Zustand (instalación activa en estado, no URL) | providers | T-F04-01 | routes.md §1 |
| T-F04-03 | Estados transversales: Skeleton, EmptyState, ErrorState, OfflineBanner | componentes | T-F04-02 | NFR-018, FR-DASH-007 |
| T-F04-04 | `/dashboard`: ConsumptionGauge, CostCard, KitStatusIndicator, AlertSummaryCard + WebSocket vivo | página | T-F04-03, T-F03-* | FR-DASH-001..007, NFR-022 |
| T-F04-05 | `/reports`: ReportChart, TimeRangeSelector, MetricToggle | página | T-F04-03, T-F03-07 | FR-REP-001..005 |
| T-F04-06 | UI onboarding: QRScanner, SegmentSelector, OnboardingStepper, ProfileForm*, BillUploader, BillDataForm, DistributorSelect/TariffForm | páginas onboarding | T-F04-03, T-F02-07 | FR-ONB/PROF/BILL |
| T-F04-07 | RTL estados (loading/empty/error/offline) + e2e dashboard/onboarding + Lighthouse smoke | suite verde | T-F04-04..06 | NFR-018/022/024 |

## FASE 5 — Desglose, alertas y recomendaciones

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-F05-01 | BreakdownService + `/breakdown?groupBy=device\|category` (total=Σitems, %, ranking) | endpoint | T-F03-05 | FR-BRK-001..005 |
| T-F05-02 | AlertService (raise/dedup/list/review) + `/alerts` y `/alerts/{id}/review` | endpoints | T-F03-* | FR-ALRT-001..006 |
| T-F05-03 | RecommendationService + `/recommendations` (CLP solo con tarifa, apply/dismiss) | endpoint | T-F05-02, T-F03-06 | FR-REC-001..005 |
| T-F05-04 | NotificationService (in_app/email/push) | servicio | T-F05-02 | FR-SET-005 |
| T-F05-05 | Frontend `/breakdown` (DeviceBreakdownChart) y `/alerts` (AlertList, SeverityBadge, AlertFilters, RecommendationCard) | páginas | T-F04-*, T-F05-01..03 | FR-BRK/ALRT/REC |
| T-F05-06 | Tests unit/integ/ui (dedup, orden severidad, total=Σitems, review baja contador) | suite verde | T-F05-01..05 | test-plan §11/§12/§13 |

## FASE 6 — Control

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-F06-01 | ControlService.requestAction: pending + downlink MQTT + audit; viewer→rejected+403+audit | endpoint `/control-actions` | T-F02-04, T-F03-01 | FR-CTRL-001/002/009, INV-3/5 |
| T-F06-02 | resolveAction async (ack/timeout, idempotente) invocado por bridge | resolución | T-F06-01 | FR-CTRL-008 |
| T-F06-03 | getControlState + `/control-state` | endpoint | T-F06-01 | FR-CTRL-003 |
| T-F06-04 | createSchedule (`/control-schedules`, valida solapamientos) | endpoint | T-F06-01 | FR-CTRL-004 |
| T-F06-05 | createLimit (`/consumption-limits`, positivos, pre_alert_pct 1..100, action_on_exceed) + bloqueo de crítico | endpoint | T-F06-01, T-F05-02 | FR-CTRL-005/006, FR-PROF-005 |
| T-F06-06 | Frontend `/control` (ControlToggle optimista, ControlActionLog) y `/smart-control` (ScheduleEditor, ConsumptionLimitForm) | páginas | T-F04-*, T-F06-01..05 | FR-CTRL-* |
| T-F06-07 | Tests authz/integ/unit (viewer 403 sin downlink, audit por acción, resolución idempotente, solapamiento) | suite verde | T-F06-01..06 | NFR-003/013/014, test-plan §14 |

## FASE 7 — Hardening

| ID | Descripción | Entregable | Dependencias | FR / Spec |
|---|---|---|---|---|
| T-F07-01 | Cabeceras seguridad (CSP/HSTS/anti-clickjacking), URLs firmadas de boleta, cookies seguras | endurecimiento web | T-F04-* | NFR-005/009 |
| T-F07-02 | Rate limiting global + secret-scan/SAST en CI | pipeline endurecido | T-F02-* | NFR-004/006 |
| T-F07-03 | Logging estructurado (correlation id), métricas y alertas operativas, trazas distribuidas | observabilidad | T-F02-*/T-F03-* | NFR-036/037/038 |
| T-F07-04 | Backups/DR, retención Timescale/audit, ciclo de vida de boleta | operación de datos | T-F01-* | NFR-019/033/034/035 |
| T-F07-05 | E2E completo (onboarding/dashboard/control/cross-tenant/offline) + carga (NFR-020/021/022/023) | suites verdes | todas | test-plan §16/§17 |
| T-F07-06 | Documentación de despliegue (Docker Compose, GitHub Actions) + cierre de matrices (45/45 NFR, INV-1..10 VALIDADO) | docs + matrices | T-F07-01..05 | NFR-045, criterio de cierre |

---

## Notas de ejecución

- Toda tarea que modifique esquema entra como migración (NFR-041); ninguna se mergea sin su test (`test-plan.md §3`).
- Karpathy Loop: tras cada migración/seed, verificar resultado real (aplicar desde cero + correr suite `db`) antes de avanzar.
- El criterio de cierre de FASE 1 (`roadmap.md`) exige T-F01-29..37 en verde y matrices actualizadas antes de iniciar FASE 2.
