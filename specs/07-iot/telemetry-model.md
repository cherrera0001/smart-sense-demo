# Contrato de Lectura Energética (Telemetry Model) — SmartSense

> Deriva de `specs/_canon.md` (sección Telemetría) y `specs/03-data-model/relational-model.md` (tabla `telemetry_readings`).
> Este es el **contrato canónico** de una lectura. Los campos coinciden exactamente con `telemetry_readings`. Transporte en `mqtt-or-ingestion-contract.md`.

## 1. Campos del contrato

| Campo | Tipo (DB) | Origen | Oblig. | Semántica |
|---|---|---|---|---|
| `reading_id` | uuid | device/bridge | sí | id de la lectura (parte de PK lógica) |
| `device_id` | uuid | resuelto por API | sí | device emisor (FK→`devices`) |
| `kit_id` | uuid | resuelto por API | sí | kit del device |
| `installation_id` | uuid | resuelto por API | sí | instalación (scoping multi-tenant) |
| `source_timestamp` | timestamptz | device | sí | instante de medición en origen (UTC) |
| `received_timestamp` | timestamptz | API (`DEFAULT now()`) | sí | instante de recepción |
| `voltage_v` | numeric(8,2) | device | no | tensión, `>= 0` |
| `current_a` | numeric(10,3) | device | no | corriente, `>= 0` |
| `active_power_w` | numeric(12,2) | device | no | **potencia activa instantánea**, `>= 0` |
| `reactive_power_var` | numeric(12,2) | device | no | potencia reactiva |
| `apparent_power_va` | numeric(12,2) | device | no | potencia aparente, `>= 0` |
| `power_factor` | numeric(4,3) | device | no | factor de potencia, `∈ [-1, 1]` |
| `energy_wh_delta` | numeric(14,4) | device | no | **energía consumida desde la lectura previa** (Wh), `>= 0` |
| `frequency_hz` | numeric(6,3) | device | no | frecuencia de red |
| `signal_quality` | int | device | no | calidad de señal (RSSI u otro) |
| `firmware_version` | text | device | no | firmware del device |
| `raw_payload` | jsonb | bridge | no | payload original sin transformar |
| `ingestion_status` | text | API | sí | `accepted \| duplicate \| invalid` |
| `event_hash` | text | device/bridge | sí | huella de idempotencia (`UNIQUE`) |

- PK lógica: `(device_id, source_timestamp, reading_id)`. Idempotencia fuerte por `UNIQUE(event_hash)`.
- Hypertable Timescale particionada por `source_timestamp`.

## 2. Frecuencia esperada

- Telemetría periódica cada **5–30 s** por device (configurable por modelo/kit). El dashboard en vivo asume datos sub-minuto.
- La frecuencia declarada define la **ventana de offline**: si un device `meter` no reporta tras N intervalos (ej. 3× la frecuencia esperada, mínimo ~90 s), el detector offline lo marca `offline` (ver `device-model.md` §5 y `jobs-and-workers.md` job 7).

## 3. Tolerancia a duplicados (idempotencia)

- Idempotencia por `event_hash` (cálculo en `mqtt-or-ingestion-contract.md`). Reenvío del mismo `event_hash`:
  - **Nuevo** → inserta, `ingestion_status=accepted`, respuesta `200 duplicate=false`.
  - **Existente** → no inserta, `ingestion_status=duplicate`, respuesta `200 duplicate=true`.
- Permite reintentos del bridge/dispositivo y reenvío de buffer offline sin duplicar consumo.

## 4. Datos faltantes

- Campos opcionales pueden venir `null` (un device `meter` mínimo puede reportar solo `active_power_w` y/o `energy_wh_delta`).
- **Gaps temporales**: ausencia de lecturas (offline, pérdida de paquete) no se rellena con valores inventados. La agregación trata el gap como ausencia de energía en ese subintervalo (no extrapola). Se puede marcar el bucket como parcial en `context`/metadata si la cobertura fue baja.
- Si falta `energy_wh_delta` pero hay `active_power_w`, la energía del bucket puede estimarse por integración de potencia (fallback documentado), priorizando siempre el delta medido cuando exista.

## 5. Estrategia de agregación (delta → kWh por bucket)

- La energía del bucket = **suma de `energy_wh_delta`** de las lecturas del bucket, convertida a kWh (`/ 1000`). El delta acumulativo evita problemas de reseteo de contador.
- `peak_power_w` del bucket = `MAX(active_power_w)`.
- Pipeline: continuous aggregate de Timescale (hora) → rollup a day/week/month con costeo CLP (`EnergyAggregationService` + `BillingService`) → `energy_aggregates` (ver `06-backend/backend-architecture.md` §6).
- **Distinción clave:**
  - `active_power_w` (en `telemetry_readings`) = **medición instantánea** de potencia; alimenta el dashboard en vivo. No es energía.
  - `energy_kwh` (en `energy_aggregates`) = **agregado histórico** de energía por bucket; base de reportes, desglose y costo.
  - Nunca se confunde W (instantáneo) con kWh (acumulado en el tiempo).

## 6. Estrategia de validación

Antes de aceptar, `TelemetryIngestionService` valida:
- **No negativos**: `voltage_v, current_a, active_power_w, apparent_power_va, energy_wh_delta >= 0`.
- **Rango**: `power_factor ∈ [-1, 1]`.
- **Timestamp**: `source_timestamp` no excesivamente futuro (tolerancia de reloj, ej. ≤ now + 120 s) y no absurdamente antiguo (descarte/marcado fuera de retención).
- **Pertenencia**: `device_id` resuelve a un device de kit `active` y la instalación coincide (no cross-tenant).
- **Capability**: el device debe tener `capabilities.meter=true`.
- Fallo de validación → `ingestion_status=invalid` + `422` (ej. `INVALID_TIMESTAMP`, consumo negativo). Emite `telemetry.rejected`.

## 7. Tratamiento offline / online

- Cada lectura **válida** actualiza `devices.last_seen_at` y fija `state=online` (`device.online`).
- Sin lecturas dentro de la ventana → job offline marca `state=offline` (`device.offline`) + alerta `offline`.
- El dispositivo bufferea lecturas mientras está sin conexión y las reenvía al reconectar (con su `source_timestamp` original); la idempotencia por `event_hash` evita duplicados y los timestamps preservan la serie histórica real.

## 8. Eventos

- `telemetry.ingested` (accepted): dispara evaluación streaming de alertas, refresh de live (WebSocket) y `markSeen`.
- `telemetry.rejected` (invalid): log + métrica; no afecta agregados.
