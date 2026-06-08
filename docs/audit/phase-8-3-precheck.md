# Fase 8.3 — Precheck del paquete de despliegue staging

> Fecha de verificación: **2026-06-06**. Solo documentación + specs. **No se tocó código/scripts/render.yaml** (ya creados en este HEAD).
> Alcance: dejar registrado el estado del repositorio, PR, CI y gates locales antes de documentar el paquete de staging (render.yaml + scripts + `verify:staging`). Sin secretos (placeholders).

## 1. Estado del repositorio (HEAD)

| Item | Valor |
|---|---|
| Rama de release | `release/smartsense-f0-f7` |
| Remoto | `origin` → `https://github.com/cherrera0001/smart-sense-demo` |
| Default branch del repo | `master` (demo viejo que Vercel despliega a producción) |
| PR | **#1** abierto (base `master` ← head `release/smartsense-f0-f7`) — **sin merge** (merge NO autorizado) |
| Working tree (código de app) | **LIMPIO** — solo se añadieron artefactos de despliegue (`render.yaml`, `scripts/deploy-railway-staging.{sh,ps1}`, `scripts/verify-staging.mjs`, script root `verify:staging`); sin cambios en `apps/`/`packages/` |

## 2. Árbol relevante (artefactos de Fase 8.3, ya creados)

| Artefacto | Propósito |
|---|---|
| `render.yaml` | Render Blueprint del servicio `smartsense-api-staging` (solo `apps/api`) |
| `scripts/verify-staging.mjs` | Verificación remota `STAGING_API_URL` → `/health` + `/readyz` + smoke E2E (exit 1 si falla) |
| `scripts/deploy-railway-staging.sh` / `.ps1` | Deploy no interactivo a Railway (falla claro sin auth/token) |
| script root `verify:staging` | `node scripts/verify-staging.mjs` |

> **Runtime de la API = `tsx`** (no `node dist/server.js`): `@smartsense/db` y `@smartsense/shared` se consumen como **fuente TypeScript** (sus `package.json#exports` apuntan a `./src/*.ts`). Arrancar con node sobre dist fallaría al resolver esos imports `.ts`. render.yaml y los scripts usan `pnpm --filter @smartsense/api exec tsx src/server.ts`.

## 3. CI previo

| Item | Valor |
|---|---|
| Workflow | **CI** — `.github/workflows/ci.yml` (on push) |
| Conclusión | ✅ **PASS** (postgres:16 efímero; sin TimescaleDB → fallback `DO/EXCEPTION`; no usa Neon real) |
| secret-scan | ✅ **limpio** (`pnpm security:scan-secrets` exit 0) |

## 4. Gates locales (sobre este HEAD; sin cambios de código de app)

| Gate | Comando | Resultado |
|---|---|---|
| Secret-scan | `pnpm security:scan-secrets` | ✅ exit 0 (sin secretos versionados) |
| Typecheck (recursivo) | `pnpm typecheck -r` | ✅ verde |
| Tests API | `pnpm --filter @smartsense/api test` | ✅ **156/156** |
| Tests DB | `pnpm test:db:external` (Neon dev) | ✅ **18/18** |
| Tests iot-bridge | `pnpm --filter @smartsense/iot-bridge test` | ✅ **23/23** |

## 5. Producción

| Item | Estado |
|---|---|
| Vercel producción (`smart-sense-demo` / `smartsense.c4a.cl`) | **INTACTA** (no tocada) |
| Cambios a `master` | **NINGUNO** (no merge, no force-push) |
| Settings de Vercel del proyecto productivo | **NO modificados** |

> **Conclusión:** repositorio, PR #1, CI y gates locales **LISTOS**. El paquete de staging (render.yaml + scripts + `verify:staging`) está creado y verificado en cuanto a su definición; su **ejecución remota** depende de credenciales de hosting (ver `phase-8-3-api-staging-status.md`). Producción **no tocada**.
