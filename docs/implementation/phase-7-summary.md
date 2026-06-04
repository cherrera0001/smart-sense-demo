# Fase 7 — Resumen de Implementación (Hardening · Seguridad · CI/CD · Observabilidad · Despliegue)

> Fecha: 2026-06-04 · Rama: `feat/phase-7-hardening` · Monorepo `smartsense-brownfield`.
> Endurece el plano backend de Fases 1–6 sobre Neon real: **rotación real del secreto Neon**, plugins de seguridad Fastify (helmet/cors/rate-limit), hardening de configuración (`env.ts`), **rotación de refresh-token** (migración aditiva 0004), logger redactado, endpoints de salud/readiness, pipeline **CI (GitHub Actions)**, **Dockerfiles** multi-stage, **secret-scan** y **smoke** de API, y documentación de observabilidad. **No se agregaron features de negocio; `apps/web` sigue en DEMO_MODE.** **Sin downlink físico ni MQTT.**

## Qué se implementó

### Seguridad

- **Rotación REAL del secreto Neon.** La contraseña del rol Neon (`neondb_owner`) que circuló por chat en Fase 1.4 fue **invalidada** vía `ALTER ROLE … WITH PASSWORD '<nueva>'` (conexión autenticada). La nueva credencial vive **solo** en `packages/db/.env` (gitignored); la vieja **ya no funciona** (verificado con `prisma migrate status`). Detalle: `docs/security/phase-7-secret-rotation.md`.
- **Secret-scan limpio.** `pnpm security:scan-secrets` (`scripts/secret-scan.mjs`) → **exit 0**; ningún secreto en archivos versionados (solo placeholders en `.env.example`).
- **`@fastify/helmet`** (`apps/api/src/plugins/security-headers.ts`): cabeceras de seguridad; `x-content-type-options: nosniff` verificado en respuesta real.
- **`@fastify/cors`** (`apps/api/src/plugins/cors.ts`): origen controlado por `CORS_ORIGINS`; en producción **rechaza wildcard** (`*`).
- **`@fastify/rate-limit`** (`apps/api/src/plugins/rate-limit.ts`): global **300/min** + límite **estricto** en `/auth/login`, `/auth/register` y `POST` de control-actions; **429** verificado.
- **Hardening de config** (`apps/api/src/config/env.ts`): `loadConfig` puro; **rechaza** `JWT_SECRET`/`JWT_REFRESH_SECRET` débiles o ausentes y **CORS wildcard** en producción (verificado).
- **Logger redactado** (`apps/api/src/config/logger.ts`): pino con `redact.paths` → `[REDACTED]` para `authorization`/`cookie`/`password`/`passwordHash`/tokens/`refresh_token`/`DATABASE_URL`/`DIRECT_URL`/`JWT_SECRET`/`JWT_REFRESH_SECRET`/`MQTT_PASSWORD`/`SMARTSENSE_API_TOKEN`. El serializer de `req` solo emite `method`/`url`/`id`.

### Auth hardening — rotación de refresh-token

- **Migración aditiva 0004** (`packages/db/prisma/migrations/0004_phase7_refresh_tokens/`): tabla `refresh_tokens` (jti + `token_hash` sha256 + árbol de rotación). Aplicada a Neon con `migrate deploy` OK. **No altera enums ni datos** de Fases 1–6.
- **Access token 15m**, **refresh token 7d** con `jti` + `token_hash` (sha256).
- **POST `/auth/refresh`** rota el refresh (emite uno nuevo, revoca el usado).
- **Reuso de refresh revocado → 401** + **revocación del árbol** completo (defensa anti-replay).
- **Logout** revoca el refresh.
- `register`/`login` devuelven `token` (access) + `refresh_token`; **shape previo conservado** (retrocompatible). El access **nunca** incluye `passwordHash`.

### Health / Readiness

