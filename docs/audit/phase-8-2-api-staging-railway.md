# Fase 8.2 — API staging en Railway (runbook ejecutable, estado BLOQUEADO)

> Fecha: **2026-06-06**. Solo documentación. **No se tocó código.** Sin secretos (placeholders `<...>`).
> Estado: **⛔ BLOQUEADO** — sin autenticación Railway (`railway whoami` = Unauthorized; `RAILWAY_TOKEN` ausente en bash y Windows). Ver `phase-8-2-railway-auth.md`. **No se desplegó (no se inventó resultado).** Los pasos siguientes se ejecutan **cuando exista auth**.

## 0. Prerrequisito (desbloqueo)

```bash
railway login                 # o: export RAILWAY_TOKEN="<RAILWAY_TOKEN>"
railway whoami                # debe NO devolver "Unauthorized"
```

## 1. Inicializar proyecto/servicio

```bash
railway init                  # crear proyecto: smartsense-api-staging
# seleccionar/crear servicio para la API Fastify
```

## 2. Variables de entorno (placeholders — NUNCA secretos en git)

| Variable | Valor (placeholder) | Origen / nota |
|---|---|---|
| `NODE_ENV` | `production` | endurecimiento (CORS/JWT estrictos) |
| `SERVICE_VERSION` | `0.8.2-staging` | aparece en `/health` |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require` | Neon **dev** (pooled), desde `packages/db/.env` |
| `DIRECT_URL` | `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require` | Neon **dev** (unpooled/directa), para migraciones |
| `JWT_SECRET` | `<GENERAR_ALEATORIO_>=32_CHARS>` | fuerte ≥ 32 chars (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | `<GENERAR_ALEATORIO_>=32_CHARS>` | fuerte ≥ 32 chars, distinto del anterior |
| `CORS_ORIGIN` | `https://smartsense-web-v2-nw0i807ro-cherrera0001s-projects.vercel.app` | origen del preview web v2 (sin wildcard) |
| `PORT` | *(inyectado por Railway)* | usar el `PORT` dinámico del entorno, no hardcodear |

```bash
railway variables \
  --set NODE_ENV=production \
  --set SERVICE_VERSION=0.8.2-staging \
  --set DATABASE_URL="<NEON_DEV_POOLED_URL>" \
  --set DIRECT_URL="<NEON_DEV_DIRECT_URL>" \
  --set JWT_SECRET="<RANDOM>=32>" \
  --set JWT_REFRESH_SECRET="<RANDOM>=32>" \
  --set CORS_ORIGIN="https://smartsense-web-v2-nw0i807ro-cherrera0001s-projects.vercel.app"
```

> Generar secretos fuertes: `openssl rand -base64 48`. El arranque (`config/env.ts`) **rechaza** JWT débil/ausente y CORS wildcard con `NODE_ENV=production`.

## 3. Build y start

| Fase | Comando |
|---|---|
| Install + build | `pnpm install --frozen-lockfile && pnpm build:api` |
| Start | `pnpm --filter @smartsense/api start` |

> La API debe escuchar en el `PORT` dinámico que inyecta Railway (no un puerto fijo).

## 4. Desplegar

```bash
railway up                    # build + deploy desde la rama release/smartsense-f0-f7
railway domain                # generar/obtener la URL pública de staging
```

## 5. Migraciones (Neon dev ya migrada; idempotente)

```bash
railway run pnpm db:migrate:deploy     # aplica migraciones (no 'dev'); idempotente
railway run pnpm db:generate           # cliente Prisma si hace falta
```

## 6. Verificación remota

```bash
STAGING_API_URL="$(railway domain | head -n1)"   # o la URL devuelta por 'railway domain'

curl -fsS "https://${STAGING_API_URL}/health"     # liveness 200 { status, service, version, uptime_s }
curl -fsS "https://${STAGING_API_URL}/readyz"     # readiness 200 (db ok) / 503 degraded

API_BASE_URL="https://${STAGING_API_URL}" pnpm smoke:api   # 7 pasos OK
```

## 7. Criterio de PASS

- `railway up` → deployment activo.
- `/health` 200 con `version=0.8.2-staging`; `/readyz` 200 con `db: ok`.
- `smoke:api` **7/7** contra la URL de staging.
- CORS responde solo al origen del preview web v2.

> Mientras `railway whoami` siga **Unauthorized** y `RAILWAY_TOKEN` ausente, **GATE-DEPLOY-001 (API staging) = BLOCKED** y el smoke remoto (GATE-E2E-001 staging) sigue **READY-BLOCKED**. Desbloqueo en `phase-8-2-railway-auth.md`.
