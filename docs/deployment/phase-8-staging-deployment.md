# Fase 8 — Despliegue a staging

> Fase 8 = **PARTIAL**. Este documento describe las dos opciones de despliegue a staging.
> **Sin credenciales/autorización de hosting, el deploy queda PENDIENTE.** URLs y secretos con placeholders.

## Estado

- Rama de release lista (`release/smartsense-f0-f7`) y CI on push (`docs/release/release-f0-f7.md`).
- **Deploy NO ejecutado:** falta autorización y credenciales del hosting de API (Railway/Render/Fly) y de la DB de staging.
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

## Conclusión

- **Recomendada:** Opción A cuando se autoricen credenciales de hosting de API + Neon staging.
- **Disponible ya:** Opción B (web preview demo) sin dependencias de backend.
- Mientras no haya autorización/credenciales de hosting de API, **el deploy productivo/staging completo queda PENDIENTE** → **Fase 8 = PARTIAL**.
