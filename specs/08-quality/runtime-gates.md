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

## Tabla-resumen — Estado ACTUAL de los gates (Fase 1.2, 2026-06-02)

| Gate | Comando | Estado actual | Motivo |
|---|---|---|---|
| GATE-DB-001 | `pnpm db:generate` | **PASS** | schema válido, client generado (verificado en Fase 1) |
| GATE-DB-002 | `pnpm db:migrate[:deploy]` | **BLOCKED** | sin PostgreSQL accesible (Docker roto, sin DB externa, `DATABASE_URL` no definida) |
| GATE-DB-003 | `pnpm db:seed` | **BLOCKED** | depende de GATE-DB-002 |
| GATE-DB-004 | `pnpm test:db[:external]` | **BLOCKED** | modo `none`: sin Docker ni `DATABASE_URL` → `BLOCKED_MESSAGE` |
| GATE-WEB-001 | `pnpm build:web` | **PASS** | demo Next compila (12 rutas) |
| GATE-API-001 | `pnpm build:api` | **PASS** | esqueleto Fastify compila |
| GATE-TYPE-001 | `pnpm typecheck` | **PASS** | 0 errores |
| GATE-LINT-001 | `pnpm lint` | **PASS** | 1 warning preexistente demo (documentado) |
| GATE-SEC-001 | secret-scan / `git ls-files` | **PASS** | solo `.env.example` trackeado; `.env` ignorado |
| GATE-SDD-001 | gobierno SDD | **ENFORCED** | Fase 2 bloqueada hasta GATE-DB-002..004 = PASS |

**Conclusión:** los gates que no dependen de DB están en **PASS**; los gates de DB (001 build aparte: 002/003/004) están en **BLOCKED** por falta de motor PostgreSQL. Estado de Fase 1.2 = **READY-BLOCKED**: un único comando (`pnpm verify:phase1:external` con `DATABASE_URL` de desarrollo) cierra los tres gates BLOCKED.
