# Release Checklist — SmartSense F0–F7

> Rama `release/smartsense-f0-f7` (HEAD `a8bc3b6`). Fecha: **2026-06-06**.
> Leyenda: ✅ hecho · ⏳ pendiente (lo ejecuta el orquestador) · ⛔ bloqueado (autorización/entorno).

| # | Ítem | Estado | Nota |
|---|---|---|---|
| 1 | Secret scan OK | ✅ | `pnpm security:scan-secrets` exit 0; `.env` ignorados; `.env.example` solo placeholders. |
| 2 | CI OK | ⏳ | `.github/workflows/ci.yml` se dispara on push; corrida se verifica tras el push (orquestador). |
| 3 | DB migrations OK | ✅ | 4 migraciones aditivas aplicadas a Neon dev (`migrate deploy`); no destructivas. |
| 4 | API health/readyz OK | ✅ | `/healthz` (liveness) + `/readyz` (`SELECT 1`) verificados local contra Neon. ⏳ re-verificar contra staging tras deploy. |
| 5 | Smoke OK | ✅ | Smoke local 7 pasos OK. ⏳ smoke remoto pendiente de staging. |
| 6 | Web build OK | ✅ | `pnpm build:web` ✅ (12 rutas). |
| 7 | DEMO_MODE confirmado | ✅ | `NEXT_PUBLIC_DEMO_MODE` activo en build demo; web clients de API son preparatorios. |
| 8 | No downlink productivo | ✅ | iot-bridge en `dry-run`; sin conexión a broker MQTT por defecto. |
| 9 | Control dry-run | ✅ | Todas las acciones de control persisten `dry_run=true`; sin downlink físico. |
| 10 | Neon prod/dev identificado | ✅ | DB usada en validación = Neon **dev** (`neondb`). Prod aún no provisionado (deploy pendiente). |
| 11 | Rollback definido | ✅ | Plan documentado en `docs/deployment/rollback-plan.md`. |
| 12 | Push de rama de release | ⏳ | Se sube `release/smartsense-f0-f7` como rama (NO master); ejecuta el orquestador. |
| 13 | Deploy staging (API + web) | ⛔ | Pendiente de credenciales/autorización de hosting (Fase 8 PARTIAL). |
| 14 | Build de imágenes Docker | ⛔ | BLOCKED por entorno local; se ejecuta en CI/host con Docker. |

## Resumen de estado

- **Listo (✅):** secret scan, migraciones, health/readyz local, smoke local, web build, DEMO_MODE, no-downlink, control dry-run, Neon dev identificado, rollback definido.
- **Pendiente de orquestador (⏳):** push de la rama, verificación de CI, smoke remoto, re-verificación health/readyz contra staging.
- **Bloqueado por autorización/entorno (⛔):** deploy de staging/prod, build de imágenes Docker.

> **Veredicto Fase 8:** **PARTIAL** — release branch + CI listos; deploy productivo/staging requiere autorización y credenciales de hosting.
