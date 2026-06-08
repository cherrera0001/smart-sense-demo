# Fase 5 — Resumen de Implementación (Alertas y Recomendaciones · backend)

> Fecha: 2026-06-04 · Rama: `feat/phase-5-alerts-recommendations` · Monorepo `smartsense-brownfield`.
> Implementa el plano **backend** de Fase 5: motor de evaluación de **alertas** basadas en evidencia, módulo de lectura/review de alertas, derivación de **recomendaciones** desde alertas y el `alerts_pending_count` real del dashboard, sobre la DB de Fases 1–4 (Neon real). Estrategia A (Preserve UI) intacta: la demo no consume la API (DEMO_MODE).

## Qué se implementó

### `AlertEvaluationService` (`apps/api/src/modules/alerts/`) — función interna
- **`evaluateInstallationAlerts(prisma, installationId, opts?)`**: función **interna** (no endpoint público; scheduler/worker = fase posterior; invocada en tests). **5 reglas basadas en evidencia**, con **dedup** (ventana 24h: skip si ya existe una alerta `open` igual por installation+device+type):
  - **`high_consumption` → `over_budget`** (subtype): baseline ≥3 días, `today > baseline*1.3`.
  - **`device_high` → `high_device`**: device > 50% del total de 7 días.
  - **`offline`**: device de kit `active`, última señal >60 min, **requiere haber estado online antes**.
  - **`projection_risk` → `over_budget`** (subtype): proyección del mes > `prev_month*1.2`.
  - **`anomaly`**: lectura > 3·stddev, con ≥5 días de historia.
- **Sin evidencia/baseline suficiente → NO genera alerta** (evita falsos positivos). Tiempos en **UTC**. **NO crea `recommendations` ni `control_actions`.**

### Módulo `alerts` (lectura + review)
- **GET `/installations/{id}/alerts`** (JWT + `assertInstallationAccess(read)`): query `status`/`severity`/`from`/`to`/`limit` (default `status=open`). Respuesta: `{ installation_id, items[{id, type, severity, status, title, message, device_id, detected_at, reviewed_at, metadata}], total }`. **Lectura pura — no evalúa.**
- **PATCH `/alerts/{id}/review`** (JWT + RBAC `ROLES.operate`; **viewer → 403**): body `status` ∈ `reviewed`/`dismissed` + `note?`. Setea `reviewed_at`/`reviewedBy`; escribe `audit_log` action `'alert.review'`; **no borra** (append-only). Respuesta: `{ id, status, reviewed_at }`.

### `RecommendationService` (`apps/api/src/modules/recommendations/`)
- **`generateForAlert(prisma, alert)`**: deriva **1 recomendación** por alerta (`source='alert'`, status DB `new` ↔ API `active`). Mapeo de `type`:
  - `over_budget`(`high_consumption`) → `reduce_usage`
  - `over_budget`(`projection_risk`) → `tariff_review`
  - `high_device`/`offline`/`anomaly` → `inspect_device`
- **`estimated_saving_kwh`** = 10% del **exceso observado** del `context` (`null` si no hay base reducible).
- **`estimated_saving_clp`** vía `BillingService` (`null` sin tarifa, **BR-031**; nunca inventa dinero).
- Textos **sin "garantizado"**. **Dedup** (no duplica una recomendación activa equivalente). **NO crea `control_actions`.**

### Módulo `recommendations` (lectura)
- **GET `/installations/{id}/recommendations`** (JWT + `read`): query `status` ∈ `active`/`dismissed`/`applied`/`all` (default `active`) + `limit`. Respuesta: `{ installation_id, items[{id, alert_id, type, priority, title, message, estimated_saving_clp, estimated_saving_kwh, status, created_at}], total }`.

### Dashboard — `alerts_pending_count` real
- `DashboardService`: `alerts_pending_count` pasa de **literal 0** (Fase 4) a **conteo real** (`count alerts status=open`). Solo lectura: **no crea alertas**; `reviewed`/`dismissed` no cuentan.

### Migración aditiva 0002 (`packages/db/prisma/migrations/0002_phase5_recommendations/`)
- `ALTER TABLE recommendations ADD COLUMN type text NULL` + `estimated_saving_kwh numeric(14,4) NULL` + CHECK no-neg (`estimated_saving_kwh IS NULL OR >= 0`).
- **Aditiva y no destructiva:** no altera enums existentes ni datos. Aplicada con `migrate deploy` OK contra Neon dev.

### Shared schemas (`packages/shared/src/schemas/`)
- `alerts.ts` extendido + `recommendations.ts` **nuevo** + `dashboard.ts` (`alerts_pending_count` de literal 0 a `number`).

### Web client (preparatorio, `apps/web/lib/api/client.ts`)
- Añadidos `insightsApi.getAlerts`/`reviewAlert`/`getRecommendations` **preparatorios**: no usados por la UI; fallan bajo DEMO_MODE. **DEMO_MODE sigue `true`; la demo queda intacta.**

