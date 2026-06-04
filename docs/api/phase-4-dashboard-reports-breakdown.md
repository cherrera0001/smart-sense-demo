# Guía de API — Fase 4: Dashboard / Reports / Breakdown

> Fecha: 2026-06-03 · Rama: `feat/phase-4-dashboard-reports`.
> Guía operativa de los **6 endpoints de lectura agregada** de Fase 4. Solo lectura; costeo CLP en backend (BR-031). Contrato base en `specs/04-api/openapi.yaml` (los shapes implementados son un **superset** documentado; ver `docs/audit/phase-4-openapi-implementation-audit.md`).

## Autenticación y autorización

- **JWT obligatorio:** `Authorization: Bearer <access_token>` (`app.authenticate`).
- **Tenant-scope:** todos bajo `assertInstallationAccess(read)`. Acceso a una instalación de otra organización → **403**.
- Rol mínimo: `viewer+` (cualquier membership activa con permiso de lectura).

## Convenciones comunes

- **Tiempos:** ISO8601 en **UTC**. El timezone de presentación de la instalación es fase posterior.
- **Energía:** `kWh` (number). **Potencia:** `W` (number). **Dinero:** `CLP` entero (integer) o `null`.
- **Costeo (BR-031):** `cost_clp = Math.round(energy_kwh * tariff.energy_price_clp_kwh)`, **solo cargo por energía**. Sin tarifa efectiva → `cost_clp = null` (nunca se inventa).
- **Tarifa efectiva** (`BillingService.getEffectiveTariffForInstallation`): `installation.tariffId` → tarifa de la boleta `confirmed` más reciente → `null`.
- **Estrategia de datos:** se prefieren `energy_aggregates` en el rango; si no hay agregados, fallback a `telemetry_readings` (`SUM(energy_wh_delta)/1000`, `MAX(active_power_w)`). **No se mezclan fuentes.**

### `data_status`

| Endpoint | Valores | Criterio |
|---|---|---|
| dashboard | `live` · `stale` · `empty` | `live` ≤15 min; `stale` >15 min; `empty` sin lecturas |
| reports | `complete` · `partial` · `empty` | todos / algunos / ningún bucket con datos |
| breakdown | `complete` · `partial` · `empty` | análogo, sobre devices medidos |

---

## 1. GET `/installations/{id}/dashboard`

Estado vivo + acumulados del día/mes + comparación con el periodo anterior.

**Respuesta (200):**
```json
{
  "current_power_w": 1420.5,
  "today_energy_kwh": 6.32,
  "today_cost_clp": 980,
  "month_energy_kwh": 142.7,
  "month_cost_clp": 22130,
  "comparison": {
    "previous_period_energy_kwh": 158.4,
    "delta_percent": -9.9
  },
  "latest_reading_timestamp": "2026-06-03T13:45:00Z",
  "device_count": 7,
  "alerts_pending_count": 0,
  "data_status": "live"
}
```

| Campo | Notas |
|---|---|
| `current_power_w` | Última lectura (`active_power_w`); `null` si no hay lecturas |
| `today_energy_kwh` / `month_energy_kwh` | Acumulados (UTC) |
| `today_cost_clp` / `month_cost_clp` | Entero CLP o `null` sin tarifa (BR-031) |
| `comparison.previous_period_energy_kwh` | Energía del periodo anterior equivalente |
| `comparison.delta_percent` | Variación % respecto del periodo anterior |
| `latest_reading_timestamp` | UTC; `null` si vacío |
| `device_count` | Devices de la instalación |
| `alerts_pending_count` | **Fijo 0** (Fase 5 no implementada) |
| `data_status` | `live` / `stale` (>15min) / `empty` |

---

## 2-5. GET `/installations/{id}/reports/{daily|weekly|monthly|last-three-months}`

Serie temporal de buckets con energía, costo y pico de potencia. Los buckets vacíos se incluyen.