- **`GET /health`** y **`GET /healthz`** (liveness): `{ status, service, version, timestamp, uptime_s }`; sin auth, sin DB.
- **`GET /readyz`** (readiness): `SELECT 1` → `status: ready`/`db: ok`; **503 degraded** si la DB falla. Sin secretos.
- Implementados en `apps/api/src/health.ts`. Verificados contra Neon.

### CI/CD

- **`.github/workflows/ci.yml`**: service `postgres:16` (sin TimescaleDB → fallback `DO/EXCEPTION`); pnpm; secuencia `secret-scan → typecheck → lint → build (api/web/iot-bridge) → migrate:deploy + seed + test:db:external`. **No usa Neon real** (DB efímera del runner).
- **Dockerfiles multi-stage**: `apps/api/Dockerfile` y `apps/web/Dockerfile` + `.dockerignore` (no copia `.env`).
- **Scripts root**: `security:scan-secrets`, `smoke:api`, `ci:verify`, `ci:test:db` (+ `scripts/secret-scan.mjs`, `scripts/smoke-api.mjs`).

### Observabilidad

- `docs/observability/phase-7-observability.md`: logging redactado (pino JSON), `x-request-id` (correlación request→logs), auditoría append-only (`audit_logs`), métricas mínimas vía logs. **`/metrics` Prometheus y tracing OpenTelemetry diferidos** (documentado).

### Smoke

- `pnpm smoke:api` (`scripts/smoke-api.mjs`) contra la API real + Neon → **7 pasos OK**: health, register, login, installation, dashboard, alerts, recommendations.

## Qué NO se implementó (fase futura)

- **Features de negocio nuevas** — ninguna; el alcance fue transversal (endurecimiento).
- **Downlink físico real / MQTT downlink productivo** — diferido (canal IoT autenticado por kit; precondiciones en `docs/security/phase-6-control-safety.md`).
- **`/metrics` Prometheus** y **tracing distribuido (OpenTelemetry)** — diferidos (ver observabilidad).
- **UI productiva** (`apps/web` sigue DEMO_MODE; no consume la API).
- **Build de imágenes Docker local** — **BLOCKED por entorno** (Docker no disponible localmente); los Dockerfiles están creados y listos para CI (no es FAIL).
- **Políticas Timescale** (compresión/retención) — N/A en Neon (sin Timescale).

## Seguridad (resumen)

| Control | Mecanismo | Estado |
|---|---|---|
| Rotación de secreto Neon | `ALTER ROLE` (vieja invalidada) | ✅ ejecutada |
| Secret-scan | `pnpm security:scan-secrets` | ✅ exit 0 |
| CORS prod | sin wildcard (`CORS_ORIGINS`) | ✅ rechaza `*` |
| JWT fuerte prod | `env.ts` rechaza débil/ausente | ✅ |
| Rate-limit | global 300/min + estricto auth/control | ✅ 429 |
| Cabeceras | helmet (`nosniff` verificado) | ✅ |
| Redacción de logs | pino `redact.paths` | ✅ |

## Auth hardening (resumen)

Access 15m + refresh 7d con `jti`+`token_hash` sha256; `POST /auth/refresh` rota; reuso de refresh revocado → 401 + revoca árbol; logout revoca; `register`/`login` devuelven `token`+`refresh_token` (shape conservado); access sin `passwordHash`. Migración aditiva 0004 (`refresh_tokens`) aplicada a Neon.

## Health (resumen)

`/health` y `/healthz` (liveness con `status/service/version/timestamp/uptime_s`); `/readyz` (readiness con `SELECT 1`; 503 degraded si falla). Sin secretos. Verificados contra Neon.

## CI (resumen)

`.github/workflows/ci.yml`: `secret-scan → typecheck → lint → build api/web/iot-bridge → migrate:deploy + seed + test:db:external` sobre `postgres:16` efímero (no Neon). Dockerfiles api/web + `.dockerignore`.

