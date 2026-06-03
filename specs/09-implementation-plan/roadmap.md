# Roadmap de Implementación — SmartSense

> Deriva de `specs/_canon.md`, `01-requirements/functional-requirements.md` (87 FR), `non-functional-requirements.md` (45 NFR), `03-data-model/relational-model.md` (21 tablas), `04-api/api-overview.md`, `05-frontend/*`, `06-backend/services.md` y `08-quality/*`.
> Enfoque spec-driven: cada fase entrega migraciones + tests + docs y actualiza las matrices (`08-quality/validation-matrix.md`, `traceability-matrix.md`).
> Prioridades de canon: `MVP` (núcleo) · `V1` · `V2`.

## Criterio de cierre transversal (aplica a toda fase)

Una fase **no se cierra** hasta cumplir todos los gates de `08-quality/test-plan.md §3`:
1. Migraciones Prisma aplicables desde cero en CI (NFR-041) para los cambios de esquema de la fase.
2. Tests verdes: unit + integ de endpoints críticos de la fase + db (constraints) + authz (no cross-tenant) cuando aplique.
3. Contrato OpenAPI actualizado (`04-api/openapi.yaml`) para los endpoints de la fase.
4. Estados UI (loading/empty/error/offline) para las pantallas de la fase.
5. Auditoría verificada para acciones sensibles de la fase (NFR-013/014).
6. Docs actualizadas y **matrices de trazabilidad y validación actualizadas** (filas/NFR de la fase pasan a `EN PROGRESO`/`VALIDADO`).
7. Lint + typecheck + secret-scan en verde (NFR-006/039).

---

## FASE 0 — Ordenamiento

- **Objetivo:** dejar el repositorio de specs y la base de decisiones técnicas en estado consistente y trazable antes de escribir código.
- **Entregables:**
  - Estructura de `specs/` completa y consistente con `_canon.md` (00 a 09).
  - Auditoría de consistencia FR↔dominio↔modelo↔API↔frontend↔backend (sin IDs huérfanos).
  - Decisiones técnicas registradas como ADR (enums `text+CHECK` vs `ENUM` Postgres; UUIDv7 app-side; estrategia de continuous aggregates; TimescaleDB; layout monorepo pnpm).
  - Matriz de trazabilidad maestra inicial (`08-quality/traceability-matrix.md`, 45 filas) y matriz de validación NFR/invariantes (`08-quality/validation-matrix.md`).
  - Plan de pruebas (`08-quality/test-plan.md`) con herramientas y gates.
- **Dependencias:** ninguna.
- **Criterio de cierre:** specs cruzadas sin referencias inventadas; ADRs aprobados; matrices y plan de pruebas publicados; gates de calidad definidos.
- **FR cubiertos:** N/A (artefactos de gobierno; cubre trazabilidad de los 87 FR).

## FASE 0.5 — Brownfield Reconciliation

- **Objetivo:** auditar el repositorio demo existente (`github.com/cherrera0001/smart-sense-demo`) y reconciliarlo con las specs antes de tocar la base de datos. Decidir con evidencia qué se conserva, refactoriza, reemplaza o archiva. **Bloquea la Fase 1.**
- **Contexto:** la demo (Next 15 + React 19, 100% mock + localStorage, build verde, sin tests funcionales, rutas en español, sin multi-tenant/backend/IoT) tiene valor visual/comercial pero no debe contaminar la arquitectura productiva.
- **Entregables (en `docs/`):**
  - `docs/audit/brownfield-current-state.md` — estado real del demo.
  - `docs/audit/routes-reconciliation.md` — rutas actuales (ES) vs objetivo (EN) + decisión de idioma/redirects.
  - `docs/audit/component-inventory.md` — 19 componentes con decisión keep/refactor/replace/delete/archive.
  - `docs/audit/mock-data-inventory.md` — todo dato mock/hardcode → fixtures/seed/DEMO_MODE.
  - `docs/audit/spec-code-gap-analysis.md` — FR cubiertos/no/parciales; specs a ajustar; contradicciones.
  - `docs/audit/salvage-matrix.md` — matriz de rescate por área (KEEP/REFACTOR/REPLACE/DELETE/ARCHIVE).
  - `docs/audit/validation-results.md` — resultados reales de lint/typecheck/build/test.
  - `docs/architecture/migration-strategy.md` — estrategia elegida (**A: Preserve UI, add backend gradually** + B-lite).
  - `docs/architecture/frontend-transition-plan.md` — estructura objetivo + mapeo de componentes + DEMO_MODE.
  - `docs/architecture/backend-transition-plan.md` — monorepo pnpm + Prisma/Postgres/Timescale, convivencia mock↔API.
