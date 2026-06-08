# Fase 8.2 — Runbook de cutover a producción (EXIGENTE)

> Fecha: **2026-06-06**. Actualizado **2026-06-08 (Fase 8.4)**. Solo documentación. Sin secretos (placeholders).
> **El merge de PR #1 y el cutover NO están autorizados todavía.** Este runbook define el orden estricto y los checklists que **deben** pasar antes, durante y para revertir. Nada destructivo sin backup.
>
> **OBSOLETO (Fase 8.4) — host de la API:** la API **ya no se despliega en un host Node persistente** (Railway/Render/Fly/VPS) ni como imagen Docker. Corre como **Vercel Serverless Function** (proyecto Vercel aislado `smartsense-api-v2`, alias estable `https://smartsense-api-v2.vercel.app`, SSO/Deployment Protection desactivado). Donde este runbook diga "desplegar API en Railway/Render/VPS" o "arrancar con `tsx`/`node` en servidor", léase **deploy en Vercel** (`vercel deploy --prod`, bundle esbuild + Prisma `rhel-openssl-3.0.x`, env vars en el proyecto Vercel). Verificado: `/health` 200, `/readyz` 200 (`db: ok`), smoke remoto 7/7. La API de staging/producción ya está PASS; lo que resta del cutover es **la web de producción**. Detalle: `docs/deployment/phase-8-4-vercel-serverless-api.md`.

## 1. Orden estricto (no saltar pasos)

1. **Validar web v2 preview** (`smartsense-web-v2` READY; acceso owner OK; opcionalmente público).
2. ~~**Desplegar API staging** (Railway / Render / VPS)~~ — **OBSOLETO (Fase 8.4):** la API ya corre en **Vercel Serverless** (`smartsense-api-v2.vercel.app`). Validar que el deployment está activo (`vercel ls` / `vercel inspect`) en vez de desplegar un host persistente.
3. **Smoke remoto** contra la API Vercel (`STAGING_API_URL=https://smartsense-api-v2.vercel.app pnpm verify:staging`: `/health`, `/readyz`, smoke 7/7).
4. **Recién entonces** aprobar y ejecutar el **merge de PR #1** (manual, autorizado).
5. **Tras el merge**, reconfigurar Vercel **producción (web)**: Root Directory = `apps/web` **o** mover el dominio `smartsense.c4a.cl` al proyecto nuevo.
6. **Desplegar/promover la API de producción en Vercel** (`vercel deploy --prod` del proyecto `smartsense-api-v2`; env de prod) + migrate deploy contra Neon prod (`DIRECT_URL`) + verificación.
7. Mantener **rollback** preparado en todo momento.

> El orden importa: la web v2 y la API (Vercel Serverless) deben estar verdes **antes** de tocar `master`/Vercel producción, porque el merge cambia lo que Vercel construye en la raíz.

## 2. Checklist ANTES del cutover (todos ✅ obligatorios)

- [ ] **CI PASS** sobre el HEAD a mergear.
- [ ] **secret-scan** exit 0 (sin secretos versionados).
- [ ] **Web v2 preview PASS** (deployment READY; accesible por owner; público si se requiere).
- [ ] **API (Vercel Serverless) PASS** (deployment activo en `smartsense-api-v2`; `/health` 200; `/readyz` 200 `db: ok`). *(OBSOLETO: "API staging Railway/Render/VPS".)*
- [ ] **Smoke remoto PASS** (`STAGING_API_URL=https://smartsense-api-v2.vercel.app pnpm verify:staging` 7/7).
- [ ] **Backup de Neon** (prod) tomado y verificado (snapshot/branch restaurable).
- [ ] **Variables de producción** definidas (API y web), sin placeholders.
- [ ] **CORS final** = dominio web de producción (sin wildcard, `NODE_ENV=production`).
- [ ] **`NEXT_PUBLIC_API_URL` final** = URL de la API de producción.
- [ ] **Control en dry-run** confirmado (acciones persisten `dry_run=true`).
- [ ] **Downlink IoT físico desactivado** (iot-bridge dry-run; sin broker MQTT).
- [ ] **Merge de PR #1 autorizado** explícitamente por el owner.

