# Fase 1.3/1.4 — Vercel + Neon External DB Verification

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Objetivo: cerrar el gate de runtime de Fase 1 con una PostgreSQL externa (Neon vía Vercel). **Estado: PASS** (cerrado en Fase 1.4 — ver `## Cierre Fase 1.4` al final). La sección 1.3 se conserva como histórico del bloqueo previo.

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

## Veredicto (Fase 1.3, histórico)
**Fase 1.3: READY-BLOCKED.** Vercel linkeado y pipeline de extracción de env verificado; **faltaba crear la integración Neon Postgres** (acción de Marketplace). Sin `DATABASE_URL` no se ejecutaban migrate/seed/tests reales ⇒ no se declaraba PASS. *(Superado en Fase 1.4: la integración ya existe y el gate cerró en verde — ver abajo.)*

---

## Cierre Fase 1.4 (PASS, 2026-06-02)

> La integración Neon que faltaba en 1.3 ya está provisionada. Se ejecutó el pipeline completo contra la DB real y **cerró en verde**. Precheck del entorno: `docs/audit/phase-1-mer-db-integration-precheck.md`.

### DB usada (Neon real)
- Neon Postgres (dev) vía Vercel, proyecto **`cherrera0001s-projects/smart-sense-demo`**, entorno **Development**.
- Host enmascarado **`ep-lucky-pine-***.neon.tech`**, database **`neondb`**. **Sin TimescaleDB** (Neon no la ofrece) → `create_hypertable` cayó al fallback `DO/EXCEPTION`; `telemetry_readings` opera como tabla normal.
- Se usó la URL **directa/unpooled** para `DATABASE_URL` y `DIRECT_URL` (evita pgbouncer en migraciones).
- Guard anti-producción: como `neondb` no contiene señal `dev/test`, se confirmó manualmente con `SMARTSENSE_DB_ALLOW_UNSAFE=1` (autorizado por el usuario; DB del entorno Development, no producción).

### Resultados (evidencia real)
| Gate / paso | Comando | Resultado |
|---|---|---|
| GATE-DB-001 generate | `pnpm db:generate` | ✅ OK (Prisma Client v5.22.0) |
| GATE-DB-002 migrate | `pnpm db:migrate:deploy` | ✅ "All migrations have been successfully applied"; `migrate status`: "Database schema is up to date!" |
| Verificación esquema | inspección de `information_schema` | ✅ **21/21 tablas de dominio** + `_prisma_migrations` (ver `phase-1-real-db-schema-verification.md`) |
| GATE-DB-003 seed | `pnpm db:seed` | ✅ OK (conteos en `phase-1-vercel-neon-seed-verification.md`) |
| GATE-DB-004 tests | `pnpm test:db:external` | ✅ **18/18 PASS** (modo DB: external) |
| GATE-TYPE-001 | `pnpm typecheck` | ✅ 5 paquetes, 0 errores |
| GATE-LINT-001 | `pnpm lint` | ✅ 1 warning preexistente (`Step2PairingLeds.tsx:35`) |
| GATE-WEB-001 | `pnpm build:web` | ✅ 12 rutas |
| GATE-API-001 | `pnpm build:api` | ✅ OK |
| Pipeline agregado | `pnpm verify:phase1:external` | ✅ **GATE_EXIT=0** |

La suite `test:db:external` (18 tests) cubre: cadena user→org→…→device; device sin kit válido falla (FK); telemetría sin device falla (FK); duplicado `event_hash` falla (UNIQUE, idempotencia); aislamiento cross-tenant; boleta→installation; alerta→installation y recommendation→alert; control_action→device+user y audit_log→user/org; `audit_logs` append-only (UPDATE/DELETE rechazados por trigger); CHECKs (`total_clp<0`, `period_end<period_start`, `active_power_w<0`, `power_factor` fuera de `[-1,1]`, `limit_kwh<=0`, `pre_alert_pct` fuera de `[1,100]`, `occupants<0`); `energy_aggregate` idempotente (`NULLS NOT DISTINCT`); seed corre sin error.

### Bugs encontrados y corregidos
1. **`distributors.code` — índice único parcial (bug de DB).** El seed falló con `42P10` porque el índice único era PARCIAL (`WHERE code IS NOT NULL`), y Postgres no lo acepta para `ON CONFLICT(code)` del upsert. **Fix:** índice único **completo** sobre `code` (alineado al `relational-model` que declara `code UNIQUE`). Tras `prisma migrate reset --force` + re-aplicar, el seed corre OK. (Edita `schema.prisma` + `0001_init/migration.sql`.)
2. **`constraints.test.ts` — `npx.cmd EINVAL` en Windows (bug de test).** El test invocaba el seed con `execFileSync('npx.cmd', ...)` → `spawnSync npx.cmd EINVAL`. **Fix:** `execSync('npx tsx "<path>"')` (usa shell). No es un fallo de DB ni de modelo.

### Veredicto Fase 1.4
**PASS.** Migración aplicada sin drift, 21/21 tablas de dominio presentes, seed poblado y consistente, 18/18 tests verdes, typecheck/lint/builds en verde, `verify:phase1:external` con `GATE_EXIT=0` contra Neon real. **Fase 1 cerrada en PASS; Fase 2 AUTORIZABLE** (GATE-SDD-001 satisfecho). Sin secretos ni connection strings versionados.
