# Runtime Gates — SmartSense (SDD)

> Define los **gates de runtime** del flujo spec-driven (SDD): controles ejecutables que una fase debe superar contra un entorno real (no solo "compila"). Cada gate tiene objetivo, comando, criterios PASS/FAIL/BLOCKED, evidencia requerida y archivo donde registrar el resultado.
> Origen: Fase 1.1 (Docker local roto) → Fase 1.2 (fallback a PostgreSQL externa de desarrollo). Interfaz de ejecución agregada: `pnpm verify:phase1:external`.
> Estados canónicos: **PASS** (criterio cumplido con evidencia real), **FAIL** (ejecutó y falló), **BLOCKED** (no se pudo ejecutar por falta de entorno — NO es PASS ni FAIL; explícito, sin skip silencioso).

---

## Convención

- Los comandos se ejecutan desde la **raíz del monorepo** (delegan a `@smartsense/db`, `@smartsense/web`, `@smartsense/api` vía pnpm).
- Modo de DB controlado por `SMARTSENSE_DB_TEST_MODE` (`docker` | `external`) + `DATABASE_URL` (en modo external). Ver `docs/database/phase-1-external-postgres-verification.md`.
- "Evidencia requerida": salida real del comando (exit code + extracto), nunca "debería funcionar".
- Nunca imprimir `DATABASE_URL` completa en evidencia → usar la forma enmascarada (`maskDbUrl`, `postgresql://***@host/db`).

---

## GATE-DB-001 — Generación del cliente Prisma

- **Objetivo:** validar que `schema.prisma` (21 modelos + 24 enums) es válido y genera el client.
- **Comando:** `pnpm db:generate`
- **PASS:** exit 0; client generado; sin errores de validación de schema.
- **FAIL:** exit ≠ 0 (schema inválido, relación rota, enum mal declarado).
- **BLOCKED:** N/A (no requiere DB; si falla es FAIL, no BLOCKED).
- **Evidencia:** exit code + línea "Generated Prisma Client".
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-DB-002 — Migración aplicable desde cero

- **Objetivo:** aplicar `0001_init` (21 tablas, 24 enums, CHECKs, hypertable en DO/EXCEPTION, índices, triggers `set_updated_at` y append-only) sobre una DB limpia (NFR-041).
- **Comando:** `pnpm db:migrate` (dev, genera/aplica) · `pnpm db:migrate:deploy` (CI / entorno externo limpio, solo aplica).
- **PASS:** exit 0; las 21 tablas y 24 enums existen; `prisma migrate status` sin drift.
- **FAIL:** exit ≠ 0; statement SQL rechazado; tabla/enum/constraint faltante.
- **BLOCKED:** no hay PostgreSQL accesible (`P1001 Can't reach database server`, o `DATABASE_URL` no definida) → registrar BLOCKED, no FAIL.
- **Evidencia:** exit code + conteo de tablas (`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`).
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-DB-003 — Seeds idempotentes

- **Objetivo:** poblar catálogo global (device_categories, distributors, tariffs) + escenario demo (`organizations.is_demo=true`); reejecutable sin duplicar.
- **Comando:** `pnpm db:seed`
- **PASS:** exit 0; conteos esperados > 0 (ver verificación de seeds abajo); 2ª ejecución no duplica filas (upserts deterministas).
- **FAIL:** exit ≠ 0; violación de UNIQUE/FK; conteos en 0 donde se esperaba > 0; duplicados tras reejecutar.
- **BLOCKED:** sin DB accesible (depende de GATE-DB-002) → BLOCKED.
- **Evidencia:** exit code + conteos: `device_categories`, `distributors`, `tariffs`, `organizations(is_demo=true)`, `installations` demo, `energy_kits` demo, `devices` demo, `alerts`, `recommendations`.
- **Registrar en:** `docs/audit/phase-1-seed-verification.md`.

## GATE-DB-004 — Suite de integridad (constraints/idempotencia/append-only)

