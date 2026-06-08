# Release SmartSense F0–F7 — Notas de versión

> Rama: `release/smartsense-f0-f7` (superset lineal de F0–F7, 45 commits sobre `master`).
> HEAD: `a8bc3b6`. Estado de Fase 8: **PARTIAL** (release branch + CI listos; deploy productivo/staging pendiente de autorización/hosting).
> Todos los secretos en placeholders (`USER:PASSWORD@HOST`). La credencial real de Neon fue rotada en Fase 7 y vive solo en `packages/db/.env` (gitignored).

## 0. Estado de release (Fase 8.1)

> **2026-06-06 · Staging Deployment Verification · READY-BLOCKED.**

| Item | Estado |
|---|---|
| Rama remota | ✅ `release/smartsense-f0-f7` pusheada a `origin` (`cherrera0001/smart-sense-demo`), **NO** master |
| CI | ✅ **PASS** (run `27052719013`, postgres:16 efímero) |
| PR | ✅ **#1 abierto** (base `master`, head release) — **solo revisión, sin merge**; riesgo de prod en el body |
| API staging | ⛔ **READY-BLOCKED** — sin CLI de hosting autenticado (flyctl ausente, railway sin login, render ausente, sin Docker) |
| Migrate / health / smoke remoto | ⛔ PENDIENTES (dependen de la API staging) |
| Vercel preview (web) | ⛔ previews del push FALLARON (root sin app Next); **pendiente de autorización** (riesgo de prod en `master`) |
| Producción | ✅ **INTACTA** (`master` sin cambios; Vercel `Ready`; settings no modificados) |

> PR: **https://github.com/cherrera0001/smart-sense-demo/pull/1**. Detalle en `docs/audit/phase-8-1-*.md` y `docs/release/release-checklist.md`.

## 1. Qué entrega cada fase

| Fase | Entrega |
|---|---|
| **F0** | Ordenamiento de specs y ADRs (gobierno, trazabilidad de 87 FR / 45 NFR). |
| **F0.5** | Reconciliación brownfield del demo (auditorías, estrategia de migración; sin acciones destructivas). |
| **F1** | Modelo relacional (21 tablas) en Prisma + Postgres; constraints, triggers append-only, hypertable con fallback; seeds. Verificado contra Neon real. |
| **F2** | API Fastify base: auth (JWT), RBAC multi-tenant, organizations, installations, devices, onboarding (19 endpoints). |
| **F3** | Ingestión idempotente de telemetría (`event_hash` UNIQUE), lectura latest/range, agregación horaria inline, iot-bridge en dry-run. |
| **F4** | Backend de lectura agregada: dashboard, reportes (daily/weekly/monthly/last-three-months), breakdown, costeo CLP (BillingService). |
| **F5** | Motor de alertas (5 reglas + dedup, función interna), recomendaciones con impacto CLP, `alerts_pending_count` real. |
| **F6** | Control de dispositivos **dry-run** (acciones, programaciones, límites); sin downlink físico ni MQTT; auditoría obligatoria. |
| **F7** | Hardening: rotación Neon, helmet/cors/rate-limit, refresh-token rotation, health/readyz, CI, Dockerfiles, secret-scan, smoke, observabilidad. |

## 2. Funcionalidades (contrato de API)

Endpoints F2–F7 disponibles bajo JWT (salvo health):

