# Contrato de Ingestión MQTT — SmartSense

> Deriva de `specs/_canon.md`, `telemetry-model.md`, `device-model.md`, `device-provisioning.md` y `06-backend/integrations.md`.
> Flujo canónico: `Device → MQTT (EMQX) → apps/iot-bridge → POST /v1/iot/telemetry → telemetry_readings`.

## 1. Topics MQTT

Estructura: `smartsense/{kit_qr}/{device_ref}/{canal}`

| Topic | Dirección | QoS | Propósito |
|---|---|---|---|
| `smartsense/{kit_qr}/{device_ref}/telemetry` | uplink (device→broker) | 1 | lectura energética |
| `smartsense/{kit_qr}/{device_ref}/status` | uplink | 1 | online/offline (LWT), firmware |
| `smartsense/{kit_qr}/{device_ref}/command` | downlink (broker→device) | 1 | comando de control |
| `smartsense/{kit_qr}/{device_ref}/command/ack` | uplink | 1 | acuse del comando |

- `{kit_qr}` = `energy_kits.qr_code`; `{device_ref}` = `devices.external_ref`.
- **LWT (Last Will & Testament)**: el device registra un mensaje de desconexión en `.../status` para detección rápida de caída (complementa el detector por `last_seen_at`).
- QoS 1 (at-least-once) en telemetría y comandos; la idempotencia por `event_hash` (telemetría) y por `command_id`/`Idempotency-Key` (comandos) neutraliza duplicados.

## 2. Payload de telemetría (ejemplo)

```json
{
  "reading_id": "018f3a2b-7c10-7e2a-9b44-2f1d6c9a0e11",
  "kit_qr": "SS-KIT-7F3A9C2D",
  "device_ref": "plug-01",
  "source_timestamp": "2026-06-01T13:45:05Z",
  "metrics": {
    "voltage_v": 221.4,
    "current_a": 3.182,
    "active_power_w": 698.50,
    "reactive_power_var": 102.30,
    "apparent_power_va": 706.10,
    "power_factor": 0.989,
    "energy_wh_delta": 5.8200,
    "frequency_hz": 50.012,
    "signal_quality": -58
  },
  "firmware_version": "1.4.2",
  "event_hash": "f1a9c8e0b3d24a6f9c0e1b2d3a4f5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
}
```

- El bridge mapea `metrics.*` a los campos planos de `telemetry_readings` y conserva el JSON original en `raw_payload`.

## 3. Autenticación del kit

- Credenciales **por kit** emitidas en el provisioning (ver `device-provisioning.md`): usuario/clave MQTT o cert mTLS, ligados al `kit_qr`.
- ACL del broker: cada kit solo puede publicar/suscribir bajo su prefijo `smartsense/{kit_qr}/#`. No puede tocar topics de otro kit.
- El bridge usa un **token de servicio** con scope `telemetry:ingest` para llamar a `POST /v1/iot/telemetry` (no es un usuario; no cruza RBAC de membership).
- Credenciales revocables/rotables al `transfer`/`retire` del kit.

## 4. Flujo MQTT → iot-bridge → API

```mermaid
sequenceDiagram
  participant D as Device
  participant B as EMQX
  participant G as iot-bridge
  participant A as API (/iot/telemetry)
  participant DB as telemetry_readings
  D->>B: PUBLISH telemetry (QoS1)
  B->>G: deliver
  G->>G: validar prefijo + calcular/verificar event_hash + normalizar
  G->>A: POST /v1/iot/telemetry (Bearer kit-scope, Idempotency-Key)
  A->>A: resolver device/kit/installation + validar
  A->>DB: UPSERT idempotente (event_hash UNIQUE)
  A-->>G: 200 { ingestion_status, duplicate }
  Note over G: ack lógico; en error reintenta con backoff
```

1. `iot-bridge` suscribe `smartsense/+/+/telemetry`, valida que `kit_qr`/`device_ref` correspondan a credenciales del cliente conectado.
2. Calcula/verifica `event_hash`, normaliza al DTO del contrato (`telemetry-model.md`).
3. `POST /v1/iot/telemetry` con `Authorization: Bearer <kit-scope>` + `Idempotency-Key`.
4. La API resuelve `device_id/kit_id/installation_id`, valida (no-negativos, timestamp, capability, no cross-tenant) y hace UPSERT idempotente.
5. Respuesta `200` con `ingestion_status` (`accepted|duplicate`) o `422` (`invalid`).

## 5. Cálculo del `event_hash`

- `event_hash = sha256( kit_qr || "|" || device_ref || "|" || source_timestamp(ISO8601 UTC) || "|" || canonical(metrics) )` en hex.
- `canonical(metrics)`: serialización determinista de las métricas (claves ordenadas, sin espacios, precisión fija). Garantiza que el mismo evento produzca el mismo hash en device, bridge y API.
- El device lo calcula y lo envía; el bridge lo **recalcula y verifica** (rechaza si no coincide, evitando hashes arbitrarios). `UNIQUE(event_hash)` asegura idempotencia en DB.

## 6. Backpressure y buffering offline

- **En el dispositivo**: buffer circular persistente (FIFO, tamaño acotado por memoria/flash). Sin conexión, acumula lecturas con su `source_timestamp` real; al reconectar las reenvía en orden. Si el buffer se llena, descarta las más antiguas (política configurable) y registra el gap.
- **En el bridge**: cola interna hacia la API; si la API responde `429`/`5xx`, reintenta con backoff exponencial + jitter; no descarta hasta confirmar entrega o agotar reintentos (luego DLQ).
- **Rate-limit por kit**: `/iot/telemetry` tiene cuota mayor (alto volumen IoT); el `429` lleva `Retry-After`.
- La idempotencia por `event_hash` hace que el reenvío masivo del buffer offline no infle el consumo agregado.

## 7. Comandos de control (downlink)

Payload de comando publicado por `ControlService` en `.../command`:

```json
{
  "command_id": "018f3a2b-9d44-7e2a-8b10-7c1f2d6c9a0e",
  "action": "turn_off",
  "payload": { "limit_power_w": null },
  "issued_at": "2026-06-01T14:00:00Z",
  "ttl_s": 30
}
```

- `action` ∈ `turn_on | turn_off | set_limit` (enum `control_action_type`). `command_id` = `control_actions.id`.
- Solo se publica si `capabilities.switch=true` y el solicitante tiene rol `operator|admin|owner`; toda emisión queda en `audit_logs`.

Ack publicado por el device en `.../command/ack`:

```json
{
  "command_id": "018f3a2b-9d44-7e2a-8b10-7c1f2d6c9a0e",
  "status": "success",
  "applied_at": "2026-06-01T14:00:01Z",
  "detail": { "relay": "open" }
}
```

- `status` ∈ `success | failed | rejected` → mapea a `control_actions.status` vía `ControlService.resolveAction`. Sin ack dentro de `ttl_s` → `failed` (timeout). `pending` es el estado inicial hasta recibir ack.