| Granularidad | Buckets |
|---|---|
| `daily` | horas del día |
| `weekly` | 7 días |
| `monthly` | días del mes |
| `last-three-months` | 3 meses |

**Respuesta (200):**
```json
{
  "points": [
    { "bucket_start": "2026-06-03T00:00:00Z", "energy_kwh": 0.42, "cost_clp": 65, "peak_power_w": 1200.0 },
    { "bucket_start": "2026-06-03T01:00:00Z", "energy_kwh": 0.0,  "cost_clp": 0,  "peak_power_w": 0.0 }
  ],
  "totals": { "energy_kwh": 6.32, "cost_clp": 980, "peak_power_w": 2400.0 },
  "data_status": "partial"
}
```

| Campo | Notas |
|---|---|
| `points[].bucket_start` | Inicio del bucket (UTC) |
| `points[].energy_kwh` | Energía del bucket (0 si vacío) |
| `points[].cost_clp` | Entero CLP o `null` sin tarifa (BR-031) |
| `points[].peak_power_w` | Pico de potencia del bucket |
| `totals` | **Derivados de `points[]`** → cuadran por construcción |
| `data_status` | `complete` / `partial` / `empty` |

---

## 6. GET `/installations/{id}/breakdown?from&to&group_by`

Desglose de energía por dispositivo o categoría.

**Query params:**

| Param | Default | Notas |
|---|---|---|
| `from` / `to` | últimos 7 días | Rango UTC; si se omiten, ventana de 7 días |
| `group_by` | `device` | `device` o `category` |

**Respuesta (200):**
```json
{
  "items": [
    { "id": "dev-uuid", "name": "Refrigerador", "category": "refrigeracion", "energy_kwh": 3.1, "cost_clp": 480, "percentage": 49.1 },
    { "id": "dev-uuid2", "name": "Aire acondicionado", "category": "climatizacion", "energy_kwh": 3.22, "cost_clp": 500, "percentage": 50.9 }
  ],
  "total_energy_kwh": 6.32,
  "total_cost_clp": 980,
  "data_status": "complete"
}
```

| Campo | Notas |
|---|---|
| `items[]` | **Solo devices con energía medida** (no inventa, no NILM) |
| `items[].percentage` | `energy/total*100` (0 si total 0); suman ~100 |
| `items[].cost_clp` | Entero CLP o `null` sin tarifa (BR-031) |
| `total_energy_kwh` | `= Σ items.energy_kwh` |
| `total_cost_clp` | `= Σ items.cost_clp` (null sin tarifa) |
| `data_status` | `complete` / `partial` / `empty` |

---

## Empty states (resumen)

- **dashboard:** sin lecturas → `data_status=empty`; `current_power_w`/`latest_reading_timestamp` = null; energías 0; costos null o 0 según tarifa.
- **reports:** sin datos → buckets con `energy_kwh=0`, `data_status=empty`; `totals` siguen cuadrando.
- **breakdown:** `total=0` → `items` vacío / `percentage=0`, `data_status=empty`.

## Errores

| Código | Causa |
|---|---|
| 401 | Falta/expira el JWT |
| 403 | Instalación de otra organización (`CROSS_TENANT_DENIED`) |
| 404 | Instalación inexistente |
| 422 | Query inválida (p. ej. `group_by` no permitido, `from>to`) |

## Notas de implementación

- **Sin migración nueva:** reutiliza tablas de Fase 1.
- **0 side-effects:** las lecturas no generan alertas/recomendaciones/control.
- **Web client preparatorio:** `apps/web/lib/api/client.ts` expone `energyApi.getDashboard/getReports*/getBreakdown` (no usados por la UI; fallan bajo DEMO_MODE).
- **Referencias:** `docs/implementation/phase-4-summary.md`, `docs/audit/phase-4-{spec-readiness,openapi-implementation-audit,runtime-verification}.md`.
