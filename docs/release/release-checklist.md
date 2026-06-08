# Release Checklist — SmartSense F0–F7

> Rama `release/smartsense-f0-f7` (HEAD `8244169` + docs Fase 8.2). Fecha: **2026-06-06**.
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
| 13 | Deploy API staging | ⛔ | **Fase 8.2:** Railway sin auth (`whoami` Unauthorized, `RAILWAY_TOKEN` ausente bash+win); no se desplegó (no se inventó). Runbooks Railway/Render/VPS listos (`phase-8-2-api-staging-{railway,manual-render,manual-vps}`). |
| 13b | Vercel preview (web) | ✅ | **Fase 8.2:** proyecto **aislado** `smartsense-web-v2` (scope `cherrera0001s-projects`), `apps/web` linkeado, `NEXT_PUBLIC_DEMO_MODE=true`, deploy **READY**. HTTP 401 = Deployment Protection (acceso tras owner-auth), **no** fallo de build. Producción intacta (`phase-8-2-vercel-web-v2-preview.md`). |
| 13c | Smoke remoto staging | ⛔ | **Fase 8.2:** depende de API staging (bloqueada por credenciales). `API_BASE_URL=<STAGING> pnpm smoke:api`. |
| 13d | PR #1 comentado (8.2) | ✅ | Comentario ejecutivo publicado (CI PASS, web v2 READY+URL, Railway bloqueado, docs staging listas, prod intacta, merge no autorizado) (`phase-8-2-pr-update.md`). |
| 13e | Web v2 build (8.3) | ✅ | **Fase 8.3:** `smartsense-web-v2` build PASS verificado con logs (`Next.js 15.5.19`, `Compiled successfully in 18.6s`, `Build Completed`). Acceso público **BLOCKED-by-protection** (401 = Deployment Protection; canónica 404). Pasos UI para desbloquear en Settings → Deployment Protection del proyecto aislado (`phase-8-3-vercel-web-v2-access.md`). |
| 13f | Paquete API staging (8.3) | ✅ | **Fase 8.3:** `render.yaml` (Blueprint, start `tsx`, healthCheck `/health`) + `scripts/deploy-railway-staging.{sh,ps1}` + `scripts/verify-staging.mjs` + script root `verify:staging`. Runbooks Render/Railway/VPS (`phase-8-3-{render-blueprint,railway-staging,vps-api-staging}.md`). |
| 13g | API staging URL (8.3) | ⛔ | **Fase 8.3:** READY-BLOCKED por credenciales — `railway whoami` Unauthorized, `RAILWAY_TOKEN`/`flyctl`/`render`/`docker` ausentes; no se desplegó (no se inventó). Desbloqueo: `railway login`/`RAILWAY_TOKEN` o Render/VPS (`phase-8-3-api-staging-status.md`). |
| 13h | Smoke remoto (8.3) | ⛔ | **Fase 8.3:** depende de API staging URL. `STAGING_API_URL=<url> pnpm verify:staging` (`/health` + `/readyz` + smoke E2E). |
| 13i | PR #1 comentado (8.3) | ✅ | Comentario ejecutivo (web v2 build PASS+protection, aclaración dos proyectos, paquete API staging listo runtime `tsx`, prod intacta, no mergear) (`phase-8-3-pr-update.md`). |
| 14 | Build de imágenes Docker | ⛔ | BLOCKED por entorno local; se ejecuta en CI/host con Docker. |
| 15 | Producción NO tocada | ✅ | `master` sin cambios; Vercel producción `Ready`/intacta; settings de Vercel no modificados. |

## Resumen de estado

- **Listo (✅):** secret scan, migraciones dev, health/readyz local, smoke local, web build, DEMO_MODE, no-downlink, control dry-run, Neon dev identificado, rollback definido, **push de la rama**, **CI PASS**, **PR #1 abierto (sin merge) + comentado (8.2)**, **web v2 preview build (Vercel aislado, acceso tras owner-auth)**, **producción NO tocada**.
- **Bloqueado por credenciales de hosting / autorización (⛔):** deploy de API a staging (Railway sin auth), migrate staging, health/readyz remoto, smoke remoto, build de imágenes Docker.

> **Veredicto Fase 8.2:** **PARTIAL** — **web v2 preview build ✅** (Vercel aislado `smartsense-web-v2`, deployment READY; acceso tras owner-auth, 401 = Deployment Protection, no fallo de build); **API staging ⛔** (Railway sin auth: `whoami` Unauthorized, `RAILWAY_TOKEN` ausente bash+win — no se desplegó, no se inventó), y de ella dependen **smoke remoto ⛔**; **PR #1 comentado ✅**; **producción NO tocada ✅** (`smart-sense-demo` / `smartsense.c4a.cl` intactos, `master` sin cambios). Desbloqueo de API: `railway login` o `RAILWAY_TOKEN` (runbooks Railway/Render/VPS listos).
>
> **Veredicto Fase 8.3:** **PARTIAL robusto** — **web v2 build ✅** (PASS verificado con logs: `Next.js 15.5.19`, `Compiled successfully`, `Build Completed`; acceso **BLOCKED-by-protection**, pasos UI en `phase-8-3-vercel-web-v2-access.md`); **paquete API staging ✅** (`render.yaml` + `scripts/deploy-railway-staging.{sh,ps1}` + `verify:staging`, runtime **`tsx`**); **API staging URL ⛔** (credenciales: railway/fly/render/docker no disponibles/no auth — no se desplegó); **smoke remoto ⛔** (depende de URL); **PR #1 comentado ✅**; **producción NO tocada ✅**. Aclaración: el build fallido `No Next.js` es de `smart-sense-demo` (branch-previews desde la raíz), inofensivo, no se toca.
