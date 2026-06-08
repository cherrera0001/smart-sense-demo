# Fase 1.2 — External PostgreSQL Runtime · Precheck

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Subfase: habilitar la verificación runtime de Fase 1 contra una **PostgreSQL externa de desarrollo** (fallback al bloqueo de Docker local de Fase 1.1).
> Objetivo de este documento: dejar registro verificable del estado del entorno **antes** de ejecutar cualquier gate de runtime. Sin DATABASE_URL externa disponible → estado de la subfase: **READY-BLOCKED** (repo listo para validar con un comando cuando exista la DB).

---

## Tabla de checks

| # | Check | Resultado | Evidencia |
|---|---|---|---|
| 1 | Rama de trabajo | ✅ `feat/phase-1-db-domain` | `git branch --show-current` |
| 2 | Working tree | ⚠️ 3 archivos modificados (no commiteados) | `git status --short` → `M packages/db/tests/{setup,integrity,constraints}.test.ts` (soporte modo dual + guard de Fase 1.2) |
| 3 | Node.js | ✅ v22.15.0 (≥20 requerido) | `node -v` |
| 4 | pnpm | ✅ 8.12.0 (≥8 requerido) | `pnpm -v` |
| 5 | Docker daemon | ❌ no operativo (`docker info` exit 1; HTTP 500 / backend WSL2 sin distro `docker-desktop`) | bloqueo formal en `phase-1-runtime-blocker.md` |
| 6 | `psql` (cliente) | ❌ ausente en PATH | `command -v psql` → vacío |
| 7 | `pg_isready` | ❌ ausente en PATH | `Get-Command pg_isready` → vacío |
| 8 | PostgreSQL nativo local | ❌ no instalado (política: no instalar software) | — |
| 9 | `DATABASE_URL` (bash) | ⚠️ **no definida** (esperado en este entorno) | `printf '%s' "$DATABASE_URL"` → vacío |
| 10 | `DATABASE_URL` (Windows/PowerShell) | ⚠️ **no definida** | `$env:DATABASE_URL` → vacío |
| 11 | `SMARTSENSE_DB_TEST_MODE` (bash + Windows) | ⚠️ no definida | ambos shells → vacío |
| 12 | `.env` raíz | ✅ no trackeado (gitignored) | `git check-ignore .env` → match |
| 13 | `packages/db/.env` | ✅ no trackeado (gitignored) | `git check-ignore packages/db/.env` → match |
| 14 | Secretos en el índice | ✅ solo `.env.example` trackeado (sin credenciales reales) | `git ls-files | grep .env` → `.env.example` |
| 15 | Soporte modo dual en tests | ✅ presente | `packages/db/tests/setup.ts` (`resolveTestDbMode`, `startExternalDb`, `assertSafeExternalUrl`, `maskDbUrl`) |
| 16 | Guard anti-producción | ✅ implementado | rechaza tokens `prod|production|live|primary|master|main`; exige `dev|test|staging|sandbox|smartsense_dev` o `SMARTSENSE_DB_ALLOW_UNSAFE=1` |
| 17 | Estado sin skip silencioso | ✅ PASS/FAIL/BLOCKED explícitos | `BLOCKED_MESSAGE` en `setup.ts`; sin DB → throw, no skip |
| 18 | Fase 2 (API de negocio) | ✅ NO implementada (fuera de alcance) | `apps/api` solo expone `GET /health` |

Leyenda: ✅ correcto / esperado · ⚠️ esperado pero relevante (no es error: la ausencia de `DATABASE_URL` es la condición que define READY-BLOCKED) · ❌ ausente/no operativo.

---

## Nota sobre los scripts de verificación

La interfaz de comandos objetivo de esta subfase es **`pnpm verify:phase1:external`** (encadena `db:generate → db:migrate:deploy → db:seed → test:db:external → typecheck → lint → build:web → build:api`). El soporte de runtime en los tests (`setup.ts`: modo `docker`/`external`, guard de seguridad, `maskDbUrl`) ya está presente y es la pieza load-bearing de la verificación. La definición de los gates y su criterio PASS/FAIL/BLOCKED está en `specs/08-quality/runtime-gates.md`; la guía de ejecución end-to-end en `docs/database/phase-1-external-postgres-verification.md`.

---

## Veredicto del precheck

**READY-BLOCKED.** El repositorio contiene todo lo necesario para verificar Fase 1 contra una Postgres real mediante **un solo comando** en cuanto exista una `DATABASE_URL` de desarrollo. El bloqueo NO es de código ni de modelo de datos: es la ausencia de un motor PostgreSQL accesible (Docker local roto en Fase 1.1, sin Postgres nativo, sin DB externa provista). No se declara PASS (honestidad técnica: "compila ≠ verificado con datos reales"). Procedimiento de cierre: `docs/database/phase-1-external-postgres-verification.md`.
