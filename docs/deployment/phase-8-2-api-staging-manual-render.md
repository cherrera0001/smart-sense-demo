# Fase 8.2 — Runbook ejecutable: API staging en Render (manual, dashboard)

> Fecha: **2026-06-06**. Solo documentación. Sin secretos (placeholders `<...>`).
> Alternativa a Railway (que está bloqueado por credenciales). Render se opera por **dashboard** (no requiere CLI local). Health check path: **`/health`**.

## 1. Crear el servicio

1. Render Dashboard → **New → Web Service**.
2. **Connect a repository** → `cherrera0001/smart-sense-demo`.
3. **Branch:** `release/smartsense-f0-f7`.
4. **Root Directory:** *(raíz del monorepo — dejar vacío)*. El build instala el workspace pnpm completo.
5. **Runtime:** Node.

## 2. Build & Start

| Campo | Valor |
|---|---|
| **Build Command** | `pnpm install --frozen-lockfile && pnpm build:api` |
| **Start Command** | `pnpm --filter @smartsense/api start` |
| **Health Check Path** | `/health` |

> Render inyecta `PORT`; la API debe escuchar en ese puerto dinámico (no hardcodear).

## 3. Environment Variables (placeholders — NUNCA secretos reales en docs/git)

| Key | Value (placeholder) | Nota |
|---|---|---|
| `NODE_ENV` | `production` | CORS/JWT estrictos |
| `SERVICE_VERSION` | `0.8.2-staging` | aparece en `/health` |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require` | Neon dev (pooled) |
| `DIRECT_URL` | `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require` | Neon dev (directa, migraciones) |
| `JWT_SECRET` | `<GENERAR_>=32_CHARS>` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `<GENERAR_>=32_CHARS>` | distinto del anterior |
| `CORS_ORIGIN` | `https://smartsense-web-v2-nw0i807ro-cherrera0001s-projects.vercel.app` | origen preview web v2 (sin wildcard) |

> Marcar las variables sensibles como **secret** en Render. No commitearlas.

## 4. Desplegar

- **Create Web Service** → Render hace install + build + start automáticamente.
- Esperar a estado **Live**; copiar la URL pública (`https://<servicio>.onrender.com`).

## 5. Migraciones (post-deploy, idempotente)

Desde el **Shell** del servicio en Render (o un Job one-off):

```bash
pnpm db:migrate:deploy        # aplica migraciones (no 'dev'); idempotente sobre Neon dev
```

## 6. Verificación remota

```bash
STAGING_API_URL="https://<servicio>.onrender.com"

curl -fsS "${STAGING_API_URL}/health"     # 200 { status, service, version: 0.8.2-staging, uptime_s }
curl -fsS "${STAGING_API_URL}/readyz"     # 200 db ok / 503 degraded

API_BASE_URL="${STAGING_API_URL}" pnpm smoke:api    # 7 pasos OK
```

## 7. Criterio de PASS

- Servicio **Live**; `/health` 200; `/readyz` 200 (`db: ok`).
- `smoke:api` **7/7** contra la URL de Render.
- CORS responde solo al origen del preview web v2.
