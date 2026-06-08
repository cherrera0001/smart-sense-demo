# Fase 5 — Verificación de Runtime (Alertas / Recomendaciones / Dashboard contra Neon)

> Fecha: 2026-06-04 · Rama: `feat/phase-5-alerts-recommendations`.
> Registra los resultados reales de las suites de Fase 5 ejecutadas contra Postgres real (Neon dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`). Cubre el motor de evaluación + lectura/review de alertas, derivación/lectura de recomendaciones y la regresión de `alerts_pending_count` del dashboard, con los conteos y criterios verificados.

## Entorno

- **DB:** Neon Postgres dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled). **Migración aditiva 0002** aplicada (`migrate deploy` OK): `recommendations.type` + `estimated_saving_kwh` + CHECK no-neg. **No altera enums ni datos.** Reutiliza `alerts`, `recommendations`, `telemetry_readings`, `energy_aggregates`, `devices`, `installations`, `tariffs`, `audit_logs` (Fases 1–4).
- **Comando:** `set -a; . packages/db/.env; set +a; pnpm db:migrate:deploy; pnpm --filter @smartsense/api test`.
- **Resultado global API:** **114/114 PASS** (39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations).

## Resultados verificados — Alerts (13 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | GET alerts con datos | `items[]` + `total`; `detected_at`=`created_at`, `metadata`=`context` | ✅ |
| 2 | Empty state | Sin alertas → `items=[]`, `total=0` | ✅ |
| 3 | Filtro `status` (default open) | Default `status=open`; filtra por estado | ✅ |
| 4 | Filtros `severity`/`from`/`to`/`limit` | Aplicados correctamente | ✅ |
| 5 | Lectura pura | GET no evalúa ni crea alertas | ✅ |
| 6 | Cross-tenant | Instalación de otra organización → **403** | ✅ |
| 7 | Review open→reviewed | `reviewed_at`/`reviewedBy` seteados; `{id,status,reviewed_at}` | ✅ |
| 8 | Review open→dismissed | Estado `dismissed`; no borra (append-only) | ✅ |
| 9 | RBAC viewer en review | viewer → **403** (requiere `ROLES.operate`) | ✅ |
| 10 | Audit en review | `audit_log` action `'alert.review'` registrado | ✅ |
| 11 | Evidencia / 5 reglas | `high_consumption`/`device_high`/`offline`/`projection_risk`/`anomaly` con umbrales | ✅ |
| 12 | Dedup (ventana 24h) | Skip si existe `open` igual installation+device+type | ✅ |
| 13 | Sin baseline → no alerta | Evidencia insuficiente → no genera alerta | ✅ |
| — | Offline | Device kit `active`, última señal >60min, requiere haber estado online antes | ✅ |
| — | 0 side-effects | Evaluación NO crea recommendations ni control_actions | ✅ |

## Resultados verificados — Recommendations (8 tests)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | GET recommendations con datos | `items[]` + `total`; status DB `new` ↔ API `active`; priority int ↔ low/medium/high | ✅ |
| 2 | Empty state | Sin recomendaciones → `items=[]`, `total=0` | ✅ |
| 3 | Filtro `status` (default active) | `active`/`dismissed`/`applied`/`all`; default `active` | ✅ |
| 4 | Derivación desde alerta | `generateForAlert` → 1 recomendación (`source='alert'`); mapeo de `type` | ✅ |
| 5 | `estimated_saving_kwh` | 10% del exceso observado; `null` si no hay base reducible | ✅ |
| 6 | `estimated_saving_clp` null sin tarifa | BR-031: `null` sin tarifa efectiva | ✅ |
| 7 | `estimated_saving_clp` number con tarifa | Entero CLP con tarifa (BillingService) | ✅ |
| 8 | Textos sin "garantizado" | Mensajes no prometen ahorro garantizado | ✅ |
| — | Dedup | No duplica una recomendación activa equivalente | ✅ |
| — | 0 control_actions | No crea acciones de control | ✅ |

## Resultados verificados — Dashboard (regresión `alerts_pending_count`)

| # | Caso | Criterio verificado | Resultado |
|---|---|---|---|
| 1 | Count real 0 | Sin alertas open → `alerts_pending_count=0` | ✅ |
| 2 | Count real N | N alertas `status=open` → `alerts_pending_count=N` | ✅ |
| 3 | reviewed/dismissed no cuentan | Alertas revisadas/descartadas no incrementan el contador | ✅ |
| 4 | Leer no crea | GET dashboard no genera alertas (solo lectura) | ✅ |

## Criterios transversales verificados

- **Evidencia:** las 5 reglas exigen baseline/historia mínima; sin evidencia → no-alerta (no falsos positivos).
- **Dedup:** alertas (ventana 24h, installation+device+type) y recomendaciones (activa equivalente) no se duplican.
- **Offline:** requiere kit `active` + haber estado online + última señal >60min.
- **Savings:** `estimated_saving_clp` null sin tarifa / number con tarifa (BR-031); textos sin "garantizado".
- **0 side-effects:** evaluación y lecturas no crean `control_actions` (Fase 6).
- **RBAC:** review requiere `ROLES.operate`; viewer → 403.
- **Audit:** review escribe `audit_log` `'alert.review'` (append-only, no borra).
- **Count real:** `alerts_pending_count` = count `alerts status=open` (antes literal 0).
- **Tiempos UTC.**

## Suites complementarias

| Suite | Resultado | Comando |
|---|---|---|
| iot-bridge | **23/23 PASS** (sin cambios desde Fase 3) | `pnpm --filter @smartsense/iot-bridge test` |
| DB (Fase 1) | **18/18 PASS** (sin cambios) | `pnpm test:db:external` |

## Veredicto

Runtime de Fase 5 verificado end-to-end contra Neon real: evaluación de alertas basada en evidencia (5 reglas + dedup + sin-baseline→no-alerta + offline), lectura/review con RBAC (viewer 403) y audit (`alert.review`), derivación/lectura de recomendaciones (ahorro observado, BR-031, textos sin "garantizado"), **0 control_actions / 0 side-effects** y `alerts_pending_count` real en dashboard. **Fase 5 PASS en runtime.**