- **Auth:** `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, **`/auth/refresh`** (rotación).
- **Organizations:** `GET/POST /organizations`, `GET /organizations/{id}`.
- **Installations:** `GET/POST /installations`, `GET/PATCH /installations/{id}`.
- **Devices:** `GET /installations/{id}/devices`, `POST /devices`, `GET/PATCH /devices/{id}`.
- **Onboarding:** `/onboarding/kit/scan`, `/kit/claim`, `/devices/pair`, `GET /onboarding/status`.
- **Telemetry:** `POST /iot/telemetry`, `GET /installations/{id}/telemetry/{latest,range}`.
- **Dashboard:** `GET /installations/{id}/dashboard`.
- **Reports:** `GET /installations/{id}/reports/{daily,weekly,monthly,last-three-months}`.
- **Breakdown:** `GET /installations/{id}/breakdown`.
- **Alerts:** `GET /installations/{id}/alerts`, `PATCH /alerts/{id}/review`.
- **Recommendations:** `GET /installations/{id}/recommendations`.
- **Control (dry-run):** `/devices/{id}/control-actions`, `/control-state`, `/control-schedules`, `/consumption-limits`.
- **Ops:** `/health`, `/healthz` (liveness), `/readyz` (readiness `SELECT 1`).

## 3. Migraciones (4, todas aditivas / no destructivas)

| Migración | Contenido |
|---|---|
| `0001_init` | 21 tablas + hypertable (fallback `DO/EXCEPTION`) + triggers (`set_updated_at`, append-only audit). |
| `0002_phase5_recommendations` | `recommendations.type` (text) + `estimated_saving_kwh` (numeric) + CHECK no-neg. |
| `0003_phase6_control` | `control_actions.idempotency_key` (text) + `dry_run` (bool default true) + UNIQUE parcial. |
| `0004_phase7_refresh_tokens` | tabla `refresh_tokens` (jti + token_hash sha256). |

Todas aplicadas a Neon dev vía `prisma migrate deploy`. Ver runbook: `docs/deployment/database-migration-runbook.md`.

## 4. Tests ejecutados (sobre este HEAD)

| Suite | Resultado |
|---|---|
| API | ✅ 156/156 |
| DB (Neon dev) | ✅ 18/18 |
| iot-bridge | ✅ 23/23 |
| Smoke API local | ✅ 7 pasos |
| typecheck / lint / build:api / build:web | ✅ (1 warning preexistente) |

## 5. Estado CI

- `.github/workflows/ci.yml` — se dispara **on push**.
- Servicio `postgres:16` efímero (sin TimescaleDB → hypertable por fallback).
- Pipeline: `secret-scan → typecheck → lint → build (api/web/iot-bridge) → migrate:deploy + seed + test:db:external`.
- **No usa Neon real** (DB efímera de CI).
- Estado: ⏳ la corrida se verifica tras el push (ejecuta el orquestador).

## 6. Estado de deploy

- **PENDIENTE.** El hosting de la API (Railway/Render/Fly), el deploy de web (Vercel) y el smoke contra staging requieren credenciales/autorización de hosting no disponibles en esta fase.
- Build de imágenes Docker: BLOCKED por entorno local (Dockerfiles listos para CI). Ver `docs/audit/phase-8-local-validation.md`.

## 7. Variables requeridas

Detalle completo en `docs/deployment/environment-variables.md`. Resumen:

- **API:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `API_PORT`, `NODE_ENV=production`, `SERVICE_VERSION`.
- **Web:** `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_API_URL`.
- **iot-bridge:** `IOT_BRIDGE_MODE=dry-run`, `SMARTSENSE_API_URL`, `SMARTSENSE_API_TOKEN` (placeholder), `MQTT_BROKER_URL/USERNAME/PASSWORD` (placeholders).

## 8. Riesgos abiertos

- **Deploy productivo no ejecutado** → sin verificación runtime contra hosting real (Fase 8 PARTIAL).
- **Build de imágenes Docker** no validado localmente (BLOCKED por entorno).
- **Neon sin TimescaleDB** en dev → `telemetry_readings` es tabla normal (hypertable por fallback); en prod con Timescale revisar políticas de compresión/retención.
- **iot-bridge en dry-run** y **control en dry-run** → sin downlink físico (por diseño hasta autorización).
- **CORS** debe fijarse al dominio web real en prod (no wildcard).

## 9. Rollback (resumen)

- **Web:** revertir el deployment anterior en Vercel.
- **API:** redeploy de la imagen/commit anterior.
- **DB:** migraciones no destructivas → no se requiere `down` destructivo; ante incidente, restaurar backup/branch de Neon.
- **Secretos:** si se filtran, rotar (Neon `ALTER ROLE`, regenerar JWT secrets) y redeploy.

Detalle: `docs/deployment/rollback-plan.md`.

## 10. Checklist post-deploy

- [ ] `GET /healthz` → 200.
- [ ] `GET /readyz` → 200 (DB ok).
- [ ] Smoke remoto: register → login → installation → dashboard → alerts → recommendations.
- [ ] `CORS_ORIGIN` apunta al dominio web real (sin wildcard).
- [ ] `NEXT_PUBLIC_API_URL` (web) apunta a la API desplegada.
- [ ] `NEXT_PUBLIC_DEMO_MODE` con el valor decidido para el entorno.
- [ ] Control sigue en **dry-run** (sin downlink físico).
- [ ] iot-bridge en `dry-run` (sin conexión a broker).
- [ ] `prisma migrate status` → todas aplicadas, sin pendientes.
- [ ] Secretos solo en el hosting (no en el repo, no en build args).
