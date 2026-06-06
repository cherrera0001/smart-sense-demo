# Release Checklist — SmartSense F0–F7

> Rama `release/smartsense-f0-f7` (HEAD `babfb68` + docs Fase 8.1). Fecha: **2026-06-06**.
> Leyenda: ✅ hecho · ⏳ pendiente (lo ejecuta el orquestador) · ⛔ bloqueado (autorización/entorno).

| # | Ítem | Estado | Nota |
|---|---|---|---|
| 1 | Secret scan OK | ✅ | `pnpm security:scan-secrets` exit 0; `.env` ignorados; `.env.example` solo placeholders. |
| 2 | CI OK | ✅ | `.github/workflows/ci.yml` on push; run `27052719013` **PASS** (postgres:16 efímero). |
| 3 | DB migrations OK (dev) | ✅ | 4 migraciones aditivas aplicadas a Neon dev (`migrate deploy`, `status` up to date); no destructivas. |
| 3b | DB migrate **staging** | ⛔ | READY-BLOCKED: sin DB/host de staging. Correr `db:generate && db:migrate:deploy && migrate status` contra `DATABASE_URL` de staging (`phase-8-1-staging-migration.md`). |
| 4 | API health/readyz local OK | ✅ | `/healthz` + `/readyz` (`SELECT 1`) verificados local contra Neon. |
| 4b | health/readyz **remoto** | ⛔ | READY-BLOCKED: sin API staging. `curl <STAGING_API_URL>/health`,`/readyz` (`phase-8-1-staging-health.md`). |
| 5 | Smoke local OK | ✅ | Smoke local 7 pasos OK (API real + Neon). |
| 5b | Smoke **remoto** | ⛔ | READY-BLOCKED: depende de API staging. `API_BASE_URL=<STAGING_API_URL> pnpm smoke:api` (`phase-8-1-staging-smoke.md`). |
| 6 | Web build OK | ✅ | `pnpm build:web` ✅ (12 rutas). |
| 7 | DEMO_MODE confirmado | ✅ | `NEXT_PUBLIC_DEMO_MODE` activo en build demo; web clients de API son preparatorios. |
| 8 | No downlink productivo | ✅ | iot-bridge en `dry-run`; sin conexión a broker MQTT por defecto. |
| 9 | Control dry-run | ✅ | Todas las acciones de control persisten `dry_run=true`; sin downlink físico. |
| 10 | Neon prod/dev identificado | ✅ | DB usada en validación = Neon **dev** (`neondb`). Prod aún no provisionado (deploy pendiente). |
| 11 | Rollback definido | ✅ | Plan documentado en `docs/deployment/rollback-plan.md`. |
| 12 | Push de rama de release | ✅ | `release/smartsense-f0-f7` pusheada a `origin` (NO master). |
| 12b | PR de revisión | ✅ | PR **#1** abierto (base `master`, head release) — **solo revisión, sin merge**; riesgo de prod documentado en el body (`phase-8-1-pr.md`). |
| 13 | Deploy API staging | ⛔ | READY-BLOCKED: sin CLI de hosting autenticado (flyctl ausente, railway sin login, render ausente, sin Docker). |
| 13b | Vercel preview (web) | ⛔ | Previews del push FALLARON (root monorepo sin app Next); producción INTACTA; cambiar settings rompe prod de master → pendiente de autorización (`phase-8-1-vercel-preview.md`). |
| 14 | Build de imágenes Docker | ⛔ | BLOCKED por entorno local; se ejecuta en CI/host con Docker. |
| 15 | Producción NO tocada | ✅ | `master` sin cambios; Vercel producción `Ready`/intacta; settings de Vercel no modificados. |

## Resumen de estado

- **Listo (✅):** secret scan, migraciones dev, health/readyz local, smoke local, web build, DEMO_MODE, no-downlink, control dry-run, Neon dev identificado, rollback definido, **push de la rama**, **CI PASS**, **PR #1 abierto (sin merge)**, **producción no tocada**.
- **Bloqueado por credenciales de hosting / autorización (⛔, READY-BLOCKED):** deploy de API a staging, migrate staging, health/readyz remoto, smoke remoto, Vercel preview, build de imágenes Docker.

> **Veredicto Fase 8.1:** **READY-BLOCKED** — release branch + CI + PR de revisión listos; el deploy de API a staging está bloqueado por falta de credenciales de hosting (sin CLI autenticado), y de él dependen migrate/health/readyz/smoke remoto. El Vercel preview limpio depende de autorización (riesgo de producción en `master`). Producción intacta.
