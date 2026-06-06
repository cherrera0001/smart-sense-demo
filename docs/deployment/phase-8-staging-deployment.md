# Fase 8 — Despliegue a staging

> Fase 8.1 = **READY-BLOCKED**. Este documento describe las opciones de despliegue a staging.
> **Sin credenciales/autorización de hosting, el deploy queda PENDIENTE.** URLs y secretos con placeholders.

## Estado

- Rama de release pusheada (`release/smartsense-f0-f7`), CI **PASS** (run `27052719013`) y **PR #1** abierto solo para revisión (`docs/release/release-f0-f7.md`, `docs/audit/phase-8-1-pr.md`).
- **Deploy NO ejecutado:** no hay CLI de hosting autenticado — `railway` instalado **sin login** (interactivo), `flyctl`/`render` ausentes, sin Docker local. Ver Opción A.1 (Railway) abajo.
- Build de imágenes Docker: BLOCKED por entorno local (se ejecuta en CI/host con Docker).

---

## Opción A — Stack completo de staging (recomendada cuando haya credenciales)

**Web (Vercel Preview) + API (Railway/Render/Fly staging) + Neon staging/dev.**

### Componentes y variables

| Componente | Variables clave |
|---|---|
| Web (Vercel Preview) | `NEXT_PUBLIC_DEMO_MODE=false`, `NEXT_PUBLIC_API_URL=https://api-staging.smartsense.example` |
| API (hosting staging) | `DATABASE_URL`, `DIRECT_URL` (Neon staging), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=https://<preview>.vercel.app`, `API_PORT`, `NODE_ENV=production`, `SERVICE_VERSION=f0-f7` |
| DB (Neon staging/dev) | branch dedicado de staging |

> `CORS_ORIGIN` debe apuntar a la **URL del preview de Vercel**; `NEXT_PUBLIC_API_URL` a la **API de staging**.

### Comandos (placeholders)

```bash
# 1. DB de staging: aplicar migraciones
pnpm --filter @smartsense/db exec prisma migrate deploy   # DIRECT_URL → Neon staging
pnpm --filter @smartsense/db exec prisma migrate status
# seed solo si staging autorizado:
pnpm --filter @smartsense/db run db:seed

# 2. API: deploy en el hosting (ejemplos)
railway up        # o: render deploy / flyctl deploy
# inyectar variables de §A en el panel/CLI del host

# 3. Web: preview en Vercel
vercel --prebuilt            # genera preview
# setear NEXT_PUBLIC_API_URL y NEXT_PUBLIC_DEMO_MODE=false en el proyecto Vercel
```

### Health / readyz / smoke

```bash
curl https://api-staging.smartsense.example/healthz   # → 200
curl https://api-staging.smartsense.example/readyz    # → 200 (db ok)
# smoke remoto (7 pasos): health → register → login → installation → dashboard → alerts → recommendations
SMARTSENSE_API_URL=https://api-staging.smartsense.example pnpm smoke:api
```

### Rollback (Opción A)

- Web: promote previous deployment en Vercel.
- API: redeploy imagen/commit anterior.
- DB: branch/restore de Neon (migraciones aditivas, sin down destructivo).
- Ver `docs/deployment/rollback-plan.md`.

---

## Opción B — Solo web preview (API pendiente)

**Web (Vercel Preview) con `DEMO_MODE`, sin API.**

- Útil cuando aún no hay hosting de API ni DB de staging.
- `NEXT_PUBLIC_DEMO_MODE=true` (la web funciona 100% mock, sin backend).
- No requiere secretos de API ni DB.

```bash
vercel --prebuilt    # preview demo
# NEXT_PUBLIC_DEMO_MODE=true
```

- Verificación: la web carga y navega en modo demo. No hay smoke de API (no aplica).

---

## Opción A.1 — Deploy de la API en Railway (cuando haya login)

> **Estado Fase 8.1 (2026-06-06):** `railway` CLI **instalado** pero **NO logueado**. El login es **interactivo/browser** → requiere acción del usuario:
>
> ```bash
> railway login    # acción del usuario (abre browser)
> ```
>
> Sin login, el deploy de la API a Railway queda **READY-BLOCKED**. (`flyctl` ausente, `render` ausente, sin Docker local; `vercel`/`gh` sí autenticados.)

Tras `railway login`, desde la raíz del monorepo:

```bash
# 1. Inicializar proyecto/servicio (una vez)
railway init

# 2. Configurar build/start del servicio API (panel o railway.json):
#    Build:  pnpm install --frozen-lockfile && pnpm build:api
#    Start:  pnpm --filter @smartsense/api start

# 3. Variables del servicio (placeholders — solo en Railway, nunca en el repo):
#    DATABASE_URL, DIRECT_URL  (Neon staging)
#    JWT_SECRET, JWT_REFRESH_SECRET  (≥32 chars)
#    CORS_ORIGIN=https://<preview>.vercel.app   (sin wildcard)
#    API_PORT, NODE_ENV=production, SERVICE_VERSION=f0-f7

# 4. Desplegar
railway up

# 5. Migrar la DB de staging (ver docs/audit/phase-8-1-staging-migration.md)
pnpm db:generate && pnpm db:migrate:deploy   # DIRECT_URL → Neon staging
pnpm --filter @smartsense/db exec prisma migrate status

# 6. Smoke remoto contra la API ya desplegada
API_BASE_URL=<STAGING_API_URL> pnpm smoke:api   # 7 pasos OK
```

---

## Conclusión

- **Recomendada:** Opción A / A.1 (Railway) cuando se autoricen credenciales de hosting de API + Neon staging.
- **Disponible ya:** Opción B (web preview demo) sin dependencias de backend.
- Mientras no haya `railway login` (u otra credencial de hosting de API), **el deploy de la API a staging queda READY-BLOCKED** → **Fase 8.1 = READY-BLOCKED**.
