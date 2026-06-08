# Fase 8.1 — Vercel preview (web)

> Fecha: **2026-06-06**. Solo documentación. **No se tocó código ni settings de Vercel.** Sin secretos (placeholders).
> Estado: **PENDIENTE** — con riesgo de producción; requiere autorización/decisión de estrategia de `master`.

## 1. Estado

| Item | Estado |
|---|---|
| Previews disparados por el push | ❌ **FALLARON** (2 builds) — **esperado** |
| Producción Vercel | ✅ **INTACTA** (`Ready`, deploy de hace ~38 días) |
| Settings de Vercel | **NO modificados** |

## 2. Por qué fallaron los previews (y por qué es esperado)

El proyecto Vercel existente está configurado con **Root Directory = raíz del repo**, que en `master` es el demo viejo (app Next en la raíz) que Vercel despliega a **producción**. En la rama de release `release/smartsense-f0-f7` la raíz del monorepo **ya no es una app Next** (la web vive en `apps/web`), por lo que los **Preview builds del push fallan** por diseño.

> **Riesgo de producción:** cambiar el **Root Directory** del proyecto existente a `apps/web` arreglaría el preview de la rama de release **pero rompería el build de producción de `master`** (cuya app está en la raíz). Por eso **NO se modificaron los settings de Vercel**.

## 3. Opciones para un preview web limpio

### Opción A — Proyecto Vercel **separado** apuntando a `apps/web` (recomendada, sin tocar producción)

| Setting | Valor |
|---|---|
| Root Directory | `apps/web` |
| Install Command | `pnpm install` |
| Build Command | `pnpm build` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |
| `NEXT_PUBLIC_API_URL` | `<STAGING_API_URL>` |

- No afecta el proyecto/producción actual (que sigue sirviendo `master` desde la raíz).

### Opción B — Reconfigurar el proyecto existente (solo tras decidir la estrategia de `master`)

- Cambiar Root Directory a `apps/web` **solo** después de decidir qué pasa con `master` (mergear la release, retirar el demo viejo, etc.). Mientras `master` siga siendo el demo en la raíz, este cambio **rompe producción**.

## 4. Conclusión

**PENDIENTE de autorización.** Producción **intacta**; previews del push fallaron por diseño (root del monorepo sin app Next). Un preview web limpio requiere **Opción A** (proyecto separado a `apps/web`) o **Opción B** (reconfigurar el existente tras decidir la estrategia de `master`) — decisión del usuario.
