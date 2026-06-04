# Docker — Build & Run (SmartSense, Fase 7)

Imágenes multi-stage para `apps/api` (Fastify) y `apps/web` (Next.js 15). Ambas se
construyen **desde la raíz del monorepo** (el contexto de build es la raíz, porque pnpm
necesita resolver los workspaces y `packages/db` / `packages/shared`).

> Regla de oro: **NUNCA se copia `.env`** a las imágenes. Todos los secretos se inyectan
> por entorno en tiempo de ejecución. El `.dockerignore` excluye `**/.env*` (salvo
> `*.env.example`).

---

## 1. API — `apps/api/Dockerfile`

### Build
```bash
docker build -f apps/api/Dockerfile -t smartsense-api:latest .
```

### Run
```bash
docker run --rm -p 3001:3001 \
  -e NODE_ENV=production \
  -e API_PORT=3001 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require" \
  -e DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require" \
  -e JWT_SECRET="<>=32 chars, aleatorio>" \
  -e JWT_REFRESH_SECRET="<>=32 chars, aleatorio>" \
  -e CORS_ORIGIN="https://smartsense.c4a.cl" \
  smartsense-api:latest
```

### Variables requeridas (runtime)
| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | Sí | Connection string Postgres/Neon (pooler para la app). |
| `DIRECT_URL` | Recomendada | Conexión directa (no-pooler) para migraciones. |
| `JWT_SECRET` | Sí (prod) | ≥ 32 chars, NO valor por defecto (lo valida `config/env.ts`). |
| `JWT_REFRESH_SECRET` | Sí (prod) | ≥ 32 chars, distinto del access. |
| `CORS_ORIGIN` | Sí (prod) | Lista separada por comas; **no** wildcard en prod. |
| `API_PORT` | No | Default `3001`. |
| `NODE_ENV` | No | Default `production` en la imagen. |
| `SERVICE_VERSION` | No | Aparece en `/health`. |

### Detalles de runtime
- El paquete `@smartsense/db` se distribuye como **TypeScript de origen** (`exports → ./src/index.ts`).
  Por eso el contenedor ejecuta la API con `tsx` (loader TS para Node), no `node dist/server.js`
  puro. El build de `tsc` (`apps/api/dist`) se realiza igualmente en el stage de build como
  verificación de tipos.
- **Migraciones**: NO se ejecutan al arrancar. Aplícalas como paso separado del despliegue:
  ```bash
  docker run --rm -e DATABASE_URL=... -e DIRECT_URL=... smartsense-api:latest \
    pnpm db:migrate:deploy
  ```
- `HEALTHCHECK` integrado consulta `GET /health` (liveness, sin auth ni DB).

---

## 2. Web — `apps/web/Dockerfile`

### Build
```bash
docker build -f apps/web/Dockerfile -t smartsense-web:latest .
```

### Run
```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  smartsense-web:latest
```

### Variables
- Las `NEXT_PUBLIC_*` se **inlinean en build time** (se hornean en el bundle). Pásalas con
  `--build-arg` / `ENV` antes de `next build` si necesitas valores específicos por entorno.
- Runtime usa `next start` con `node_modules` (sin `output: 'standalone'`).

### Output standalone (opcional, recomendado para producción)
`apps/web/next.config.js` **no** define `output: 'standalone'`. Si se añade:
```js
const nextConfig = { reactStrictMode: true, output: 'standalone' }
```
el runtime puede copiar solo `.next/standalone` + `.next/static` + `public` y ejecutar
`node apps/web/server.js`, reduciendo el tamaño de la imagen y eliminando `node_modules`
del runtime. Este Dockerfile **no modifica código**; documenta el cambio para adoptarlo.

---

## 3. `.dockerignore`
Excluye `node_modules`, `.next`, `dist`, `.git`, `**/.env*` (salvo `*.env.example`),
`test-results`, `screenshots`, `coverage`, `*.log` y `docs`. Reduce el contexto de build
y evita filtrar secretos/artefactos.

---

## 4. Checklist de seguridad de imágenes
- [ ] Ningún `.env` dentro de la imagen (`docker history` / `docker run ... env` no muestra secretos horneados).
- [ ] Secretos solo por `-e` / orquestador (Railway/Render/Fly secrets, K8s Secret).
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` ≥ 32 chars y rotables.
- [ ] `CORS_ORIGIN` con dominios explícitos (sin `*`).
- [ ] Migraciones aplicadas como paso separado, no en el arranque del contenedor.
