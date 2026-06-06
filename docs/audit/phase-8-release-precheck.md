# Fase 8 — Release Precheck (estado de ramas y working tree)

> Fecha de verificación: **2026-06-06**. Solo lectura/documentación. No se modificó código.
> Alcance: preparar la **rama de release** F0–F7 y verificar el estado del repositorio antes del push y la corrida de CI.

## 1. Estado actual (HEAD)

| Item | Valor |
|---|---|
| Rama actual | `release/smartsense-f0-f7` |
| Origen de la rama | creada desde `feat/phase-7-hardening` (superset lineal de F0–F7) |
| HEAD | `a8bc3b6` — `docs(sdd): phase 7 hardening — runtime gates, secret rotation, deployment, observability (PASS, 156/156)` |
| Working tree | **LIMPIO** (`git status -sb` → solo la rama, sin cambios sin commitear) |
| Remoto | `origin` → `https://github.com/cherrera0001/smart-sense-demo.git` |
| Autenticación | `gh` autenticado como `cherrera0001` |

## 2. Ramas locales

| Rama | Rol |
|---|---|
| `master` | demo viejo (HEAD `a50edf6` — `refactor: consolidate execution plan into docs/00-Gobierno/ structure`) |
| `chore/brownfield-spec-reconciliation` | Fase 0.5 — reconciliación brownfield |
| `feat/phase-1-db-domain` | Fase 1 — DB + dominio |
| `feat/phase-2-api-base` | Fase 2 — API base |
| `feat/phase-3-iot-telemetry` | Fase 3 — IoT + telemetría |
| `feat/phase-4-dashboard-reports` | Fase 4 — dashboard/reportes (backend) |
| `feat/phase-5-alerts-recommendations` | Fase 5 — alertas/recomendaciones (backend) |
| `feat/phase-6-device-control` | Fase 6 — control (dry-run) |
| `feat/phase-7-hardening` | Fase 7 — hardening |
| `release/smartsense-f0-f7` | **rama de release** (este HEAD) — superset lineal F0–F7 |

## 3. Divergencia con `master` / `origin/master`

- `git rev-list --count master..release/smartsense-f0-f7` → **45 commits** sobre `master`.
- `master` local == `origin/master` (`a50edf6`): el demo viejo en GitHub no contiene nada de F0–F7.
- La rama de release **diverge masivamente** de `master`: F0–F7 reescribe arquitectura (monorepo pnpm, API Fastify, Prisma/Neon, IoT bridge) frente al demo 100% mock.

### Decisión de push

- Se sube **`release/smartsense-f0-f7` como rama**, **NO** se sobrescribe `master`.
- No hacer `push --force` a `master` (rama protegida / demo de referencia).
- El merge a `master` (si se decide) será una operación posterior y explícita, fuera del alcance de esta fase.

## 4. Estado del precheck

| Gate | Estado |
|---|---|
| Rama de release creada y posicionada en superset F0–F7 | ✅ |
| Working tree limpio | ✅ |
| Remoto + auth `gh` disponibles | ✅ |
| Divergencia con `master` entendida (push como rama, no master) | ✅ |
| Push de la rama a `origin` | ⏳ ejecuta el orquestador |

> **Conclusión:** repositorio listo para el push de la rama de release. El push y la verificación de CI los ejecuta el orquestador.