## Docker

Dockerfiles multi-stage de api y web creados (no copian `.env`, vía `.dockerignore`). **Build local de imágenes = BLOCKED por entorno** (Docker no disponible en la máquina); listos para construirse en CI. **BLOCKED de entorno ≠ FAIL**: no afecta el PASS del código.

## Smoke (resumen)

`pnpm smoke:api` contra API real + Neon → 7 pasos OK (health/register/login/installation/dashboard/alerts/recommendations).

## Tests

- **API: 156/156 PASS** contra Neon real (15 archivos; +security 7, health 2, auth-refresh 7 sobre los 140 de Fase 6).
- **iot-bridge: 23/23 PASS** (sin cambios; dry-run, sin downlink).
- **DB: 18/18 PASS** (suite `db` contra Neon).
- `typecheck -r` ✅; `build:api`/`build:web` ✅ (web 12 rutas demo intacta bajo DEMO_MODE); `lint` ✅ (**1 warning preexistente** `Step2PairingLeds.tsx:35`).

## Riesgos abiertos / limitaciones

1. **Build de imágenes Docker no ejecutado localmente** (BLOCKED por entorno): los Dockerfiles están listos pero la construcción real debe verificarse en CI / un host con Docker.
2. **Control físico real sigue diferido**: Fase 7 endurece la autorización pero **no** abre downlink; precondiciones en `docs/security/phase-6-control-safety.md`.
3. **`/metrics` Prometheus y tracing OpenTelemetry diferidos**: hoy las métricas se derivan de logs estructurados.
4. **CI usa Postgres efímero, no Neon**: la verificación contra Neon es local (tests + smoke). El pipeline valida portabilidad de migración/seed/tests, no la instancia productiva.
5. **`apps/web` en DEMO_MODE**: la UI no consume la API endurecida (clientes preparatorios, no usados).
6. **Warning de lint preexistente** (deuda demo, no bloqueante).
7. **Superset OpenAPI**: los endpoints nuevos de Fase 7 (`/auth/refresh`, `/healthz`, `/readyz`) son adición sobre el contrato original (ver `docs/audit/phase-7-openapi-implementation-audit.md`); el `openapi.yaml` no se reescribió masivamente.

## Comandos para reproducir

```bash
pnpm install
pnpm security:scan-secrets        # exit 0 (sin secretos versionados)
pnpm -r typecheck
pnpm -r lint                      # 1 warning preexistente demo
pnpm build:api
pnpm build:web                    # demo (12 rutas, DEMO_MODE)

# Migración aditiva 0004 (refresh_tokens) + tests de API contra Neon real
# (DATABASE_URL en packages/db/.env, gitignored):
set -a; . packages/db/.env; set +a
pnpm db:migrate:deploy            # incluye 0004_phase7_refresh_tokens (aditiva)
pnpm --filter @smartsense/api test    # 156/156 PASS (+security 7, health 2, auth-refresh 7)

# Suites complementarias:
pnpm --filter @smartsense/iot-bridge test    # 23/23 PASS
pnpm test:db:external                         # 18/18 PASS

# Smoke contra API real + Neon:
pnpm smoke:api                    # 7 pasos OK

# CI local (Postgres efímero, no Neon): pipeline en .github/workflows/ci.yml
# Docker: build de imágenes = BLOCKED por entorno local; Dockerfiles listos para CI.
```

## Siguiente fase

**Fase 8 — Despliegue productivo real + downlink IoT.** Construcción y publicación de imágenes Docker (api/web) en un host/CI con Docker; despliegue productivo (env de prod, backups/DR, retención); `/metrics` Prometheus y tracing OpenTelemetry; y el **downlink físico real** del control (canal IoT autenticado por kit, ACK/timeout, rollback, rate-limit reforzado) según `docs/security/phase-6-control-safety.md`. **Requiere autorización explícita** (impacto productivo y físico).
