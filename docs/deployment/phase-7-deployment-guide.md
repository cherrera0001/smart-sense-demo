# Fase 7 — Guía de Despliegue (SmartSense)

Despliegue de producción del monorepo: **Web** (Next.js) en Vercel, **API** (Fastify) en
un PaaS de contenedores (Railway / Render / Fly.io / VPS), y **Postgres** gestionado en
Neon. La iot-bridge se despliega aparte (no cubierta aquí en detalle).

```
[ Navegador ] → Vercel (apps/web, Next 15)
                     │  fetch (NEXT_PUBLIC_API_URL)
                     ▼
              API Fastify (apps/api)  ── Railway / Render / Fly / VPS / Docker
                     │  DATABASE_URL (pooler)  /  DIRECT_URL (migraciones)
                     ▼
              Neon Postgres (managed)
```

---

## 1. Variables de entorno (producción)

### API (`apps/api`)
| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Neon **pooler** (`-pooler`), `sslmode=require`. Uso de la app. |
| `DIRECT_URL` | Sí | Neon **directo** (no-pooler). Para `migrate:deploy`. |
| `JWT_SECRET` | Sí | ≥ 32 chars aleatorios. `config/env.ts` rechaza valores inseguros en prod. |
| `JWT_REFRESH_SECRET` | Sí | ≥ 32 chars, distinto del access. |
| `CORS_ORIGIN` | Sí | Origen(es) del frontend, p. ej. `https://smartsense.c4a.cl`. Sin wildcard. |
| `API_PORT` | No | Default `3001`. Ajustar al puerto del PaaS si lo fija (`PORT`). |
| `NODE_ENV` | Sí | `production`. |
| `SERVICE_VERSION` | No | Versión expuesta en `/health`. |

### Web (`apps/web` — Vercel)
| Variable | Notas |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública de la API (si el frontend llama directo). Inlined en build. |
| `NEXT_PUBLIC_DEMO_MODE` | `false` en producción real (la demo usa fixtures). |

> Generar secretos: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`

---

## 2. Web en Vercel
1. Importar el repo. **Root Directory**: `apps/web`. Framework: Next.js (autodetectado).
2. Build command: `pnpm build` (o el default de Vercel para Next).
3. Configurar las `NEXT_PUBLIC_*` en *Project → Settings → Environment Variables*.
4. Auto-deploy en push a la rama de producción.
5. Dominio: `smartsense.c4a.cl` (ya configurado históricamente).

> Vercel inlinea `NEXT_PUBLIC_*` en build time: cambiarlas requiere re-deploy.

---

## 3. API en Railway / Render / Fly / VPS

### Opción A — Contenedor (recomendado)
Usa `apps/api/Dockerfile` (ver `docs/deployment/docker.md`). Build desde la raíz:
```bash
docker build -f apps/api/Dockerfile -t smartsense-api:latest .
```
Configura las variables como **secrets** del proveedor (NUNCA en el repo).

### Opción B — Buildpack / Node nativo
- Build: `pnpm install --frozen-lockfile=false && pnpm db:generate && pnpm build:api`
- Start: `pnpm --filter @smartsense/api exec tsx src/server.ts`
- Health check del proveedor → `GET /health` (liveness) o `GET /readyz` (incluye `SELECT 1`).

> Render: usa `render.yaml` o el dashboard. Railway/Fly: secrets + puerto inyectado (`PORT`).
> La API lee `API_PORT` o `PORT`; alinea con el puerto que exponga el PaaS.

---

## 4. Neon Postgres
1. Crear proyecto/branch de producción en Neon.
2. Copiar dos connection strings:
   - **Pooled** (`...-pooler...`) → `DATABASE_URL`.
   - **Direct** (no-pooler) → `DIRECT_URL`.
   Ambas con `sslmode=require`.
3. Neon no trae TimescaleDB: la migración 0001 tolera el fallback (DO/EXCEPTION) y deja
   `telemetry_readings` como tabla normal si la extensión no existe. Ver
   `docs/database/phase-1-external-postgres-verification.md`.

---

## 5. Migraciones
Aplicar **antes** de exponer la nueva versión de la API (paso separado del arranque):
```bash
# Con DIRECT_URL apuntando a la DB de producción:
pnpm db:generate
pnpm db:migrate:deploy     # aplica prisma/migrations en orden (0001..)
# Seed SOLO en entornos no productivos o datos de catálogo idempotentes:
# pnpm db:seed
```
- `migrate:deploy` no genera migraciones nuevas; solo aplica las versionadas.
- Ejecutarlo desde un job/one-off del PaaS o desde la imagen:
  `docker run --rm -e DIRECT_URL=... smartsense-api:latest pnpm db:migrate:deploy`

---

## 6. Smoke test post-deploy
Con la API arriba (local o remota):
```bash
API_BASE_URL=https://api.smartsense.c4a.cl pnpm smoke:api
```
Valida `/health` → register → login → crear installation → dashboard/alerts/recommendations.
Requiere API levantada + DB migrada. No imprime tokens (los enmascara). Exit 0 = OK.

---

## 7. Rollback básico
- **Web (Vercel)**: *Deployments → promover el deployment anterior* (instantáneo).
- **API (contenedor)**: re-desplegar el tag/imagen anterior (`smartsense-api:<sha-previo>`).
- **DB**: las migraciones son forward-only. Para revertir un cambio de esquema, crear una
  **migración inversa** versionada (no editar las aplicadas). Hacer backup/branch en Neon
  antes de migrar para poder restaurar.

---

## 8. Checklist de seguridad
- [ ] `pnpm security:scan-secrets` en verde (sin secretos versionados).
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` ≥ 32 chars, únicos por entorno, en secrets del PaaS.
- [ ] `CORS_ORIGIN` con dominios explícitos (sin `*`).
- [ ] `DATABASE_URL` / `DIRECT_URL` con `sslmode=require`; credenciales nunca en el repo.
- [ ] Ningún `.env` en imágenes ni en el contexto de build (`.dockerignore`).
- [ ] **NO usar `DATABASE_URL` de producción en tests locales.** Los tests de DB exigen
      señales dev/test; apuntar a una Postgres efímera (Testcontainers/Docker o un Postgres
      de desarrollo con `SMARTSENSE_DB_TEST_MODE=external`). `SMARTSENSE_DB_ALLOW_UNSAFE=1`
      solo en CI/efímeras, nunca contra producción.

---

## 9. Rotación de secretos
1. Generar el nuevo valor (ver §1).
2. Actualizar el secret en el PaaS (API) y/o Vercel (web) y re-desplegar.
3. **JWT_SECRET**: rotarlo invalida los access tokens vigentes (expiran en `15m`). Para
   transición sin downtime, planear ventana corta o doble verificación temporal.
4. **JWT_REFRESH_SECRET**: rotarlo invalida los refresh tokens → obliga re-login.
5. **DATABASE credentials (Neon)**: rotar contraseña/branch en Neon, actualizar
   `DATABASE_URL`/`DIRECT_URL`, re-desplegar. Asumir comprometida toda credencial filtrada.
6. Registrar la rotación (fecha, motivo, responsable) para auditoría.
