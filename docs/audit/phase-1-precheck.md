# Fase 1 — Precheck

> Fecha: 2026-06-02 · Repo: `smartsense-brownfield` (clon de `github.com/cherrera0001/smart-sense-demo`).

## Estado git
- Rama inicial: `chore/brownfield-spec-reconciliation` (base `origin/master` @ `a50edf6`).
- Working tree: limpio (solo `tsconfig.tsbuildinfo` untracked → eliminado).
- `.env`/`.env.local`: **no trackeados** (verificado `git ls-files`). Sin secretos versionados.

## Versiones
- pnpm **8.12.0** · node **v22.15.0**.

## Validación inicial (antes de migrar)
| Comando | Resultado | Exit |
|---|---|---|
| `pnpm lint` | PASS — 1 warning (`Step2PairingLeds.tsx:35` react-hooks/exhaustive-deps) | 0 |
| `pnpm exec tsc --noEmit` | PASS — 0 errores | 0 |
| `pnpm build` | PASS — 12 rutas estáticas, shared 102 kB | 0 |

**Conclusión:** la demo compila. Se puede migrar a `apps/web` sin riesgo de partir de un estado roto.

## Decisión de arquitectura (monorepo root)
El monorepo se establece **sobre este repo git existente** (no en una carpeta nueva) para:
1. Preservar el historial git y la linealidad de la demo desplegada.
2. Mantener un único repo productivo versionado.

Se traen `specs/` y `docs/audit|architecture` (generados en Fases 0/0.5) al repo para que sea autocontenido y las rutas relativas de specs/roadmap resuelvan. No se hace push ni se toca Vercel.
