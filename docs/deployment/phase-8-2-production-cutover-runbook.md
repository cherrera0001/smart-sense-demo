# Fase 8.2 — Runbook de cutover a producción (EXIGENTE)

> Fecha: **2026-06-06**. Solo documentación. Sin secretos (placeholders).
> **El merge de PR #1 y el cutover NO están autorizados todavía.** Este runbook define el orden estricto y los checklists que **deben** pasar antes, durante y para revertir. Nada destructivo sin backup.

## 1. Orden estricto (no saltar pasos)

1. **Validar web v2 preview** (`smartsense-web-v2` READY; acceso owner OK; opcionalmente público).
2. **Desplegar API staging** (Railway / Render / VPS) — requiere desbloquear credenciales.
3. **Smoke remoto** contra staging (`/health`, `/readyz`, `pnpm smoke:api` 7/7).
4. **Recién entonces** aprobar y ejecutar el **merge de PR #1** (manual, autorizado).
5. **Tras el merge**, reconfigurar Vercel **producción**: Root Directory = `apps/web` **o** mover el dominio `smartsense.c4a.cl` al proyecto nuevo.
6. **Desplegar API de producción** + migrate deploy + verificación.
7. Mantener **rollback** preparado en todo momento.

> El orden importa: la web v2 y la API staging deben estar verdes **antes** de tocar `master`/Vercel producción, porque el merge cambia lo que Vercel construye en la raíz.

## 2. Checklist ANTES del cutover (todos ✅ obligatorios)

- [ ] **CI PASS** sobre el HEAD a mergear.
- [ ] **secret-scan** exit 0 (sin secretos versionados).
- [ ] **Web v2 preview PASS** (deployment READY; accesible por owner; público si se requiere).
- [ ] **API staging PASS** (deployment activo; `/health` 200; `/readyz` 200 `db: ok`).
- [ ] **Smoke remoto PASS** (`API_BASE_URL=<STAGING> pnpm smoke:api` 7/7).
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
- [ ] **API de producción** desplegada con vars de prod (JWT fuertes, CORS final, Neon prod).
- [ ] **migrate deploy** contra Neon **producción** (`pnpm db:migrate:deploy`; idempotente; no `dev`).
- [ ] **Verificación:** `/health` 200, `/readyz` 200 `db: ok`, `pnpm smoke:api` 7/7 contra producción.
- [ ] **Logs** sin errores tras el corte (API y web).
- [ ] Web de producción carga y consume la API de producción.

## 4. Checklist ROLLBACK (si algo falla)

- [ ] **Vercel:** revertir al deployment de producción anterior (promote del último READY estable) o restaurar Root Directory previo / dominio al proyecto original.
- [ ] **API:** revertir a la imagen/commit anterior (redeploy del release previo).
- [ ] **DNS:** revertir el dominio `smartsense.c4a.cl` al destino previo si se movió.
- [ ] **NO ejecutar migraciones destructivas** (down) — las migraciones F0–F7 son aditivas; un revert de código convive con el esquema nuevo.
- [ ] **Restaurar backup de Neon** **solo si corresponde** (corrupción/pérdida de datos confirmada) — no como primer recurso.
- [ ] Verificar producción estable post-rollback (`/health`, web carga, smoke).

## 5. Notas

- El cutover **no** se inicia hasta tener web v2 ✅ + API staging ✅ + smoke remoto ✅ + backup Neon ✅ + autorización de merge.
- Mientras tanto, el estado vigente es **Fase 8.2 = PARTIAL** (ver `release-checklist.md`).
