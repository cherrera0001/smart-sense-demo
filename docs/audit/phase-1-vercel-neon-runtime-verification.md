# Fase 1.3 — Vercel + Neon External DB Verification

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Objetivo: cerrar el gate de runtime de Fase 1 con una PostgreSQL externa (Neon vía Vercel Marketplace). **Estado: READY-BLOCKED.**

## Proyecto Vercel
- Proyecto: **`cherrera0001s-projects/smart-sense-demo`** (linkeado localmente con `vercel link --yes`).
- CLI Vercel **54.7.1**, autenticado como `cherrera0001` (`vercel whoami` ✅).
- `.vercel/` generado y **gitignored** (verificado).

## Qué se hizo (preparación, sin tocar producción)
1. `.gitignore` blindado: `.env.vercel.local` y `.env*.local` ignorados.
2. `vercel link --yes --project smart-sense-demo` → **Linked**.
3. `vercel env pull .env.vercel.local --environment=development` → archivo creado, **1 variable**: solo `VERCEL_OIDC_TOKEN` (auto-inyectada).
4. `vercel env ls` → **"No Environment Variables found"**.
5. Se eliminó `.env.vercel.local` (contenía solo un token OIDC efímero; no aporta DB).

## Diagnóstico
**No existe `DATABASE_URL` ni ninguna variable de Postgres/Neon** en el proyecto Vercel (ni Development, ni Preview, ni Production). ⇒ La integración **Neon Postgres del Marketplace todavía no fue creada/asociada**. El pipeline local (`link` + `env pull`) **funciona**; lo único que falta es provisionar la DB en Vercel.

Por qué no lo puede hacer este agente: crear la integración Neon es un flujo **interactivo de Marketplace + OAuth en navegador** (selección de plan/región, autorización de la cuenta Neon). No es completable de forma headless/no-interactiva ni debe forzarse como acción externa sin tu intervención.

## Resultado de los gates (sin DATABASE_URL)
| Gate | Estado |
|---|---|
| GATE-DB-001 `db:generate` | ✅ (schema válido, de iteraciones previas) |
| GATE-DB-002 `db:migrate(:deploy)` | ⛔ BLOCKED (sin DB) |
| GATE-DB-003 `db:seed` | ⛔ BLOCKED (sin DB) |
| GATE-DB-004 `test:db:external` | ⛔ BLOCKED (sin DB) |
| GATE-WEB-001 `build:web` | ✅ |
| GATE-API-001 `build:api` | ✅ |
| GATE-TYPE-001 `typecheck` | ✅ |
| GATE-LINT-001 `lint` | ✅ (1 warning preexistente) |
| GATE-SEC-001 secretos | ✅ ninguno trackeado |
| GATE-SDD-001 | ENFORCED → Fase 2 BLOQUEADA |

## Acción requerida (tú, en Vercel — una sola vez)
1. Abrir el proyecto **smart-sense-demo** en Vercel.
2. Ir a **Storage** (o **Integrations / Marketplace**), NO a Deployments.
3. **Add → Neon Postgres** (Marketplace). Autorizar la cuenta Neon.
4. Crear una base **de desarrollo** y nombrarla con señal segura: **`smartsense_dev`** (el guard rechaza nombres prod: `prod|production|live|primary|master|main`).
5. Asociarla al proyecto y exponer las variables en **Development** (y Preview). **No** en Production por ahora.
6. Confirmar que aparezca una variable `DATABASE_URL` (Neon suele dar `DATABASE_URL` *pooled* y `DATABASE_URL_UNPOOLED`/`DIRECT_URL`; para `migrate deploy` usar la **direct/unpooled**; para runtime, la pooled).

## Cierre del gate (yo o tú, una vez exista la integración)
```bash
cd <repo>
pnpm dlx vercel env pull .env.vercel.local --environment=development
# extraer DATABASE_URL de .env.vercel.local (dev/test) sin imprimirla:
export DATABASE_URL="<valor pooled o direct de Neon>"
export SMARTSENSE_DB_TEST_MODE="external"
pnpm verify:phase1:external
```
`verify:phase1:external` ejecuta: `db:generate → db:migrate:deploy → db:seed → test:db:external → typecheck → lint → build:web → build:api`. Si Neon requiere `?sslmode=require` o `DIRECT_URL` para migraciones, ajustar `DATABASE_URL`/`packages/db/.env` (mínima intervención, documentar).

## Seeds / tests
Pendientes hasta tener DATABASE_URL. Verificación de seeds: ver `docs/audit/phase-1-seed-verification.md` (device_categories/distributors/tariffs > 0; org demo `is_demo=true`; installation/kit/4 devices demo; alerts/recommendations demo).

## Veredicto
**Fase 1.3: READY-BLOCKED.** Vercel linkeado y pipeline de extracción de env verificado; **falta crear la integración Neon Postgres** (acción de Marketplace). Sin `DATABASE_URL` no se ejecutan migrate/seed/tests reales ⇒ no se declara PASS. **Fase 2 BLOQUEADA** (GATE-SDD-001).