- **Objetivo:** verificar invariantes de datos contra una Postgres real (FK, no-negatividad, `power_factor ∈ [-1,1]`, `pre_alert_pct 1..100`, `period_end ≥ period_start`, unicidades, kit único activo, append-only de `audit_logs`, idempotencia telemetría por `event_hash`).
- **Comando:** `pnpm test:db` (auto) · `pnpm test:db:docker` (Testcontainers) · `pnpm test:db:external` (`DATABASE_URL` externa migrada).
- **PASS:** exit 0; todos los tests verdes; **sin skips silenciosos**.
- **FAIL:** exit ≠ 0; algún invariante no se cumple.
- **BLOCKED:** modo resuelto `none` (sin Docker y sin `DATABASE_URL`) → `setup.ts` lanza `BLOCKED_MESSAGE`; registrar BLOCKED.
- **Evidencia:** exit code + resumen Vitest (tests pasados/fallados) + `mode` resuelto (`docker`/`external`).
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-WEB-001 — Build del frontend

- **Objetivo:** la demo Next.js (12 rutas, DEMO_MODE) compila sin romper.
- **Comando:** `pnpm build:web`
- **PASS:** exit 0; build completo (12 rutas).
- **FAIL:** exit ≠ 0; error de compilación/tipos en build.
- **BLOCKED:** N/A (no requiere DB).
- **Evidencia:** exit code + recuento de rutas del output de Next.
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-API-001 — Build de la API

- **Objetivo:** el esqueleto Fastify (`GET /health`) compila.
- **Comando:** `pnpm build:api`
- **PASS:** exit 0.
- **FAIL:** exit ≠ 0.
- **BLOCKED:** N/A.
- **Evidencia:** exit code.
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-TYPE-001 — Typecheck del monorepo

- **Objetivo:** sin errores de tipos en todos los paquetes (NFR-039).
- **Comando:** `pnpm typecheck`
- **PASS:** exit 0; 0 errores.
- **FAIL:** exit ≠ 0.
- **BLOCKED:** N/A.
- **Evidencia:** exit code + "0 errores".
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-LINT-001 — Lint del monorepo

- **Objetivo:** sin errores de lint (NFR-039); warnings preexistentes documentados.
- **Comando:** `pnpm lint`
- **PASS:** exit 0 (warning preexistente `react-hooks/exhaustive-deps` de la demo permitido, documentado).
- **FAIL:** exit ≠ 0; cualquier error de lint nuevo.
- **BLOCKED:** N/A.
- **Evidencia:** exit code + recuento warnings/errors.
- **Registrar en:** `docs/audit/phase-1-runtime-verification.md`.

## GATE-SEC-001 — No hay secretos trackeados

- **Objetivo:** ninguna credencial/`DATABASE_URL` real versionada (NFR-006); `.env` ignorado.
- **Comando:** `git ls-files | Select-String "\.env"` (PowerShell) / `git ls-files | grep -i '\.env'` (bash) + `git check-ignore .env packages/db/.env`.
- **PASS:** solo `.env.example` trackeado; `.env` y `packages/db/.env` ignorados; `DATABASE_URL` nunca commiteada.
- **FAIL:** cualquier `.env`/secreto/`DATABASE_URL` real en el índice.
- **BLOCKED:** N/A.
- **Evidencia:** salida de `git ls-files` (solo `.env.example`) + `git check-ignore` con match.
- **Registrar en:** `docs/audit/phase-1-external-runtime-precheck.md`.

## GATE-SDD-001 — No avanzar de fase si la actual está BLOCKED/PARTIAL

- **Objetivo:** disciplina SDD: una fase no se cierra (ni habilita la siguiente) hasta que sus gates de runtime estén en PASS. Fase 2 permanece BLOQUEADA mientras GATE-DB-002..004 no sean PASS.
- **Comando:** revisión de gobierno (no automatizable): inspección de esta tabla + `roadmap.md` §FASE 1 / §FASE 1.2.
- **PASS (enforced):** todos los gates de la fase en PASS antes de iniciar la siguiente.
- **FAIL:** se inició trabajo de la fase siguiente con gates de la actual en BLOCKED/PARTIAL.
- **BLOCKED:** la fase actual tiene gates en BLOCKED → la siguiente queda **bloqueada por diseño** (no es un fallo del gate, es su efecto).
- **Evidencia:** tabla-resumen de abajo + estado en `roadmap.md`.
- **Registrar en:** `specs/09-implementation-plan/roadmap.md`, `specs/09-implementation-plan/tasks.md`.

---

## Gates de Fase 7 (Hardening · seguridad / ops / CI / despliegue / E2E)

> Añadidos en Fase 7 (`feat/phase-7-hardening`, 2026-06-04). Verificados contra Neon real (credencial rotada) salvo Docker (BLOCKED por entorno). Evidencia: `docs/audit/phase-7-runtime-verification.md`, `docs/implementation/phase-7-summary.md`.