- **Dependencias:** FASE 0 (specs publicadas).
- **Criterio de cierre (go/no-go Fase 1):** los 10 documentos publicados; estrategia de migración aprobada por Cristóbal; decisiones abiertas del gap-analysis resueltas o asignadas; rama `chore/brownfield-spec-reconciliation` creada; **ninguna acción destructiva ejecutada** (solo plan).
- **Restricción dura:** no implementar Prisma/backend, no borrar/mover código, no push, no PR durante esta fase.
- **FR cubiertos:** N/A (gobierno/transición).

## FASE 1 — Base de datos y dominio

> **Precondición:** FASE 0.5 cerrada con go/no-go aprobado.
>
> **Estado: ✅ Implementada (estructura) — ⏳ pendiente verificación de migración/seed/tests contra Postgres con Docker.**
> Implementado y versionado: monorepo pnpm (apps/web migrada con build verde, apps/api esqueleto `GET /health`, apps/iot-bridge scaffold sin MQTT), `packages/shared` (enums canónicos, branded ids, DTOs, schemas Zod, helpers de formato), `packages/db` (`schema.prisma` con 21 modelos + 24 enums; migración manual `0001_init/migration.sql` de 592 líneas con extensiones, CHECKs, `create_hypertable` en DO/EXCEPTION, índices, triggers `set_updated_at` y append-only; `seed.ts` idempotente con catálogo global + datos demo bajo `organizations.is_demo=true`; suite Vitest+Testcontainers con guard de Docker).
> **Pendiente (requiere entorno con Docker/Postgres):** ejecutar `pnpm db:migrate`, `pnpm db:seed` y `pnpm test:db` y observar resultados reales. Guía operativa en `docs/database/phase-1-db-setup.md`.
> **Desviaciones documentadas:** se añadió `organizations.is_demo boolean default false` (no estaba en `03-data-model/relational-model.md`) como marca de datos demo; el UNIQUE de idempotencia de telemetría es físicamente `(event_hash, source_timestamp)` por requisito de hypertable (Prisma declara `@unique` simple como intención lógica).

- **Objetivo:** materializar el modelo relacional (21 tablas) con Prisma + Postgres 16 + TimescaleDB, con constraints, triggers y seeds, verificado por tests de integridad.
- **Entregables:**
  - Monorepo pnpm inicializado (`apps/api`, `apps/web`, `apps/iot-bridge`, `packages/shared`, `packages/db`) + git.
  - `packages/db/schema.prisma` con las 21 tablas, enums (text+CHECK), PK UUIDv7, timestamps, soft delete donde aplica.
  - Migración inicial; `telemetry_readings` como hypertable Timescale (`create_hypertable`); políticas de compresión/retención (NFR-026/033).
  - Constraints/CHECK de dominio (no-negatividad, `power_factor∈[-1,1]`, `pre_alert_pct 1..100`, `period_end≥period_start`, unicidades) y trigger append-only en `audit_logs` (NFR-014).
  - Seeds: `device_categories`, `distributors`, `tariffs` demo.
  - Tests de integridad referencial y de no-negatividad (Vitest + Testcontainers).
- **Dependencias:** FASE 0 (ADRs, modelo relacional).
- **Criterio de cierre:** `prisma migrate deploy` desde cero + seeds OK en CI; suite `db` (constraints/unicidad/append-only/hypertable) verde; matriz de validación filas NFR-026/028/029/031/032/041 + INV-6/7/8 a `EN PROGRESO`.
  - **Estado del criterio: parcialmente cumplido.** ✅ Estructura completa y versionada (schema, migración, seeds, tests escritos). ⏳ Ejecución contra DB **pendiente de entorno**: `migrate deploy` desde cero, seeds y suite `db` aún no corridos en un Postgres real (sin Docker en el entorno de validación → tests se saltan por guard). Las matrices se actualizarán a `EN PROGRESO` una vez verde la ejecución.
