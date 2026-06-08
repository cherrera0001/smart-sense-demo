# Fase 8.1 — Precheck de Staging Deployment Verification

> Fecha de verificación: **2026-06-06**. Solo documentación + actualización de specs. **No se tocó código.**
> Alcance: verificar el estado del repositorio, CI y validación local antes de intentar el despliegue de staging. Sin secretos (placeholders `USER:PASSWORD@HOST`).

## 1. Estado del repositorio (HEAD)

| Item | Valor |
|---|---|
| Rama de release | `release/smartsense-f0-f7` |
| HEAD | `babfb68` (+ commits de documentación de Fase 8.1 en curso) |
| Working tree | **LIMPIO** antes de los docs de esta fase (sin cambios de código) |
| Remoto | `origin` → `https://github.com/cherrera0001/smart-sense-demo.git` |
| Push de la rama | ✅ **pusheada** a `origin` (rama `release/smartsense-f0-f7`, **NO** master) |
| Default branch del repo | `master` (demo viejo que Vercel despliega a producción) |
| Autenticación | `gh` y `vercel` autenticados como `cherrera0001` |

## 2. CI previo

| Item | Valor |
|---|---|
| Workflow | **CI** — `.github/workflows/ci.yml` (on push) |
| Run | `27052719013` |
| Conclusión | ✅ **PASS** (success) |
| URL | `https://github.com/cherrera0001/smart-sense-demo/actions/runs/27052719013` |
| Postgres | `postgres:16` efímero (sin TimescaleDB → fallback `DO/EXCEPTION`); **no usa Neon real** |

## 3. Gates locales (sobre este HEAD, sin cambios de código)

| Gate | Comando | Resultado |
|---|---|---|
| Secret-scan | `pnpm security:scan-secrets` | ✅ exit 0 (sin secretos versionados) |
| Typecheck (recursivo) | `pnpm typecheck -r` | ✅ verde |
| Build API | `pnpm build:api` | ✅ |
| Build Web | `pnpm build:web` | ✅ (demo `DEMO_MODE`) |
| Tests API | `pnpm --filter @smartsense/api test` | ✅ **156/156** |
| Tests DB | `pnpm test:db:external` (Neon dev) | ✅ **18/18** |
| Tests iot-bridge | `pnpm --filter @smartsense/iot-bridge test` | ✅ **23/23** |
| Smoke API local | `pnpm smoke:api` (API real + Neon dev) | ✅ **7 pasos OK** |

## 4. Producción

| Item | Estado |
|---|---|
| Vercel producción | **INTACTA** (deploy `Ready` de hace ~38 días) |
| Cambios a `master` | **NINGUNO** (no merge, no force-push) |
| Settings de Vercel (Root Directory, vars) | **NO modificados** |

> **Conclusión:** repositorio, CI y validación local **LISTOS**. Producción **no tocada**. El precheck habilita los pasos de staging (migrate / health / smoke / Vercel preview), que dependen de credenciales de hosting y/o autorización (ver docs siguientes de Fase 8.1).