### GATE-SEC-002 — Secret scan (sin secretos versionados)

- **Objetivo:** ningún secreto/credencial/`DATABASE_URL` real en archivos versionados (NFR-006).
- **Comando:** `pnpm security:scan-secrets` (`scripts/secret-scan.mjs`).
- **PASS:** exit 0; sin hallazgos (solo placeholders en `.env.example`).
- **FAIL:** exit ≠ 0; secreto detectado en el índice/working tree versionado.
- **BLOCKED:** N/A.
- **Evidencia:** exit code (0).
- **Estado actual:** **PASS** (exit 0). Además: contraseña Neon **ROTADA** (vieja invalidada vía `ALTER ROLE`; ver `docs/security/phase-7-secret-rotation.md`).
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-SEC-003 — CORS sin wildcard en producción

- **Objetivo:** en producción el CORS no admite `*`; solo orígenes de `CORS_ORIGINS` (NFR-009).
- **Comando:** suite API (test de security: CORS allow/deny + `env.ts` rechaza wildcard en prod) — `pnpm --filter @smartsense/api test`.
- **PASS:** origen listado permitido; no listado rechazado; `loadConfig` **rechaza** wildcard si `NODE_ENV=production`.
- **FAIL:** wildcard aceptado en prod, o origen ajeno permitido.
- **BLOCKED:** N/A.
- **Evidencia:** tests de security verdes (`apps/api/src/plugins/cors.ts`, `config/env.ts`).
- **Estado actual:** **PASS**.
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-SEC-004 — JWT fuerte en producción

- **Objetivo:** `JWT_SECRET`/`JWT_REFRESH_SECRET` ≥ 32 chars; el arranque rechaza valores débiles/ausentes en prod (NFR-006).
- **Comando:** suite API (test de security: `env.ts` rechaza JWT débil/ausente en prod).
- **PASS:** `loadConfig` lanza si el secreto es débil/ausente con `NODE_ENV=production`.
- **FAIL:** arranca con secreto débil/ausente en prod.
- **BLOCKED:** N/A.
- **Evidencia:** test de security verde (`apps/api/src/config/env.ts`).
- **Estado actual:** **PASS**.
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-SEC-005 — Rate-limit en auth y control

- **Objetivo:** límite global + estricto en `/auth/login`, `/auth/register` y `POST /devices/{deviceId}/control-actions` (NFR-004).
- **Comando:** suite API (test de security: 429 al exceder) — global 300/min.
- **PASS:** exceder el umbral → **429**; endpoints sensibles con límite más estricto.
- **FAIL:** sin 429 al exceder; endpoints sensibles sin límite.
- **BLOCKED:** N/A.
- **Evidencia:** test 429 verde (`apps/api/src/plugins/rate-limit.ts`).
- **Estado actual:** **PASS**.
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-OPS-001 — Liveness `/healthz`

- **Objetivo:** liveness sin auth/DB (`{ status, service, version, timestamp, uptime_s }`); sin secretos (NFR-037).
- **Comando:** suite API (test de health) + `GET /health` / `/healthz`.
- **PASS:** 200 con el shape esperado; no expone secretos ni connection strings.
- **FAIL:** ≠ 200, falta campos, o fuga de secretos.
- **BLOCKED:** N/A.
- **Evidencia:** test de health verde (`apps/api/src/health.ts`); verificado contra Neon.
- **Estado actual:** **PASS**.
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-OPS-002 — Readiness `/readyz` (DB)

- **Objetivo:** readiness con chequeo de DB (`SELECT 1`); 503 degraded si falla (NFR-037).
- **Comando:** suite API (test de health) + `GET /readyz`.
- **PASS:** DB ok → `status: ready`/`db: ok` (200); DB caída → **503 degraded**; sin secretos.
- **FAIL:** no chequea DB, o 200 con DB caída.
- **BLOCKED:** N/A.
- **Evidencia:** test de health verde (`apps/api/src/health.ts`); verificado contra Neon.
- **Estado actual:** **PASS**.
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-CI-001 — Pipeline GitHub Actions

