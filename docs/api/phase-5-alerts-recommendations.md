# Guía de API — Fase 5: Alertas / Recomendaciones

> Fecha: 2026-06-04 · Rama: `feat/phase-5-alerts-recommendations`.
> Guía operativa de los **3 endpoints** de Fase 5 (alertas y recomendaciones backend). Lectura + review; costeo CLP en backend (BR-031). Contrato base en `specs/04-api/openapi.yaml` (los shapes implementados son un **superset** documentado; `recommendations.type`/`estimated_saving_kwh` provienen de la **migración aditiva 0002**; ver `docs/audit/phase-5-openapi-implementation-audit.md`).

## Autenticación y autorización

- **JWT obligatorio:** `Authorization: Bearer <access_token>` (`app.authenticate`).
- **Tenant-scope:** lectura bajo `assertInstallationAccess(read)`. Acceso a una instalación de otra organización → **403**.
- **RBAC:** `PATCH /alerts/{id}/review` requiere `ROLES.operate` (owner/admin/operator); **viewer → 403**.

## Convenciones comunes

- **Tiempos:** ISO8601 en **UTC**. El timezone de presentación de la instalación es fase posterior.
- **Energía:** `kWh` (number). **Dinero:** `CLP` entero (integer) o `null`.
- **Costeo (BR-031):** `estimated_saving_clp` solo si hay tarifa efectiva; sin tarifa → `null` (nunca se inventa). Textos sin "garantizado".

## Mapeo API ↔ canon (persistencia)

| API | Persistencia (Prisma) |
|---|---|
| alert `type` (`anomaly`/`high_device`/`over_budget`/`offline`, 4) | `AlertType` (4); subtype fino en `context.subtype` |
| alert `detected_at` / `metadata` | `created_at` / `context` (jsonb) |
| recommendation `type` / `estimated_saving_kwh` | columnas nuevas (**migración 0002**) |
| recommendation `status` `active`/`dismissed`/`applied` | `new`/`applied`/`dismissed` (`new`↔`active`) |
| recommendation `priority` `low`/`medium`/`high` | `Int` (0/1/2) |

---

## 1. GET `/installations/{id}/alerts`

Lista alertas del tenant. **Lectura pura — no evalúa.**

**Query params:**

| Param | Default | Notas |
|---|---|---|
| `status` | `open` | filtra por estado |
| `severity` | — | filtra por severidad |
| `from` / `to` | — | rango UTC sobre `detected_at` |
| `limit` | — | máximo de items |

**Respuesta (200):**
```json
{
  "installation_id": "inst-uuid",
  "items": [
    {
      "id": "alert-uuid",
      "type": "over_budget",
      "severity": "high",
      "status": "open",
      "title": "Consumo del día sobre lo habitual",
      "message": "El consumo de hoy supera el promedio reciente.",
      "device_id": null,
      "detected_at": "2026-06-04T13:45:00Z",
      "reviewed_at": null,
      "metadata": { "subtype": "high_consumption", "baseline_kwh": 4.2, "today_kwh": 6.1 }
    }
  ],
  "total": 1
}
```

| Campo | Notas |
|---|---|
| `type` | `anomaly` · `high_device` · `over_budget` · `offline` (4 canónicos) |
| `metadata.subtype` | detalle fino (`high_consumption`/`projection_risk` → `over_budget`) |
| `detected_at` | = `created_at` (UTC) |
| `metadata` | = `context` (jsonb) |
| `reviewed_at` | UTC; `null` si no revisada |

---

## 2. PATCH `/alerts/{id}/review`

Marca una alerta como `reviewed` o `dismissed`. **RBAC `ROLES.operate`** (viewer → 403). **No borra** (append-only); escribe `audit_log` action `'alert.review'`.

**Body:**
```json
{ "status": "reviewed", "note": "Revisado, sin acción." }
```

| Campo | Notas |
|---|---|
| `status` | `reviewed` o `dismissed` |
| `note` | opcional |

**Respuesta (200):**
```json
{ "id": "alert-uuid", "status": "reviewed", "reviewed_at": "2026-06-04T14:00:00Z" }
```

