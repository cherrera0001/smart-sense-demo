# Fase 8.3 — Vercel web v2: estado de acceso (verdad verificada)

> Fecha: **2026-06-06**. Solo documentación. **Producción NO tocada.** Sin secretos.
> Clasificación: **Build/deploy = PASS** · **Public access = BLOCKED-BY-PROTECTION** (Vercel Deployment Protection / SSO de equipo).

## 1. Build verificado con logs reales (`smartsense-web-v2`)

Deploy desde `apps/web` al proyecto **aislado** `smartsense-web-v2` (scope `cherrera0001s-projects`). El log de build muestra **éxito de compilación**:

```
▲ Next.js 15.5.19
✓ Compiled successfully in 18.6s
Build Completed [1m]
```

| Item | Valor |
|---|---|
| Proyecto Vercel | **`smartsense-web-v2`** (aislado, NO el productivo) |
| Scope | `cherrera0001s-projects` |
| Directorio | `apps/web` |
| Build | ✅ **PASS** — `Next.js 15.5.19`, `Compiled successfully in 18.6s`, `Build Completed [1m]` |
| URL del deployment | `https://smartsense-web-v2-nw0i807ro-cherrera0001s-projects.vercel.app` → **HTTP 401** |
| URL canónica | `smartsense-web-v2.vercel.app` → **404** (alias de prod no servido bajo protección) |

## 2. El 401 es Deployment Protection, NO un fallo de build

El **HTTP 401** de la URL del deployment es **Vercel Deployment Protection** (SSO de equipo), activa por defecto en proyectos nuevos del scope. **No** es un fallo de compilación: el build terminó `Build Completed` y compiló (`✓ Compiled successfully`). El owner logueado en el scope **sí** ve el preview en navegador; `curl` anónimo recibe 401 por no presentar la cookie de SSO. La canónica `smartsense-web-v2.vercel.app` devuelve **404** porque el alias de producción no se sirve bajo la protección.

## 3. ACLARACIÓN CLAVE — son DOS proyectos Vercel distintos

| Proyecto | Tipo | Origen del build | Estado | Acción |
|---|---|---|---|---|
| **`smartsense-web-v2`** | aislado (validación) | `apps/web` (deploy CLI) | ✅ **build PASS** (Next 15.5.19) | objeto de esta fase |
| **`smart-sense-demo`** | git-conectado (PRODUCTIVO) | **raíz del monorepo** (branch-previews) | ⚠️ branch-previews **fallan** | **NO TOCAR** |

- El log de build **FALLIDO** (`No Next.js version detected`, `Scope: all 6 workspace projects`, build desde la **RAÍZ**, commit `049a67e`) pertenece a **`smart-sense-demo`**: sus **branch-previews** fallan porque construye desde la raíz del monorepo (donde no hay app Next en la rama de release).
- Esos fallos son **INOFENSIVOS para su PRODUCCIÓN** (sigue `Ready` de hace ~38 días). **NO se detienen** porque desactivar previews/git tocaría settings del proyecto productivo (prohibido).
- **NO confundir** ese fallo con `smartsense-web-v2`, que **SÍ buildea bien**.

## 4. Producción intacta

| Item | Estado |
|---|---|
| `smart-sense-demo` (settings, Root Directory, vars) | **NO tocado** |
| Dominio `smartsense.c4a.cl` | **NO tocado** |
| `master` | **sin cambios** (no merge, no force-push) |

## 5. Pasos UI EXACTOS para desbloquear acceso público (SOLO `smartsense-web-v2`)

> Aplica únicamente al proyecto **aislado**. **NO tocar `smart-sense-demo`.**

1. Vercel → **Project `smartsense-web-v2`** → **Settings** → **Deployment Protection**.
2. Opción A — **Disable**: cambiar **Vercel Authentication** a **Disabled**.
   Opción B — **Protection Bypass for Automation**: generar un token de bypass para acceso programático sin desactivar la protección general.
3. Re-`curl` a la URL del deployment → debe devolver **HTTP 200**.

## 6. Conclusión

**Build/deploy de web v2 = PASS** (`smartsense-web-v2`, Next 15.5.19, `Compiled successfully`, `Build Completed`). **Public access = BLOCKED-BY-PROTECTION** (401 = Deployment Protection; canónica 404). El build fallido `No Next.js` es de **`smart-sense-demo`** (branch-previews desde la raíz), **inofensivo** y **no se toca**. **Producción INTACTA.**