- **FR cubiertos:** base estructural de todos; valida invariantes de canon (no-negatividad, idempotencia por `event_hash`, append-only audit). Habilita FR-ONB-005, FR-DASH-002, FR-CTRL-007.

## FASE 1.2 — External PostgreSQL Runtime Verification

> **Precondición:** FASE 1 estructural ✅; FASE 1.1 (runtime con Docker) **BLOCKED** por engine de Docker local que no inicializa (ver `docs/audit/phase-1-runtime-blocker.md`).
>
> **Estados posibles de la subfase:** `PASS` (verificación contra Postgres real en verde) · `READY-BLOCKED` (repo listo, falta `DATABASE_URL`) · `FAIL` (DB accesible pero un gate falla con datos reales).
> **Estado actual: READY-BLOCKED.**

- **Objetivo:** destrabar el cierre runtime de Fase 1 sin depender de Docker local, ejecutando `db:migrate:deploy` + `db:seed` + `test:db` contra una **PostgreSQL externa de desarrollo**, bajo los mismos criterios PASS/FAIL/BLOCKED del flujo SDD.
- **Entregables:**
  - Soporte de **modo dual** en `packages/db/tests/setup.ts` (`SMARTSENSE_DB_TEST_MODE` = `docker` | `external`), sin skip silencioso (estados PASS/FAIL/BLOCKED explícitos).
  - **Guard de seguridad** anti-producción (`assertSafeExternalUrl`: rechaza `prod|production|live|primary|master|main`; exige `dev|test|staging|sandbox|smartsense_dev` o `SMARTSENSE_DB_ALLOW_UNSAFE=1`) + `maskDbUrl()`.
  - Interfaz de ejecución agregada `pnpm verify:phase1:external` (`db:generate → db:migrate:deploy → db:seed → test:db:external → typecheck → lint → build:web → build:api`).
  - Gates SDD de runtime formalizados: `specs/08-quality/runtime-gates.md` (GATE-DB-001..004, GATE-WEB/API/TYPE/LINT/SEC/SDD).
  - Docs: `docs/database/phase-1-external-postgres-verification.md`, `docs/audit/phase-1-external-runtime-precheck.md`; actualización de `phase-1-runtime-verification.md` y `phase-1-summary.md`.
- **Dependencias:** FASE 1 (estructura) implementada.
- **Criterio de cierre (→ PASS):** `pnpm verify:phase1:external` con `DATABASE_URL` de desarrollo termina en exit 0 (migración 21 tablas + 24 enums, seeds con conteos esperados, `test:db:external` verde, typecheck/lint/builds verdes). Recién entonces Fase 1 pasa a PASS, se actualizan las matrices y se desbloquea Fase 2 (GATE-SDD-001).
- **Estado del criterio:** **READY-BLOCKED** — no hay `DATABASE_URL` externa en el entorno actual (ni Docker, ni Postgres nativo). GATE-DB-002/003/004 = BLOCKED; build/type/lint/sec = PASS. Un único comando cierra la subfase cuando exista la DB.
- **FR cubiertos:** N/A (verificación runtime de la base estructural de Fase 1; cubre INV-6/8 y NFR-026/028/029/031/032/041 al pasar a PASS).

## FASE 2 — API base (auth, organizations, installations, devices, onboarding)

- **Objetivo:** levantar la API Fastify con autenticación, RBAC multi-tenant y el flujo de onboarding hasta dispositivos.
- **Entregables:**
  - Auth: `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me` (JWT access≤15min + refresh rotado, Argon2id; throttling).
  - Organizations: `GET/POST /organizations`, `GET /organizations/{id}`.
  - Installations: `GET/POST /installations`, `GET/PATCH /installations/{id}`.
  - Onboarding: `POST /onboarding/kit/scan`, `/kit/claim`, `/devices/pair`, `GET /onboarding/status`.
  - Devices: `GET /installations/{installationId}/devices`, `POST /devices`, `GET/PATCH /devices/{id}`.
  - Middleware de tenant (deriva `organization_id` del token) y motor RBAC (FR-AUTH-009); AuditService para claim/cambios.
  - AuthService, OrganizationService, InstallationService, OnboardingService, DeviceService, AuditService.