## Reglas de alertas (umbrales / evidencia / dedup)
| Regla (API type) | Umbral | Evidencia mínima |
|---|---|---|
| `high_consumption` → `over_budget` | `today > baseline*1.3` | baseline ≥3 días |
| `device_high` → `high_device` | device > 50% del total 7d | total 7d > 0 |
| `offline` | última señal >60 min | kit `active` + haber estado online antes |
| `projection_risk` → `over_budget` | proyección mes > `prev*1.2` | mes previo con datos |
| `anomaly` | lectura > 3·stddev | ≥5 días de historia |

- **Dedup:** ventana 24h; skip si existe `open` igual por installation+device+type.
- **Sin evidencia/baseline → no alerta.** Tiempos UTC.

## Reglas de recomendaciones (ahorro observado, BR-031)
- `estimated_saving_kwh` = **10% del exceso observado** del `context` de la alerta (`null` si no hay base reducible — no inventa).
- `estimated_saving_clp` = `BillingService` (entero CLP, **`null` sin tarifa efectiva — BR-031**).
- Textos sin promesas de ahorro "garantizado". Dedup de activas equivalentes. `source='alert'`.

## Qué NO se implementó (Fase 6+)
- **Control remoto** de dispositivos (on/off, smart-control, automatización, comandos IoT/MQTT) — Fase 6.
- **Scheduler/worker** que dispare `evaluateInstallationAlerts` automáticamente — fase posterior (la función es interna; en Fase 5 se invoca en tests).
- **NILM / desagregación** avanzada y **predicción** avanzada — fuera de MVP / fase posterior.
- **`estimatedImpactClp` en alertas** — las alertas no llevan impacto CLP; el costeo va en las recomendaciones.
- **`NotificationService`** (in_app/email/push) y **UI productiva** (`/alerts`, `/breakdown`) — entrega frontend posterior.
- **Timezone local** de presentación — todo en UTC.

## Tenant-scope · RBAC · Audit
- Los 3 endpoints bajo JWT; lectura con `assertInstallationAccess(read)`; acceso a instalación ajena → **403**. Sin fugas cross-tenant.
- **RBAC:** `PATCH /alerts/{id}/review` requiere `ROLES.operate` (owner/admin/operator); **viewer → 403**.
- **Audit:** review escribe `audit_log` action `'alert.review'` (append-only); no borra alertas.

## Tests
- **API: 114/114 PASS contra Neon real** (`pnpm --filter @smartsense/api test`): 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + **13 alerts** + **8 recommendations**. Cubre: empty states, tenant 403, RBAC viewer 403 en review, audit en review, dedup de alertas/recomendaciones, sin baseline → no alerta, offline, savings null sin tarifa / number con tarifa, textos sin "garantizado", **0 control_actions / 0 side-effects**, dashboard `alerts_pending_count` real (0/N, reviewed no cuenta, leer no crea).
- **iot-bridge: 23/23 PASS** (sin cambios respecto de Fase 3).
- **DB: 18/18 PASS** (suite `db` contra Neon, sin cambios).
- `typecheck -r` ✅; `build:api`/`build:web` ✅ (web 12 rutas demo intacta bajo DEMO_MODE); `lint` ✅ (1 warning preexistente).

## Riesgos abiertos / limitaciones
1. **Sin scheduler real:** `evaluateInstallationAlerts` es interna; la generación periódica de alertas requiere un worker (fase posterior).
2. **Baselines pobres con poca telemetría:** las reglas exigen evidencia mínima → con datos escasos no se generan alertas (preferimos no-alerta a falso positivo).
3. **Tiempos UTC:** fronteras de día/mes pueden desfasar respecto del tz local del usuario.
4. **Sin `estimatedImpactClp` en alertas:** el impacto monetario solo se expresa en recomendaciones (BR-031).
5. **Ahorro estimado en kWh es heurístico** (10% del exceso observado): aproximación, no medición; `null` cuando no hay base reducible.
6. **Superset OpenAPI:** `yaml` pendiente de reconciliar con los shapes implementados (Fase 7).
7. Warning preexistente de lint (deuda demo, no bloqueante).

## Comandos para reproducir
```bash
pnpm install
pnpm -r typecheck
pnpm build:api
pnpm build:web                # demo (12 rutas, DEMO_MODE)
pnpm -r lint                  # 1 warning preexistente

# Migración aditiva 0002 + tests de API contra Neon real (DATABASE_URL en packages/db/.env, gitignored):
set -a; . packages/db/.env; set +a
pnpm db:migrate:deploy                       # incluye 0002_phase5_recommendations (aditiva)
pnpm --filter @smartsense/api test           # 114/114 PASS (+ alerts 13, recommendations 8, dashboard regresión)

# Suites complementarias (sin cambios desde Fase 3):
pnpm --filter @smartsense/iot-bridge test    # 23/23 PASS
pnpm test:db:external                         # 18/18 PASS
```

## Siguiente fase
**Fase 6 — Control:** `ControlService` (`/devices/{id}/control-actions` pending → downlink MQTT → resolveAction async; viewer → 403 + rejected auditado), `/control-state`, `/control-schedules` (solapamientos), `/consumption-limits` (positivos, `pre_alert_pct 1..100`, equipos críticos no se apagan automáticamente). Dependencias: Fase 2 (devices/RBAC), Fase 3 (telemetría para estado/límites), Fase 5 (alertas para pre-alerta/over_budget). **AUTORIZABLE.**
