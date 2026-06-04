# Fase 6 — Precheck

> Fecha: 2026-06-04 · Rama `feat/phase-6-device-control`.
> Verificación de condiciones de entrada antes de cerrar Fase 6 (control de dispositivos en **dry-run**, sin downlink físico). DB Neon dev (host enmascarado `ep-lucky-pine-***.neon.tech`, database `neondb`).

| Check | Resultado |
|---|---|
| Rama de trabajo | `feat/phase-6-device-control` ✅ |
| Fase 1 PASS | ✅ (DB Neon, 18/18 tests, migración+seed) |
| Fase 2 PASS | ✅ (API base, 39 tests, RBAC/tenant/audit) |
| Fase 3 PASS | ✅ (telemetría 17 tests, iot-bridge 23, idempotencia) |
| Fase 4 PASS | ✅ (dashboard/reports/breakdown + BillingService, API 92/92) |
| Fase 5 PASS | ✅ (alerts/recommendations backend, 5 reglas, migración 0002, API 114/114) |
| DB usada | Neon dev (host enmascarado `ep-lucky-pine-***.neon.tech`, `neondb`) |
| Migración 0003 (aditiva) | aplicada (`migrate deploy` OK): `control_actions.idempotency_key` (text) + `dry_run` (bool default true) + UNIQUE parcial `(device_id, idempotency_key) WHERE idempotency_key IS NOT NULL`; **no altera enums ni datos** ✅ |
| Secretos trackeados | ninguno ✅ |
| `.env` (incl. db/api/iot-bridge/vercel) | gitignored ✅ |
| `DATABASE_URL` / connection strings en archivos versionados | no ✅ |
| apps/web | bajo DEMO_MODE (`true`), sin cambios visuales; web client `controlApi.*` (9 métodos) preparatorio (no usado por la UI) ✅ |
| MQTT downlink / comando físico | ninguno — toda acción es **dry-run** (sin downlink, sin iot-bridge downlink) ✅ |
| Automatización autónoma / reacción a alertas | ninguna — schedules/limits **solo persisten política**, no ejecutan (sin scheduler) ✅ |
| Alcance Fase 7 (hardening: seguridad/observabilidad/E2E/despliegue) | NO tocado ✅ |
| Working tree | cambios de Fase 6 acotados a módulo `control`/`shared/control`/migración 0003/`app.ts`/web client + docs ✅ |
| typecheck -r | ✅ |
| build:api / build:web | ✅ (web 12 rutas demo intacta bajo DEMO_MODE) |
| lint | ✅ (1 warning preexistente, deuda demo) |

Nota: la verificación funcional completa (suite API contra Neon incl. los 26 tests de control + iot-bridge/DB) se registra en `docs/audit/phase-6-runtime-verification.md`. Las suites de Fases 1–5 estaban verdes al iniciar Fase 6; sin regresiones. La reconciliación contrato↔canon y el modelo de datos se detallan en `docs/audit/phase-6-control-data-model-audit.md` y `phase-6-spec-readiness.md`.
