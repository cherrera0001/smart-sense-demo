# Fase 8.1 — Pull Request de release

> Fecha: **2026-06-06**. Solo documentación. **No se mergeó.** Sin secretos.
> Estado: **PR abierto para revisión** (no merge).

## 1. PR creado

| Item | Valor |
|---|---|
| URL | **https://github.com/cherrera0001/smart-sense-demo/pull/1** |
| Base | `master` |
| Head | `release/smartsense-f0-f7` |
| Propósito | **solo revisión** (NO merge) |
| Estado | **abierto** |
| CI previo (head) | ✅ PASS (run `27052719013`) |

## 2. Advertencia de riesgo documentada en el body

El body del PR documenta el **riesgo de mergear a `master`**:

- `master` es el **demo viejo** (app Next en la **raíz** del repo) que **Vercel despliega a producción**.
- La rama de release reescribe la arquitectura a monorepo pnpm con la web en `apps/web`.
- **Mergear a `master` rompería el build de producción** de Vercel salvo reconfigurar el **Root Directory** del proyecto a `apps/web` (ver `docs/audit/phase-8-1-vercel-preview.md`).
- Por eso el PR queda **abierto solo para revisión**; el merge es una decisión posterior y explícita del usuario.

## 3. Conclusión

PR **#1** abierto (base `master`, head `release/smartsense-f0-f7`) para revisión, con la advertencia de riesgo de producción documentada en el body. **No se mergeó** ni se modificó `master`.