- **Dependencias:** FASE 1.
- **Criterio de cierre:** integ happy+error+authz para cada endpoint; suite cross-tenant (NFR-001) y RBAC (NFR-003) verde; claim auditado (NFR-013); OpenAPI de estos grupos validado; matriz filas 1–13 y 40–41 → `EN PROGRESO`.
- **FR cubiertos:** FR-AUTH-001/002/003/004/009/010, FR-ONB-001/002/003/004/005/006/007/008, FR-PROF-001..004 (vía PATCH installation), FR-SET-002/003.

## FASE 3 — IoT y telemetría

- **Objetivo:** ingestión idempotente de telemetría, agregaciones y lecturas para dashboard/reportes básicos.
- **Entregables:**
  - Contrato de ingestión (`07-iot/telemetry-model.md`) implementado en iot-bridge.
  - `POST /iot/telemetry` (token de kit, scope `telemetry:ingest`): accepted/duplicate/invalid; `Idempotency-Key`; `event_hash` UNIQUE; doble timestamp; markSeen.
  - `GET /installations/{installationId}/telemetry/latest` y `/telemetry/range`.
  - EnergyAggregationService: rollup por granularidad (hour/day/week/month) con costeo vía BillingService; recompute idempotente; continuous aggregates Timescale.
  - Reportes básicos: `reports/daily|weekly|monthly|last-three-months`.
  - TelemetryIngestionService, EnergyAggregationService, ReportService, BillingService (computeCost), TariffService.
- **Dependencias:** FASE 1 (hypertable), FASE 2 (devices/installations).
- **Criterio de cierre:** suite `iot` (idempotencia NFR-028, validez NFR-030, rangos NFR-031, doble timestamp NFR-029, reconexión NFR-017) verde; recompute determinista (NFR-032); reportes desde agregados dentro de SLO (NFR-020/023, smoke); OpenAPI telemetría/reportes; matriz filas 20, 23–25, 45 → `EN PROGRESO`/`VALIDADO`.
- **FR cubiertos:** FR-DASH-001/002, FR-REP-001/002/003/004/005, FR-BILL-004 (tarifa para costeo), base de FR-BRK y FR-PROJ.

## FASE 4 — Dashboard y reportes (frontend)

- **Objetivo:** shell de la app, navegación, dashboard en vivo y reportes con estados UI completos.
- **Entregables:**
  - Layouts `(auth)`, `(onboarding)`, `(app)`; `AppSidebar` (8 módulos), header con `InstallationSwitcher`, guards de ruta y middleware.
  - `/dashboard`: ConsumptionGauge, CostCard, KitStatusIndicator, AlertSummaryCard; WebSocket en vivo (NFR-022).
  - `/reports`: ReportChart, TimeRangeSelector, MetricToggle.
  - Estados transversales: Skeleton, EmptyState, ErrorState, OfflineBanner (NFR-018, FR-DASH-007).
  - Onboarding UI: QRScanner, SegmentSelector, OnboardingStepper, ProfileForm*, BillUploader, BillDataForm, DistributorSelect/TariffForm.
  - React Query + Zustand (instalación activa en estado, no en URL); formato CLP `Intl.NumberFormat('es-CL')` (sin cálculo en cliente).
- **Dependencias:** FASE 2 (auth/onboarding/installations), FASE 3 (dashboard/reports/telemetry).
- **Criterio de cierre:** RTL cubre loading/empty/error/offline por pantalla de datos; e2e dashboard en vivo y onboarding; Lighthouse LCP (NFR-024, smoke); matriz filas 19, 22, 23 → `EN PROGRESO`; NFR-018/022/024/042/043/044 actualizados.
- **FR cubiertos:** FR-DASH-001..007, FR-REP-001..005, FR-ONB-001..008 (UI), FR-PROF-001..004 (UI), FR-BILL-001..007 (UI), FR-AUTH-001/002 (UI).

## FASE 5 — Desglose, alertas y recomendaciones

- **Objetivo:** desglose por device/categoría, motor de alertas y recomendaciones con impacto en CLP.
- **Entregables:**
  - `GET /installations/{installationId}/breakdown?groupBy=device|category` (BreakdownService): %, ranking, total=Σitems.
  - `GET /installations/{installationId}/alerts`, `PATCH /alerts/{id}/review` (AlertService): anomaly/high_device/over_budget/offline; dedup; orden por severidad.
  - `GET /installations/{installationId}/recommendations` (RecommendationService): source alert/periodic; impacto CLP solo con tarifa; apply/dismiss.
  - NotificationService (in_app/email/push) para alertas.
  - Frontend `/breakdown` (DeviceBreakdownChart) y `/alerts` (AlertList, SeverityBadge, AlertFilters, RecommendationCard).
