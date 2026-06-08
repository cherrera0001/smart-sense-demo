# Fase 1.4 — MER ↔ DB real (Neon vía Vercel) · Precheck

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Subfase 1.4: cerrar el gate de runtime de Fase 1 ejecutando migración/seed/tests contra la **PostgreSQL real provista por Neon (Vercel Marketplace)**, validando que el MER (21 tablas) se materializa end-to-end.
> Objetivo de este documento: dejar registro verificable del estado del entorno **antes** de ejecutar los gates de runtime contra Neon. La integración Neon que faltaba en Fase 1.3 ya existe → la subfase pasa de READY-BLOCKED a ejecutable.

---

## Tabla de checks

| # | Check | Resultado | Evidencia |
|---|---|---|---|
| 1 | Rama de trabajo | ✅ `feat/phase-1-db-domain` | `git branch --show-current` |
| 2 | Working tree | ⚠️ cambios locales esperados (fix migración + fix test de Fase 1.4) | `git status --short` → `M packages/db/prisma/migrations/0001_init/migration.sql`, `M packages/db/prisma/schema.prisma`, `M packages/db/tests/constraints.test.ts` |
| 3 | Node.js | ✅ v22.15.0 (≥20 requerido) | `node -v` |
| 4 | pnpm | ✅ 8.12.0 (≥8 requerido) | `pnpm -v` |
| 5 | Proyecto Vercel linkeado | ✅ `cherrera0001s-projects/smart-sense-demo` (entorno Development) | `.vercel/project.json` (gitignored) generado por `vercel link` |
| 6 | CLI Vercel autenticado | ✅ sesión activa (`cherrera0001`) | `vercel whoami` |
| 7 | Integración Neon Postgres | ✅ provisionada (faltaba en Fase 1.3) | host enmascarado `ep-lucky-pine-***.neon.tech`, database `neondb` |
| 8 | `.env` raíz | ✅ no trackeado (gitignored) | `git check-ignore .env` → match |
| 9 | `.env.vercel.local` | ✅ no trackeado (gitignored) | `git check-ignore .env.vercel.local` → match |
| 10 | `packages/db/.env` | ✅ no trackeado (gitignored) | `git check-ignore packages/db/.env` → match |
| 11 | Secretos / connection strings en el índice | ✅ solo `.env.example` trackeado (sin credenciales ni `DATABASE_URL` reales) | `git ls-files | grep -i .env` → `.env.example` únicamente |
| 12 | URL usada para Prisma | ✅ **directa/unpooled** en `DATABASE_URL` y `DIRECT_URL` (evita pgbouncer en migrate) | conexión directa de Neon, no la pooled |
| 13 | Guard anti-producción | ✅ resuelto con criterio: `neondb` no contiene señal `dev/test` → confirmado manualmente con `SMARTSENSE_DB_ALLOW_UNSAFE=1` (autorizado por el usuario; DB de desarrollo en entorno Development de Vercel) | `assertSafeExternalUrl` en `packages/db/tests/setup.ts` |
| 14 | Fase 2 (API de negocio) | ✅ NO implementada (fuera de alcance) | `apps/api` solo expone `GET /health` |

Leyenda: ✅ correcto / esperado · ⚠️ esperado pero relevante (los cambios locales son los dos fixes de Fase 1.4, no deuda) · ❌ ausente/no operativo.

---

## Notas

- **Motor:** Neon Postgres (serverless) **no incluye TimescaleDB**. El paso `create_hypertable` de `0001_init` cae al fallback `DO/EXCEPTION` y `telemetry_readings` queda como tabla normal (comportamiento previsto desde el diseño de la migración, ver `phase-1-db-setup.md §7`).
- **Pooling:** Neon expone una URL pooled (pgbouncer) y una directa/unpooled. Para `prisma migrate deploy` y `seed` se usó la **directa/unpooled** en `DATABASE_URL` y `DIRECT_URL` para evitar incompatibilidades de pgbouncer con migraciones.
- **Guard:** el nombre `neondb` no satisface la señal `dev|test|staging|sandbox|smartsense_dev` del guard; por ser una DB del entorno Development y bajo autorización explícita del usuario, se ejecutó con `SMARTSENSE_DB_ALLOW_UNSAFE=1`. No apunta a datos reales de producción.
- Nunca se imprime ni versiona la connection string completa ni la contraseña; host enmascarado `ep-lucky-pine-***.neon.tech`.

---

## Veredicto del precheck

**LISTO PARA EJECUTAR.** El entorno cumple todos los prerrequisitos para cerrar Fase 1 contra Neon real: rama correcta, Vercel linkeado y autenticado, integración Neon provista, secretos no trackeados, URL directa/unpooled seleccionada y guard resuelto con criterio. Resultados de la ejecución en `docs/audit/phase-1-vercel-neon-seed-verification.md`, `docs/audit/phase-1-real-db-schema-verification.md` y `docs/audit/phase-1-vercel-neon-runtime-verification.md`.