Setea `reviewed_at`/`reviewedBy`. Las alertas `reviewed`/`dismissed` **no cuentan** en `dashboard.alerts_pending_count`.

---

## 3. GET `/installations/{id}/recommendations`

Lista recomendaciones derivadas de alertas (`source='alert'`).

**Query params:**

| Param | Default | Notas |
|---|---|---|
| `status` | `active` | `active` / `dismissed` / `applied` / `all` |
| `limit` | — | máximo de items |

**Respuesta (200):**
```json
{
  "installation_id": "inst-uuid",
  "items": [
    {
      "id": "rec-uuid",
      "alert_id": "alert-uuid",
      "type": "reduce_usage",
      "priority": "high",
      "title": "Reduce el consumo en horas peak",
      "message": "Podrías reducir el exceso observado del día.",
      "estimated_saving_clp": 1200,
      "estimated_saving_kwh": 0.61,
      "status": "active",
      "created_at": "2026-06-04T13:46:00Z"
    }
  ],
  "total": 1
}
```

| Campo | Notas |
|---|---|
| `type` | `reduce_usage`/`tariff_review`/`inspect_device` (mapeado desde la alerta de origen) |
| `priority` | `low`/`medium`/`high` (int en DB) |
| `estimated_saving_kwh` | 10% del **exceso observado**; `null` si no hay base reducible |
| `estimated_saving_clp` | entero CLP o `null` sin tarifa (**BR-031**) |
| `status` | `active` (DB `new`) / `dismissed` / `applied` |

---

## Reglas de evaluación (motor interno)

> `AlertEvaluationService.evaluateInstallationAlerts` es una **función interna** (no endpoint público; scheduler = fase posterior). El GET `/alerts` no evalúa.

| Regla (API type) | Umbral | Evidencia |
|---|---|---|
| `high_consumption` → `over_budget` | `today > baseline*1.3` | baseline ≥3 días |
| `device_high` → `high_device` | device > 50% del total 7d | total 7d > 0 |
| `offline` | última señal >60 min | kit `active` + estuvo online antes |
| `projection_risk` → `over_budget` | proyección mes > `prev*1.2` | mes previo con datos |
| `anomaly` | lectura > 3·stddev | ≥5 días de historia |

**Sin evidencia/baseline → no genera alerta.** Tiempos UTC.

## Dedup

- **Alertas:** ventana 24h; skip si existe una `open` igual por **installation + device + type**.
- **Recomendaciones:** no duplica una recomendación **activa equivalente**.

## Ahorro CLP (BR-031)

- `estimated_saving_clp` se computa en backend vía `BillingService` a partir de `estimated_saving_kwh` y la tarifa efectiva.
- **Sin tarifa efectiva → `null`.** Nunca se inventa un valor monetario ni se promete ahorro "garantizado".

## Empty states

- **alerts:** sin alertas → `items=[]`, `total=0`.
- **recommendations:** sin recomendaciones → `items=[]`, `total=0`.

## Errores

| Código | Causa |
|---|---|
| 401 | Falta/expira el JWT |
| 403 | Instalación de otra organización (`CROSS_TENANT_DENIED`) o **viewer en review** (RBAC) |
| 404 | Instalación/alerta inexistente |
| 422 | Query/body inválido (p. ej. `status` no permitido, `from>to`) |

## Notas de implementación

- **Migración aditiva 0002:** `recommendations.type` + `estimated_saving_kwh` (+ CHECK no-neg); no altera enums ni datos.
- **0 side-effects:** evaluación y lecturas no generan `control_actions` (Fase 6).
- **Web client preparatorio:** `apps/web/lib/api/client.ts` expone `insightsApi.getAlerts/reviewAlert/getRecommendations` (no usados por la UI; fallan bajo DEMO_MODE).
- **Referencias:** `docs/implementation/phase-5-summary.md`, `docs/audit/phase-5-{precheck,spec-readiness,openapi-implementation-audit,runtime-verification}.md`.
