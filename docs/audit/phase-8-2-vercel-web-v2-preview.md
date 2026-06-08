# Fase 8.2 — Vercel web v2 preview (proyecto aislado) — ÉXITO DE BUILD

> Fecha: **2026-06-06**. Solo documentación. **Producción NO tocada.** Sin secretos (placeholders).
> Estado: **✅ BUILD PASS** — deployment `READY` en un proyecto Vercel **nuevo y aislado**; acceso público condicionado a desactivar Deployment Protection (ver §5).

## 1. Resultado

| Item | Valor |
|---|---|
| Proyecto Vercel | **`smartsense-web-v2`** (NUEVO, aislado) |
| Scope | `cherrera0001s-projects` |
| Directorio linkeado | `apps/web` (NO el productivo `smart-sense-demo`) |
| Variable | `NEXT_PUBLIC_DEMO_MODE=true` (production / preview / development) |
| Comando | `vercel deploy --yes` |
| Estado del deployment | **READY** ✅ (build exitoso) |
| URL | `https://smartsense-web-v2-nw0i807ro-cherrera0001s-projects.vercel.app` |
| `curl` sin auth | **HTTP 401 "Authentication Required"** → **Deployment Protection** (no es fallo de build) |

## 2. Por qué se creó un proyecto NUEVO (y no se reconfiguró el productivo)

El proyecto productivo `smart-sense-demo` tiene **Root Directory = raíz del repo**, que en `master` es el demo viejo (app Next en la raíz) servido a **producción** (`smartsense.c4a.cl`). Cambiar su Root Directory a `apps/web` arreglaría la rama de release **pero rompería el build de producción de `master`**.

Solución sin riesgo: **proyecto Vercel separado** (`smartsense-web-v2`) linkeado a `apps/web`. Así el build de la rama de release se valida **sin tocar** el proyecto productivo ni su dominio.

> **Por qué el build aislado funciona:** `apps/web` es **instalable standalone** — no depende de paquetes internos `workspace:*` en runtime de build (la web está en `NEXT_PUBLIC_DEMO_MODE` y sus clientes de API son preparatorios). Por eso Vercel puede instalar y compilar `apps/web` como raíz sin resolver el resto del monorepo.

## 3. El 401 es Deployment Protection, NO un fallo de build

`curl` a la URL devuelve **HTTP 401 "Authentication Required"**. Esto es **Vercel Deployment Protection** (SSO de equipo), un setting **activo por defecto** en proyectos nuevos del scope. El **build fue exitoso** (deployment `READY`).

- El **owner logueado** (sesión Vercel del scope `cherrera0001s-projects`) **sí puede ver** el preview en el navegador.
- `curl` anónimo recibe 401 porque no presenta la cookie de SSO del equipo.

## 4. Producción intacta

| Item | Estado |
|---|---|
| Proyecto productivo `smart-sense-demo` | **NO tocado** (settings, Root Directory, vars sin cambios) |
| Dominio `smartsense.c4a.cl` | **NO tocado** |
| `master` | **sin cambios** (no merge, no force-push) |

## 5. Cómo hacer el preview público (opcional)

Si se quiere acceso público (sin login del owner), desactivar la protección en el proyecto **aislado** (no afecta producción):

1. Vercel → proyecto **`smartsense-web-v2`** → **Settings → Deployment Protection**.
2. Cambiar **Vercel Authentication** a **Disabled** (o configurar Protection Bypass / Shareable Link).
3. Re-`curl` la URL → debe devolver **HTTP 200**.

> Esto es solo para el proyecto de validación. El proyecto productivo conserva su protección y su dominio.

## 6. Conclusión

**Web v2 preview = ÉXITO DE BUILD** en proyecto Vercel aislado (`smartsense-web-v2`), deployment **READY**. El HTTP 401 es **Deployment Protection** (acceso tras login del owner; opcionalmente público desactivando la protección en Settings del proyecto aislado), **no** un fallo de compilación. **Producción `smart-sense-demo` / `smartsense.c4a.cl` INTACTA.**