## 3. Checklist DURANTE el cutover

- [ ] **Merge manual** de PR #1 (autorizado) → `master`.
- [ ] **Vercel producción:** Root Directory = `apps/web` **o** mover el dominio `smartsense.c4a.cl` al proyecto nuevo (`smartsense-web-v2` promovido a prod). Una sola estrategia, no ambas a medias.
- [ ] **API de producción** desplegada/promovida en **Vercel** (`vercel deploy --prod` de `smartsense-api-v2`) con vars de prod (JWT fuertes, `CORS_ORIGIN` final sin `\n`, `DATABASE_URL` pooled Neon prod, `DIRECT_URL` para migraciones).
- [ ] **migrate deploy** contra Neon **producción** (`pnpm db:migrate:deploy` usando `DIRECT_URL`; idempotente; no `dev`).
- [ ] **Verificación:** `/health` 200, `/readyz` 200 `db: ok`, `STAGING_API_URL=<prod-url> pnpm verify:staging` 7/7 contra producción.
- [ ] **Logs** sin errores tras el corte (API y web).
- [ ] Web de producción carga y consume la API de producción.

## 4. Checklist ROLLBACK (si algo falla)

- [ ] **Vercel:** revertir al deployment de producción anterior (promote del último READY estable) o restaurar Root Directory previo / dominio al proyecto original.
- [ ] **API:** revertir al deployment Vercel anterior del proyecto `smartsense-api-v2` (promote del último deployment estable / `vercel rollback`). *(OBSOLETO: "revertir a la imagen Docker anterior".)*
- [ ] **DNS:** revertir el dominio `smartsense.c4a.cl` al destino previo si se movió.
- [ ] **NO ejecutar migraciones destructivas** (down) — las migraciones F0–F7 son aditivas; un revert de código convive con el esquema nuevo.
- [ ] **Restaurar backup de Neon** **solo si corresponde** (corrupción/pérdida de datos confirmada) — no como primer recurso.
- [ ] Verificar producción estable post-rollback (`/health`, web carga, smoke).

## 5. Notas

- El cutover **no** se inicia hasta tener web v2 ✅ + API (Vercel Serverless) ✅ + smoke remoto ✅ + backup Neon ✅ + autorización de merge. *(La API ya está ✅ en Vercel; lo pendiente es la web de producción.)*
- Mientras tanto, el estado vigente es **Fase 8.4 = API en Vercel Serverless PASS; cutover web PENDIENTE** (ver `release-checklist.md` y `docs/deployment/phase-8-4-vercel-serverless-api.md`).
- **OBSOLETO (Fase 8.4) — Runtime de la API:** el arranque en host persistente (`pnpm --filter @smartsense/api exec tsx src/server.ts`, `node dist/server.js` o `railway up`) **ya no aplica**. La API corre como **Vercel Serverless Function**: la app Fastify se monta en un handler serverless (`api/index.ts`) y se pre-empaqueta con esbuild (`scripts/bundle-api.mjs` → `api/server.mjs`, `@smartsense/*` inlineados, `@prisma/client` external, `binaryTargets` `rhel-openssl-3.0.x`). Deploy: `vercel deploy --prod`. El `installCommand` usa `pnpm install --frozen-lockfile --prod=false` (para no podar devDeps `prisma`/`esbuild` en build).
- **OBSOLETO (Fase 8.3) — Paquete de staging en host persistente:** `render.yaml`, `scripts/deploy-railway-staging.{sh,ps1}` y los runbooks Railway/Render/VPS quedan **superseded** por Vercel Serverless; se conservan solo como historia. La verificación de staging y la del cutover productivo usan `STAGING_API_URL=<url> pnpm verify:staging` (donde `<url>` = `https://smartsense-api-v2.vercel.app` o el deployment de prod).
