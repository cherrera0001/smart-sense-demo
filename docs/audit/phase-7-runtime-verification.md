# Fase 7 — Verificación de Runtime (Hardening · contra Neon)

> Fecha: 2026-06-04 · Rama: `feat/phase-7-hardening`.
> Registra los resultados **reales** de la verificación de Fase 7 contra Postgres real (Neon dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`, **nueva credencial** tras rotación). Cubre seguridad (helmet/cors/rate-limit/env/secret-scan), auth hardening (refresh-token rotation), health/readiness, smoke y suites complementarias. **Sin downlink físico ni MQTT.**

## Entorno

- **DB:** Neon Postgres dev, `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled/directa), **credencial rotada en Fase 7**. **Migración aditiva 0004** (`refresh_tokens`) aplicada (`migrate deploy` OK); no altera enums ni datos de Fases 1–6.
- **Comando base:** `set -a; . packages/db/.env; set +a; pnpm db:migrate:deploy; pnpm --filter @smartsense/api test`.
- **Resultado global API:** **156/156 PASS** (140 de Fase 6 + security 7 + health 2 + auth-refresh 7).

## Seguridad — resultados verificados

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | Secret-scan | `pnpm security:scan-secrets` → **exit 0**; sin secretos versionados | ✅ |
| 2 | Rotación Neon | `ALTER ROLE` ejecutado; contraseña vieja **ya no funciona**; `prisma migrate status` OK con la nueva | ✅ |
| 3 | Helmet | `x-content-type-options: nosniff` presente en respuesta real | ✅ |
| 4 | CORS allow | origen en `CORS_ORIGINS` → permitido | ✅ |
| 5 | CORS deny | origen no listado → rechazado; **wildcard rechazado en producción** | ✅ |
| 6 | Rate-limit | global 300/min + estricto en auth/control → **429** al exceder | ✅ |
| 7 | Env prod (JWT) | `loadConfig` **rechaza** `JWT_SECRET`/`JWT_REFRESH_SECRET` débil/ausente en producción | ✅ |
| 8 | Env prod (CORS) | `loadConfig` **rechaza** CORS wildcard en producción | ✅ |
| 9 | Redacción logs | `authorization`/`cookie`/tokens/`DATABASE_URL` salen `[REDACTED]` | ✅ |

> Los casos 3–8 corresponden a los **7 tests de security** de la suite API (incluye allow/deny CORS y los dos rechazos de `env.ts` en producción).

## Auth hardening (refresh-token rotation) — resultados verificados

> **7 tests de auth-refresh** en la suite API.

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | register/login shape | devuelven `token` (access) + `refresh_token`; shape previo conservado | ✅ |
| 2 | access sin passwordHash | el access nunca incluye `passwordHash` | ✅ |
| 3 | POST `/auth/refresh` | rota el refresh (emite nuevo, revoca el usado); access nuevo 15m | ✅ |
| 4 | reuso de refresh revocado | → **401** | ✅ |
| 5 | revocación de árbol | reuso de refresh revocado **revoca el árbol** completo | ✅ |
| 6 | logout | revoca el refresh activo | ✅ |
| 7 | persistencia | `refresh_tokens` con `jti` + `token_hash` sha256 (migración 0004) | ✅ |

## Health / Readiness — resultados verificados

> **2 tests de health** en la suite API.

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | `/health` y `/healthz` | liveness `{ status, service, version, timestamp, uptime_s }`; sin auth, sin DB; sin secretos | ✅ |
| 2 | `/readyz` | `SELECT 1` → `status: ready`/`db: ok`; **503 degraded** si la DB falla | ✅ |

## Smoke — contra API real + Neon

`pnpm smoke:api` → **7 pasos OK**:

| # | Paso | Resultado |
|---|---|---|
| 1 | health | ✅ |
| 2 | register | ✅ |
| 3 | login | ✅ |
| 4 | installation | ✅ |
| 5 | dashboard | ✅ |
| 6 | alerts | ✅ |
| 7 | recommendations | ✅ |

## Suites complementarias y gates de build

| Suite / Gate | Resultado | Comando |
|---|---|---|
| API | **156/156 PASS** (15 archivos) | `pnpm --filter @smartsense/api test` |
| iot-bridge | **23/23 PASS** (dry-run, sin downlink) | `pnpm --filter @smartsense/iot-bridge test` |
| DB (Fase 1) | **18/18 PASS** | `pnpm test:db:external` |
| Typecheck | ✅ 0 errores | `pnpm -r typecheck` |
| Build API | ✅ | `pnpm build:api` |
| Build Web | ✅ (12 rutas, DEMO_MODE) | `pnpm build:web` |
| Lint | ✅ (1 warning preexistente `Step2PairingLeds.tsx:35`) | `pnpm -r lint` |

## Docker — BLOCKED por entorno

- **Build de imágenes (api/web) = BLOCKED** — Docker **no disponible** en la máquina local. Los Dockerfiles multi-stage (`apps/api/Dockerfile`, `apps/web/Dockerfile`) y `.dockerignore` (no copia `.env`) están **creados y listos**; la construcción debe ejecutarse en CI / un host con Docker.
- **BLOCKED de entorno ≠ FAIL**: no afecta el PASS del código (consistente con los estados canónicos de `runtime-gates.md`).

## Veredicto

Runtime de Fase 7 verificado contra Neon real: **rotación del secreto ejecutada** (vieja inválida), **secret-scan exit 0**, **API 156/156** (security 7/7 — helmet `nosniff`, CORS allow/deny, rate-limit 429, env-prod rechaza JWT débil y CORS wildcard; health 2/2; auth-refresh 7/7 — rotación + reuso 401 + revocación de árbol + logout), **smoke 7/7**, builds/typecheck/lint/iot-bridge/DB verdes. **Docker image build = BLOCKED por entorno (documentado, no FAIL).** **Fase 7 PASS en runtime.**
