# Fase 5 — Spec Readiness (Alertas y Recomendaciones)

> Fecha: 2026-06-03 · Rama `feat/phase-5-alerts-recommendations`.

## Endpoints autorizados
- `GET /installations/:installationId/alerts` (status/severity/from/to/limit)
- `PATCH /alerts/:id/review` (status reviewed|dismissed, note?) — RBAC owner/admin/operator
- `GET /installations/:installationId/recommendations` (status/limit)

## Entidades DB usadas
`alerts`, `recommendations` (+ lectura de `telemetry_readings`, `energy_aggregates`, `devices`, `installations`, `tariffs` para evaluación/ahorro), `audit_logs` (review). Reutiliza Fase 1–4. **No control_actions.**

## ⚠️ Divergencia detectada y reconciliación (decisión SDD)
El prompt de Fase 5 propone vocabularios que **NO coinciden** con el canon/Prisma. Se reconcilia así (canon = verdad de persistencia; API mapea):

| Aspecto | Prompt (API ilustrativo) | Canon/Prisma (persistencia) | Reconciliación |
|---|---|---|---|
| Alert `type` | anomaly, high_consumption, device_high, offline, projection_risk (5) | `AlertType`: anomaly, high_device, over_budget, offline (4) | **API expone los 4 canónicos.** Las 5 reglas mapean: anomaly→anomaly, device_high→high_device, high_consumption→over_budget, projection_risk→over_budget, offline→offline. El detalle fino va en `context.subtype`. |
| Alert `detected_at` / `metadata` | campos del API | `created_at` / `context` (jsonb) | API: `detected_at`=`created_at`, `metadata`=`context`. |
| Recommendation `type` | reduce_usage, schedule_shift, inspect_device, tariff_review, standby_reduction | (no existe columna) | **Migración aditiva 0002**: `recommendations.type text NULL` (validado por Zod en app). |
| Recommendation `estimated_saving_kwh` | campo del API | (no existe columna) | **Migración 0002**: `recommendations.estimated_saving_kwh numeric(14,4) NULL`. |
| Recommendation `status` | active, dismissed, applied | `new`, `applied`, `dismissed` | API mapea `new`↔`active` (alias); persistencia usa canon. |
| Recommendation `priority` | low, medium, high | `Int` (0,1,2) | API mapea int↔enum (0=low,1=medium,2=high). |
| Recommendation `source` | (no en API) | alert \| periodic_analysis | Se conserva en DB; Fase 5 prioriza `source='alert'`. |

**Migración 0002 = aditiva y no destructiva** (solo 2 columnas NULL en `recommendations`; no altera enums existentes, no toca datos). Justificada por el contrato de Fase 5.

## Reglas de negocio
- BR-031: ahorro CLP solo con tarifa (BillingService); si no, `estimated_saving_clp=null`. **Nunca inventar dinero ni prometer ahorro garantizado.**
- No duplicar alertas `open` iguales (installation+device+type+ventana).
- Alertas con `severity` y `status=open` por defecto; pertenecen a installation; device opcional.
- Recomendaciones derivan de evidencia (Fase 5: principalmente de alertas, `source='alert'`).
- Tenant-scope estricto; review con RBAC operate (owner/admin/operator); viewer NO revisa.
- Review audita (`alert.review`), append-only; no borra alertas.

## Exclusiones explícitas (Fase 6+)
Control remoto, encendido/apagado, smart-control, automatización, comandos IoT/MQTT, NILM avanzado, predicción avanzada, UI productiva conectada.

## Riesgos
- Evaluación sin scheduler real (función interna `evaluateInstallationAlerts`, invocada en tests; worker = fase posterior).
- Baselines pobres con poca telemetría → reglas exigen evidencia mínima para no generar falsos positivos.
- Tiempos UTC (tz local diferida, como Fase 4).
