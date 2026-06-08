# Fase 8.4 — API en Vercel Serverless ("todo en Vercel")

**Decisión de arquitectura.** Toda la plataforma corre en Vercel: `apps/web` (Next.js) como frontend y
`apps/api` (Fastify) envuelto como **Vercel Serverless Function**. Sustituye los hosts de servidor
persistente (Railway/Render/Fly/VPS) que la guía de despliegue previa listaba para la API.

## Por qué requería trabajo (no es un toggle)

`apps/api` es un servidor Fastify de larga vida (`app.listen()`). Vercel no ejecuta procesos
persistentes: solo Next.js + funciones serverless/edge. Para correr la API en Vercel hay que montar la
app Fastify dentro de una función serverless y resolver tres problemas del monorepo:

1. **Workspaces como fuente TS.** `@smartsense/db` y `@smartsense/shared` exportan `./src/index.ts`.
   `@vercel/node` transpila `apps/api/src` pero NO incluye el TS de los workspaces → `ERR_MODULE_NOT_FOUND`.
   **Solución:** `scripts/bundle-api.mjs` (esbuild) pre-empaqueta la app en `api/server.mjs`,
   inlineando el código fuente de `@smartsense/*` y dejando node_modules externos.
2. **Prisma en Vercel.** El engine nativo no se puede inlinear. Único external del bundle:
   `@prisma/client`, expuesto como dependencia en el `package.json` raíz para que resuelva en runtime.
   `schema.prisma` añade `binaryTargets = ["native", "rhel-openssl-3.0.x"]` (runtime de Vercel).
3. **Conexión a Neon serverless.** `DATABASE_URL` usa el host **pooled** (`-pooler`) con
   `pgbouncer=true&connection_limit=1`. `DIRECT_URL` (no-pooled) solo para migraciones.

## Componentes

| Archivo | Rol |
|---|---|
| `api/index.ts` | Handler serverless: monta Fastify (cacheado) y emite la request (`server.emit('request')`). |
| `api/package.json` | `{"type":"module"}` — la función es ESM (la app Fastify es ESM). |
| `api/server.mjs` | Bundle autocontenido generado en build (gitignored). |
| `scripts/bundle-api.mjs` | esbuild: inlinea `@smartsense/*`, externaliza `@prisma/client`. |
| `vercel.json` | `installCommand` (install `--prod=false` + prisma generate + bundle), `rewrites` `/(.*)→/api`, `functions.maxDuration=30`. |
| `public/index.html` | Output estático mínimo (Vercel exige un output dir). |

### Detalle crítico: `--prod=false`

Las env vars del proyecto incluyen `NODE_ENV=production`, lo que en el build hace que
`pnpm install` **pode las devDependencies** (`prisma`, `esbuild`) → `prisma: command not found`.
El `installCommand` usa `pnpm install --frozen-lockfile --prod=false` para instalar devDeps en build.
`NODE_ENV=production` sigue aplicando al runtime de la lambda (config de la app).

> Nota: además, al setear env vars por stdin hay que evitar el `\n` final — un `CORS_ORIGIN` con
> salto de línea rompe el match de origen del navegador.

## Configuración del proyecto Vercel (`smartsense-api-v2`)

- Proyecto aislado, separado del frontend (`smartsense-web-v2`) y de producción (`smart-sense-demo`).
- **Vercel Authentication (SSO) DESACTIVADO**: una API backend debe ser públicamente alcanzable;
  su seguridad es JWT + RBAC + rate-limit propios, no el SSO de deployment de Vercel.
- Env (production): `NODE_ENV`, `SERVICE_VERSION`, `DATABASE_URL` (pooled), `DIRECT_URL`,
  `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` (= URL del frontend).

## Verificación (smoke E2E remoto — VERDE)

```
STAGING_API_URL=https://smartsense-api-v2-<hash>-cherrera0001s-projects.vercel.app pnpm verify:staging
```

Resultado real obtenido:
- `GET /health` → 200 `{"status":"ok","version":"0.8.4-vercel"}`
- `GET /readyz` → 200 `{"status":"ready","db":"ok"}` (Prisma conecta a Neon desde la lambda)
- Smoke E2E 7/7: `register` (JWT), `login`, `POST /installations`, `dashboard`, `alerts`, `recommendations`.

## Limitaciones serverless (conocidas)

- **Cold starts** en la primera invocación; app Fastify cacheada entre invocaciones calientes.
- **Rate-limit desactivado** en la función (sin estado compartido entre lambdas); endurecer en edge/WAF.
- **Sin WebSocket** (no implementado aún; si se añade dashboard en tiempo real, requerirá otro canal).
- `maxDuration` 30s por request (ajustable según plan).