- **Objetivo:** CI reproducible: `secret-scan → typecheck → lint → build api/web/iot-bridge → migrate:deploy + seed + test:db:external` sobre Postgres efímero (NFR-041/006).
- **Comando:** `.github/workflows/ci.yml` (service `postgres:16`, sin Timescale → fallback `DO/EXCEPTION`; pnpm; **no usa Neon real**).
- **PASS:** workflow definido y consistente con los scripts root (`ci:verify`, `ci:test:db`, `security:scan-secrets`); pasos en verde en runner.
- **FAIL:** algún paso del pipeline falla en CI.
- **BLOCKED:** N/A (workflow versionado; ejecución en GitHub).
- **Evidencia:** `.github/workflows/ci.yml`; scripts root; suites verdes locales como proxy.
- **Estado actual:** **PASS** (pipeline definido y consistente; suites equivalentes verdes localmente).
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`.

### GATE-DEPLOY-001 — Build de imágenes Docker (api/web)

- **Objetivo:** imágenes multi-stage de api y web construibles, sin copiar `.env` (NFR-045).
- **Comando:** `docker build -f apps/api/Dockerfile .` y `docker build -f apps/web/Dockerfile .` (Dockerfiles + `.dockerignore`).
- **PASS:** ambas imágenes construyen; `.dockerignore` excluye `.env`.
- **FAIL:** error de build; imagen copia secretos.
- **BLOCKED:** Docker **no disponible** en el entorno local → **BLOCKED** (no FAIL); construir en CI / host con Docker.
- **Evidencia:** Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) + `.dockerignore` creados y listos.
- **Estado actual:** **BLOCKED (entorno)** — Dockerfiles listos; build no ejecutado localmente. **Sigue BLOCKED en Fase 8.1** (sin Docker local ni host con Docker autenticado). No afecta el PASS del código (CI).
- **Nota Fase 8.1 (PR/CI):** rama `release/smartsense-f0-f7` pusheada; **CI PASS** (run `27052719013`, postgres:16 efímero); **PR #1** abierto solo para revisión (sin merge); deploy de API a staging READY-BLOCKED (credenciales de hosting). Ver `docs/audit/phase-8-1-{precheck,vercel-preview,pr}.md`.
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`, `docs/audit/phase-8-1-precheck.md`.

### GATE-E2E-001 — Smoke de API (`smoke-api`)

- **Objetivo:** flujo E2E mínimo contra API real + Neon (health → auth → installation → lecturas) (test-plan §16).
- **Comando:** `pnpm smoke:api` (`scripts/smoke-api.mjs`).
- **PASS:** **7 pasos OK** (health/register/login/installation/dashboard/alerts/recommendations).
- **FAIL:** algún paso falla.
- **BLOCKED:** API/Neon no accesibles → BLOCKED.
- **Evidencia:** salida del smoke (7/7).
- **Estado actual (local):** **PASS** (7/7 contra API real + Neon dev).
- **Estado actual (staging):** **READY-BLOCKED (Fase 8.1)** — sin API de staging desplegada (sin CLI de hosting autenticado). Correr `API_BASE_URL=<STAGING_API_URL> pnpm smoke:api` cuando exista el host (`docs/audit/phase-8-1-staging-smoke.md`).
- **Registrar en:** `docs/audit/phase-7-runtime-verification.md`, `docs/audit/phase-8-1-staging-smoke.md`.

---

## Tabla-resumen — Estado ACTUAL de los gates (Fase 1.4, 2026-06-02 · Neon real)

> Cerrados contra **Neon Postgres (dev) vía Vercel** (`cherrera0001s-projects/smart-sense-demo`, Development, `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`; sin TimescaleDB → fallback `DO/EXCEPTION`; URL directa/unpooled). `pnpm verify:phase1:external` → **GATE_EXIT=0**.

| Gate | Comando | Estado actual | Motivo |
|---|---|---|---|
| GATE-DB-001 | `pnpm db:generate` | **PASS** | Prisma Client v5.22.0 generado |
| GATE-DB-002 | `pnpm db:migrate[:deploy]` | **PASS** | "All migrations…applied"; `migrate status` "up to date"; 21/21 tablas en Neon |
| GATE-DB-003 | `pnpm db:seed` | **PASS** | seed OK contra Neon; conteos esperados; org demo `is_demo=true` |
| GATE-DB-004 | `pnpm test:db[:external]` | **PASS** | `test:db:external` 18/18 verdes (modo external), sin skips |
| GATE-WEB-001 | `pnpm build:web` | **PASS** | demo Next compila (12 rutas) |
| GATE-API-001 | `pnpm build:api` | **PASS** | esqueleto Fastify compila |
| GATE-TYPE-001 | `pnpm typecheck` | **PASS** | 5 paquetes, 0 errores |
| GATE-LINT-001 | `pnpm lint` | **PASS** | 1 warning preexistente demo (`Step2PairingLeds.tsx:35`, documentado) |
| GATE-SEC-001 | secret-scan / `git ls-files` | **PASS** | solo `.env.example` trackeado; `.env`/`packages/db/.env`/`.env.vercel.local` ignorados |
| GATE-SDD-001 | gobierno SDD | **PASS** | GATE-DB-002..004 en PASS → Fase 2 **AUTORIZABLE** |