- **Dependencias:** FASE 3 (agregados), FASE 4 (shell/estados UI).
- **Criterio de cierre:** unit dedup y orden por severidad; total=Σitems y %≈100; CLP omitido sin tarifa; review baja contador dashboard; matriz filas 26–31 → `EN PROGRESO`/`VALIDADO`.
- **FR cubiertos:** FR-BRK-001..006, FR-ALRT-001..006, FR-REC-001..005, FR-DASH-006.

## FASE 6 — Control

- **Objetivo:** control puntual on/off, programaciones, límites de consumo, con auditoría y validación de permisos.
- **Entregables:**
  - `POST /devices/{deviceId}/control-actions` (ControlService): pending → downlink MQTT → resolveAction async; viewer → 403 + rejected auditado.
  - `GET /devices/{deviceId}/control-state`; `POST /devices/{deviceId}/control-schedules` (solapamientos); `POST /devices/{deviceId}/consumption-limits` (positivos, pre_alert_pct 1..100, action_on_exceed).
  - AuditService en toda acción de control (NFR-013); equipos críticos no se apagan automáticamente (FR-PROF-005).
  - Frontend `/control` (ControlToggle optimista, ControlActionLog) y `/smart-control` (ScheduleEditor, ConsumptionLimitForm).
- **Dependencias:** FASE 2 (devices/RBAC), FASE 3 (telemetría para estado/límites), FASE 5 (alertas para pre-alerta/over_budget).
- **Criterio de cierre:** authz viewer→403 sin downlink (INV-5, NFR-003); INV-3 audit por acción (incl. rejected); resolveAction idempotente; solapamientos y límites validados; ControlToggle pending/rollback; matriz filas 32–37 → `VALIDADO`.
- **FR cubiertos:** FR-CTRL-001..009, FR-PROF-005 (bloqueo de apagado de crítico).

## FASE 7 — Hardening

- **Objetivo:** seguridad, observabilidad, E2E completo, documentación y despliegue.
- **Entregables:**
  - Seguridad: cabeceras CSP/HSTS (NFR-009), URLs firmadas de boleta (NFR-005), secret-scan/SAST en CI (NFR-006), rate limiting global (NFR-004).
  - Observabilidad: logging estructurado con correlation id (NFR-036), métricas y alertas (NFR-037), trazas distribuidas (NFR-038).
  - E2E completo (onboarding, dashboard, control, cross-tenant, offline) y pruebas de carga (NFR-020/021/022/023).
  - Backups/DR (NFR-019); retención Timescale/audit (NFR-033/034); ciclo de vida de boleta (NFR-035).
  - Documentación de despliegue (Docker Compose, GitHub Actions) y contrato API final (NFR-045).
- **Dependencias:** FASES 1–6.
- **Criterio de cierre:** todos los gates de `test-plan.md §3`; matriz de validación con 45/45 NFR e INV-1..10 en `VALIDADO`; SLO de carga dentro de objetivo; release candidate desplegable.
- **FR cubiertos:** transversal (endurecimiento de los 87 FR e invariantes); cierra V1 pendiente y prepara V2.

---

## Resumen de fases

| Fase | Foco | Dependencias | FR principales |
|---|---|---|---|
| 0 | Ordenamiento / gobierno | — | trazabilidad de los 87 FR |
| 1 | DB + dominio (21 tablas) | 0 | base estructural + invariantes |
| 1.2 | External PostgreSQL runtime verification (READY-BLOCKED) | 1 | verificación runtime (GATE-DB-001..004) |
| 2 | API base | 1 | AUTH, ONB, PROF, SET-002/003 |
| 3 | IoT + telemetría | 1,2 | DASH-001/002, REP, ingesta |
| 4 | Frontend dashboard/reportes | 2,3 | DASH, REP, onboarding/boleta UI |
| 5 | Desglose, alertas, recomendaciones | 3,4 | BRK, ALRT, REC |
| 6 | Control | 2,3,5 | CTRL, PROF-005 |
| 7 | Hardening | 1–6 | transversal + NFR |
