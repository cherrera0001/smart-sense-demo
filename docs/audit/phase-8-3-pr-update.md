# Fase 8.3 — Actualización de PR #1 (comentario ejecutivo)

> Fecha: **2026-06-06**. Solo documentación. **No se mergeó.** Sin secretos.
> Registra el comentario ejecutivo publicado en **PR #1** (`master` ← `release/smartsense-f0-f7`) tras la ejecución de Fase 8.3.

## 1. Contexto del PR

| Item | Valor |
|---|---|
| PR | **#1** |
| Base ← Head | `master` ← `release/smartsense-f0-f7` |
| Estado | **abierto, sin merge** (merge **NO autorizado**) |

## 2. Comentario ejecutivo publicado (resumen Fase 8.3)

- **Web v2 (Vercel):** ✅ **BUILD PASS** verificado con logs reales — proyecto **aislado** `smartsense-web-v2`: `▲ Next.js 15.5.19`, `✓ Compiled successfully in 18.6s`, `Build Completed [1m]`. La URL del deployment devuelve **HTTP 401 = Deployment Protection** (SSO de equipo), **no** fallo de build; la canónica devuelve **404** (alias prod no servido bajo protección). **Acceso público = BLOCKED-BY-PROTECTION** (desbloqueable en Settings → Deployment Protection del proyecto aislado).
- **Aclaración (dos proyectos):** el build fallido `No Next.js version detected` (build desde la **raíz**, `Scope: all 6 workspace projects`, commit `049a67e`) es de **`smart-sense-demo`** (productivo, git-conectado): sus **branch-previews** fallan por construir desde la raíz del monorepo. Son **INOFENSIVOS** para su producción (sigue `Ready`) y **no se tocan** (desactivarlos tocaría settings del proyecto productivo). **No confundir** con `smartsense-web-v2`, que **sí buildea bien**.
- **API staging — paquete listo:** ✅ `render.yaml` (Render Blueprint, `smartsense-api-staging`, healthCheck `/health`, **start `tsx`**), ✅ `scripts/deploy-railway-staging.{sh,ps1}` (no interactivos, fallan claro sin auth), ✅ `scripts/verify-staging.mjs` + script root `verify:staging` (`/health` + `/readyz` + smoke E2E). Runbooks Render / Railway / VPS.
- **API staging — estado:** ⛔ **READY-BLOCKED por credenciales** — Railway `whoami` Unauthorized, `RAILWAY_TOKEN` ausente; `flyctl`/`render`/`docker` ausentes. **No se desplegó (no se inventó).** Sin URL → smoke remoto pendiente.
- **Runtime:** la API arranca con **`tsx`** (`pnpm --filter @smartsense/api exec tsx src/server.ts`), **no** `node dist/server.js`, porque `@smartsense/db`/`@smartsense/shared` se consumen como fuente TypeScript. render.yaml y los scripts ya lo reflejan.
- **Producción:** ✅ **NO tocada** — `smart-sense-demo` / `smartsense.c4a.cl` intactos; `master` sin cambios.
- **Merge:** ❌ **no autorizado** — no mergear hasta cutover (ver `docs/deployment/phase-8-2-production-cutover-runbook.md`).

## 3. Veredicto comunicado

**Fase 8.3 = PARTIAL robusto.** Paquete de staging ejecutable listo (render.yaml + scripts + `verify:staging`, runtime `tsx`); **web v2 build PASS** + acceso bloqueado por Deployment Protection; **API staging sin URL** por falta de credenciales externas. **Producción no tocada. No mergear.**

> Evidencia: `docs/audit/phase-8-3-{precheck,vercel-web-v2-access,api-staging-status}.md`, `docs/deployment/phase-8-3-{render-blueprint,railway-staging,vps-api-staging}.md`.
