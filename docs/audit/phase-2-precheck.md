# Fase 2 — Precheck

> Fecha: 2026-06-02 · Rama: `feat/phase-2-api-base` · Monorepo `smartsense-brownfield`.
> Verificación previa al inicio de Fase 2 (API base): confirma que Fase 1 está cerrada en PASS y que el entorno está limpio para construir la API sobre la base de datos real.

## Resumen

Fase 1 cerró en **PASS** contra Postgres real (Neon, entorno Development, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`). El gate SDD-001 está satisfecho y la Fase 2 estaba **AUTORIZABLE**. Este precheck registra el estado del entorno antes de implementar los módulos de API.

## Checklist de precondiciones

| Condición | Estado | Evidencia |
|---|---|---|
| Fase 1 cerrada en PASS | ✅ | `docs/implementation/phase-1-summary.md §Cierre Fase 1.4`; `verify:phase1:external` GATE_EXIT=0, `test:db:external` 18/18 |
| DB de desarrollo disponible (Neon) | ✅ | Neon Postgres dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled) |
| `verify:phase1:external` en verde | ✅ | GATE_EXIT=0 (migrate 21 tablas + seed + 18/18 tests + typecheck/lint/build:web/build:api) |
| `apps/web` (demo) intacta bajo DEMO_MODE | ✅ | Build 12 rutas; sin cambios visuales; `isDemoMode` default seguro `true` |
| `apps/api` previo = solo `/health` | ✅ | Fase 1 dejó esqueleto Fastify con `GET /health` y sin lógica de negocio |
| Secretos no trackeados | ✅ | `.env`/`packages/db/.env` gitignored; placeholders en BACKLOG no son secretos reales |
| Sin trabajo de Fase 3+ adelantado | ✅ | `app.ts` NO registra telemetry/dashboard/reports/alerts/recommendations/control |

## Detalle

### Estado de Fase 1 (precondición dura)
- `prisma migrate deploy` desde cero + `db:seed` + `test:db:external` (18/18) en verde contra Neon real.
- 21/21 tablas de dominio presentes en la DB real; `verify:phase1:external` GATE_EXIT=0.
- GATE-SDD-001 satisfecho → Fase 2 AUTORIZABLE (ver `09-implementation-plan/roadmap.md §FASE 1.4` y `§FASE 2`).

### Entorno y secretos
- `DATABASE_URL`/`DIRECT_URL` viven en `packages/db/.env` (gitignored). **No** hay connection strings ni contraseñas versionadas. Host siempre enmascarado en docs (`ep-lucky-pine-***.neon.tech`).
- Los placeholders presentes en BACKLOG/docs son valores ilustrativos, **no** secretos reales → no constituyen filtración.

### Demo preservada
- `apps/web` sigue funcionando bajo `DEMO_MODE` (default `true`): 12 rutas, sin cambios visuales. La API real no es consumida por la UI en Fase 2.
- Se añadió scaffold preparatorio `apps/web/lib/api/client.ts` **NO usado por la UI** (falla intencionalmente si se invoca bajo DEMO_MODE).

### No-Fase-3
- La Fase 2 se limita a auth, organizations, installations, devices y onboarding. `app.ts` **no** registra los módulos de telemetría, dashboard, reportes, alertas, recomendaciones ni control (diferidos a Fase 3+).

## Veredicto

Precondiciones de Fase 2 **satisfechas**. Entorno limpio, Fase 1 en PASS, demo intacta, secretos no trackeados, sin adelanto de Fase 3. **Fase 2 puede iniciarse.**
