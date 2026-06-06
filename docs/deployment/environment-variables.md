# Variables de entorno por componente — SmartSense

> Fase 8. **Solo placeholders** en este documento. Los valores reales viven en el hosting de cada componente, nunca en el repo.
> Formato de connection string: `postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require`.

## 1. API (`apps/api`)

| Variable | Ejemplo (placeholder) | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require` | Connection string de runtime (pooled si el host lo provee). **Nunca** usar la URL de prod en tests. |
| `DIRECT_URL` | `postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require` | URL directa/unpooled para `migrate deploy`. |
| `JWT_SECRET` | `<32+ bytes aleatorios>` | `config/env.ts` **rechaza** secretos débiles en prod. |
| `JWT_REFRESH_SECRET` | `<32+ bytes aleatorios, distinto del anterior>` | Para rotación de refresh tokens. |
| `CORS_ORIGIN` | `https://app.smartsense.example` | **Dominio web real**, no wildcard en prod (`config/env.ts` rechaza `*` en prod). |
| `API_PORT` | `3001` | Puerto de escucha de la API. |
| `NODE_ENV` | `production` | Activa los checks de hardening (CORS/JWT). |
| `SERVICE_VERSION` | `f0-f7` / tag | Reportado por `/healthz`. |

## 2. Web (`apps/web`)

| Variable | Ejemplo (placeholder) | Notas |
|---|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` / `false` | `true` = demo 100% mock (sin backend). `false` = consume la API real. |
| `NEXT_PUBLIC_API_URL` | `https://api.smartsense.example` | Apunta al **host de la API** desplegada (no a Vercel si la API va fuera). Solo relevante con `DEMO_MODE=false`. |

> Las variables `NEXT_PUBLIC_*` se **embeben en el build** del cliente: no poner secretos aquí.

## 3. iot-bridge (`apps/iot-bridge`)

| Variable | Ejemplo (placeholder) | Notas |
|---|---|---|
| `IOT_BRIDGE_MODE` | `dry-run` | Por defecto **dry-run** (no conecta broker, no downlink físico). |
| `SMARTSENSE_API_URL` | `https://api.smartsense.example` | API destino de la ingestión. |
| `SMARTSENSE_API_TOKEN` | `<token>` (placeholder) | Token de servicio para ingestión. |
| `MQTT_BROKER_URL` | `mqtts://HOST:8883` (placeholder) | Solo relevante en modo `mqtt`. |
| `MQTT_USERNAME` | `USER` (placeholder) | Solo en modo `mqtt`. |
| `MQTT_PASSWORD` | `PASSWORD` (placeholder) | Solo en modo `mqtt`. |

## 4. Notas de seguridad

- **No usar `DATABASE_URL` de prod en tests.** Los tests de DB (`test:db:external`) corren contra Neon **dev** o la Postgres efímera de CI. El guard `assertSafeExternalUrl` rechaza URLs con `prod|production|live|primary|master|main`.
- **`CORS_ORIGIN` al dominio web real**, nunca wildcard en prod.
- **Secretos del API en su propio hosting** (Railway/Render/Fly), **no en Vercel** si la API va fuera de Vercel. Vercel solo necesita las `NEXT_PUBLIC_*` de la web.
- Los Dockerfiles **no copian `.env`** (`.dockerignore`); las variables se inyectan en runtime por el host.
- El logger redacta `authorization/cookie/password/tokens/DATABASE_URL` — los secretos no aparecen en logs.