**Conclusión:** **todos los gates de Fase 1 en PASS** contra Postgres real (Neon). Estado de Fase 1 = **PASS** (cerrada vía Fase 1.4). Fase 2 **AUTORIZABLE** (GATE-SDD-001 satisfecho). Evidencia: `docs/audit/phase-1-vercel-neon-runtime-verification.md §Cierre Fase 1.4`, `phase-1-real-db-schema-verification.md`, `phase-1-vercel-neon-seed-verification.md`.

> Dos fixes durante el cierre 1.4: (1) `distributors.code` índice único **completo** (era parcial → `42P10` en `ON CONFLICT`); (2) `constraints.test.ts` usa `execSync('npx tsx …')` (antes `execFileSync('npx.cmd')` → `EINVAL` en Windows).

---

## Tabla-resumen — Gates de Fase 7 (Hardening, 2026-06-04 · Neon real, credencial rotada)

> Verificados contra Neon real (nueva credencial) salvo Docker. Evidencia: `docs/audit/phase-7-runtime-verification.md`.

| Gate | Comando | Estado actual | Motivo |
|---|---|---|---|
| GATE-SEC-002 | `pnpm security:scan-secrets` | **PASS** | exit 0; sin secretos versionados; Neon rotado (vieja inválida) |
| GATE-SEC-003 | suite API (security: CORS) | **PASS** | CORS allow/deny; wildcard rechazado en prod (`env.ts`) |
| GATE-SEC-004 | suite API (security: env JWT) | **PASS** | `loadConfig` rechaza JWT débil/ausente en prod |
| GATE-SEC-005 | suite API (security: rate-limit) | **PASS** | global 300/min + estricto auth/control → 429 |
| GATE-OPS-001 | `GET /healthz` | **PASS** | liveness `{status,service,version,timestamp,uptime_s}`, sin secretos |
| GATE-OPS-002 | `GET /readyz` | **PASS** | `SELECT 1` → ready/db ok; 503 degraded si falla |
| GATE-CI-001 | `.github/workflows/ci.yml` | **PASS** | pipeline definido (postgres:16 efímero); scripts root consistentes |
| GATE-DEPLOY-001 | `docker build` api/web | **BLOCKED (entorno)** | Docker no disponible local; Dockerfiles+`.dockerignore` listos para CI; **sigue BLOCKED en Fase 8.1** |
| GATE-E2E-001 | `pnpm smoke:api` | **PASS (local)** / **READY-BLOCKED (staging)** | 7/7 local contra Neon dev; staging pendiente de API desplegada (Fase 8.1) |

**Conclusión:** todos los gates de Fase 7 en **PASS** salvo **GATE-DEPLOY-001 = BLOCKED por entorno** (Docker no disponible local; Dockerfiles listos para construirse en CI — no es FAIL). Suites: **API 156/156** (security 7, health 2, auth-refresh 7), **iot-bridge 23/23**, **DB 18/18**; typecheck/lint/builds verdes. **Estado de Fase 7 = PASS** (rotación de secreto ejecutada; Docker build BLOCKED documentado, no afecta el PASS).

> **Nota Fase 8.1 (Staging Deployment Verification, 2026-06-06):** rama `release/smartsense-f0-f7` pusheada; **CI PASS** (run `27052719013`); **PR #1** de revisión abierto (base `master`, head release, **sin merge**). **GATE-E2E-001 staging = READY-BLOCKED** (sin API de staging: ningún CLI de hosting autenticado — `railway` sin login, `flyctl`/`render` ausentes, sin Docker). **GATE-DEPLOY-001 = BLOCKED** (sin cambios). Vercel preview pendiente de autorización (riesgo de prod en `master`). Producción intacta. Detalle: `docs/audit/phase-8-1-*.md`.
