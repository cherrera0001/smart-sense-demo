# Fase 5 — Auditoría OpenAPI ↔ Implementación (Alertas / Recomendaciones)

> Fecha: 2026-06-04 · Rama: `feat/phase-5-alerts-recommendations`.
> Reconcilia el contrato OpenAPI (`specs/04-api/openapi.yaml` / `api-overview.md`) con los endpoints de alertas y recomendaciones implementados en `apps/api/src/modules/{alerts,recommendations}/` y su cobertura de tests, para el alcance de Fase 5.
> **Verificación contract-first manual:** los paths se cotejaron 1:1 contra el contrato a mano (sin tooling automático de validación OpenAPI), consistente con Fases 2–4.

## Endpoints de Fase 5 (implementados)

> 3 endpoints. Todos: presentes en OpenAPI (`OpenAPI=sí`), implementados (`Implementado=sí`), con cobertura de tests (`Test=sí`), **Estado=PASS**.
> Tests: **21 tests de Fase 5 PASS** (alerts 13 + recommendations 8) dentro de la suite API (**114/114** total contra Neon real: 39 Fase 2 + 17 telemetría + 11 billing + 7 dashboard + 9 reports + 9 breakdown + 13 alerts + 8 recommendations; la suite de dashboard incluye la regresión de `alerts_pending_count`).

| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| GET `/installations/{id}/alerts` | sí | sí | sí (13) | PASS |
| PATCH `/alerts/{id}/review` | sí | sí | sí | PASS |
| GET `/installations/{id}/recommendations` | sí | sí | sí (8) | PASS |

**Total Fase 5: 3/3 endpoints — OpenAPI=sí, Implementado=sí, Test=sí, Estado=PASS.**

## Nota de reconciliación (canon = persistencia; API mapea)

El vocabulario ilustrativo del prompt de Fase 5 **no coincide 1:1** con el canon/Prisma. Se reconcilió tratando la persistencia como verdad y mapeando en el API (decisión SDD ya registrada en `docs/audit/phase-5-spec-readiness.md`):

| Aspecto | API (expuesto) | Canon/Prisma (persistencia) | Reconciliación |
|---|---|---|---|
| Alert `type` | `anomaly` · `high_device` · `over_budget` · `offline` (4 canónicos) | `AlertType` (4) | Las **5 reglas** mapean a los 4 tipos; el detalle fino va en `context.subtype` (`high_consumption`/`projection_risk` → `over_budget`). |
| Alert `detected_at` / `metadata` | campos del API | `created_at` / `context` (jsonb) | `detected_at`=`created_at`, `metadata`=`context`. |
| Recommendation `type` | `reduce_usage`/`tariff_review`/`inspect_device`… | **columna nueva `type text NULL`** | Aportada por **migración aditiva 0002** (validada por Zod en app). |
| Recommendation `estimated_saving_kwh` | campo del API | **columna nueva `numeric(14,4) NULL`** | Aportada por **migración 0002** (+ CHECK no-neg). |
| Recommendation `status` | `active`/`dismissed`/`applied` | `new`/`applied`/`dismissed` | API mapea `new` ↔ `active` (alias); persistencia usa canon. |
| Recommendation `priority` | `low`/`medium`/`high` | `Int` (0/1/2) | API mapea int ↔ enum. |

**Migración 0002 = aditiva y no destructiva:** solo 2 columnas NULL en `recommendations` + 1 CHECK; no altera enums existentes ni datos. Aplicada con `migrate deploy` OK contra Neon dev.

## Nota de superset (extensión contract-first)

Como en Fase 4, los cuerpos de respuesta implementados son un **superset** del shape original del `openapi.yaml` (**paths conservados 1:1**, shapes más ricos):

- **alerts (GET):** `items[{id, type, severity, status, title, message, device_id, detected_at, reviewed_at, metadata}]`, `installation_id`, `total`.
- **alerts (PATCH review):** `{ id, status, reviewed_at }`.
- **recommendations (GET):** `items[{id, alert_id, type, priority, title, message, estimated_saving_clp, estimated_saving_kwh, status, created_at}]`, `installation_id`, `total`.

**Decisión documentada:** se trata el shape implementado como **extensión contract-first** (superset retrocompatible). **No se reescribe el `openapi.yaml`**; se reconcilia el `yaml` con estos shapes (y los de Fase 4) en Fase 7 (hardening) junto con la incorporación de validación OpenAPI en CI.

## Cobertura de casos de prueba (resumen)

Los 21 tests de Fase 5 cubren, además del happy path:
- **alerts (13):** empty state; filtros `status`/`severity`/`from`/`to`/`limit` (default `status=open`); lectura pura (no evalúa); tenant 403; **review** open→reviewed/dismissed con `reviewed_at`/`reviewedBy`; **RBAC viewer → 403** en review; **audit_log `alert.review`** registrado; review no borra (append-only); dedup de alertas (ventana 24h, skip si existe open igual installation+device+type); **sin baseline → no alerta**; regla offline.
- **recommendations (8):** empty state; filtros `status` (`active`/`dismissed`/`applied`/`all`, default `active`); derivación 1 recomendación por alerta (`source='alert'`); `estimated_saving_kwh` = 10% del exceso observado (null si no hay base reducible); `estimated_saving_clp` null sin tarifa / number con tarifa (BR-031); textos **sin "garantizado"**; dedup (no duplica activa equivalente); **0 control_actions / 0 side-effects**.
- **dashboard (regresión):** `alerts_pending_count` real (count `alerts status=open`): 0/N, reviewed/dismissed no cuentan, leer no crea alertas.

## Endpoints en OpenAPI NO implementados (Fase 6+)

> Presentes en el contrato pero **DIFERIDOS** por fase; fuera del alcance de Fase 5.

| Grupo | Endpoint(s) | Estado | Fase prevista |
|---|---|---|---|
| Bills | POST/GET `/installations/{id}/bills` | DIFERIDO | Fase posterior (UI/CRUD boletas) |
| Control | POST `/devices/{id}/control-*`, GET `/devices/{id}/control-state` | DIFERIDO | Fase 6 |

> El motor de evaluación `AlertEvaluationService.evaluateInstallationAlerts` es una **función interna** (no endpoint público); su disparo por scheduler/worker es fase posterior. El GET `/alerts` es **lectura pura** (no evalúa).

## Veredicto

Contrato y código alineados 1:1 a nivel de **paths** para los 3 endpoints de Fase 5 (verificación manual); shapes implementados = **superset** documentado; `recommendations.type`/`estimated_saving_kwh` aportados por la **migración aditiva 0002**. Cobertura de tests completa (21/21 Fase 5, dentro de 114/114 API contra Neon real). Endpoints de fases posteriores correctamente diferidos. **Fase 5 PASS.**
