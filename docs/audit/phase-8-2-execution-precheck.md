# Fase 8.2 — Precheck de ejecución (despliegue controlado)

> Fecha de verificación: **2026-06-06**. Solo documentación + actualización de specs. **No se tocó código.** Sin secretos (placeholders `USER:PASSWORD@HOST`, `<...>`).
> Alcance: confirmar el estado del repositorio, PR, CI y gates locales sobre este HEAD **antes** de ejecutar el despliegue controlado de Fase 8.2 (web v2 preview aislado + intento de API staging).

## 1. Estado del repositorio (HEAD)

| Item | Valor |
|---|---|
| Rama de release | `release/smartsense-f0-f7` |
| HEAD | `8244169` |
| Working tree | **LIMPIO** (sin cambios de código; solo docs/specs de esta fase) |
| Remoto | `origin` → `https://github.com/cherrera0001/smart-sense-demo.git` |
| Push de la rama | ✅ **pusheada** a `origin` (rama `release/smartsense-f0-f7`, **NO** master) |
| Default branch del repo | `master` (demo viejo que Vercel despliega a producción) |
| Autenticación | `gh` y `vercel` autenticados (scope `cherrera0001s-projects`); `railway` **NO** (ver `phase-8-2-railway-auth.md`) |

## 2. Pull Request

| Item | Valor |
|---|---|
| PR | **#1** abierto |
| Base ← Head | `master` ← `release/smartsense-f0-f7` |
| Merge | ❌ **NO** mergeado (solo revisión; merge no autorizado) |
| Riesgo de prod | Documentado en el body: `master` tiene la app Next en la raíz que Vercel despliega a producción |

## 3. CI previo

| Item | Valor |
|---|---|
| Workflow | **CI** — `.github/workflows/ci.yml` (on push) |
| Conclusión | ✅ **PASS** |
| Postgres | `postgres:16` efímero (sin TimescaleDB → fallback `DO/EXCEPTION`); **no usa Neon real** |

## 4. Gates locales (sobre este HEAD, sin cambios de código)

| Gate | Comando | Resultado |
|---|---|---|
| Secret-scan | `pnpm security:scan-secrets` | ✅ exit 0 (sin secretos versionados) |
| Typecheck (recursivo) | `pnpm typecheck -r` | ✅ verde |
| Tree limpio | `git status --porcelain` | ✅ sin cambios de código |
| Tests API | `pnpm --filter @smartsense/api test` | ✅ **156/156** |
| Tests DB | `pnpm test:db:external` (Neon dev) | ✅ **18/18** |
| Tests iot-bridge | `pnpm --filter @smartsense/iot-bridge test` | ✅ **23/23** |
| Smoke API local | `pnpm smoke:api` (API real + Neon dev) | ✅ **7 pasos OK** |

## 5. Producción

| Item | Estado |
|---|---|
| Proyecto Vercel productivo `smart-sense-demo` / `smartsense.c4a.cl` | **INTACTO** (no se tocó el proyecto ni su dominio) |
| Cambios a `master` | **NINGUNO** (no merge, no force-push) |

> **Conclusión:** repositorio, PR #1, CI y gates locales **LISTOS** sobre HEAD `8244169`. Habilita la ejecución de Fase 8.2: web v2 preview en proyecto Vercel **aislado** (`phase-8-2-vercel-web-v2-preview.md`) e intento de API staging (bloqueado por credenciales — `phase-8-2-railway-auth.md`, `phase-8-2-api-staging-railway.md`). Producción no tocada.
