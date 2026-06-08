# Fase 3 — Guía del iot-bridge

> Fecha: 2026-06-03 · Rama: `feat/phase-3-iot-telemetry` · Paquete `apps/iot-bridge`.
> Guía operativa del puente IoT que normaliza lecturas de telemetría y las reenvía a la API (`POST /iot/telemetry`). En Fase 3 corre en **dry-run** por defecto; el modo MQTT productivo está fuera de alcance.

## Modos de operación

`IOT_BRIDGE_MODE` selecciona la fuente de lecturas:

| Modo | Comportamiento | Conecta broker | Hace HTTP |
|---|---|---|---|
| `dry-run` (default) | Procesa fixtures/entradas y muestra el DTO normalizado; **no** hace HTTP ni conecta broker | No | No |
| `file` | Lee lecturas desde archivo, normaliza y (opcional) reenvía vía `http-forwarder` | No | Sí (si hay endpoint/token) |
| `mqtt` | Suscribe a un broker MQTT (import dinámico de `mqtt`), normaliza y reenvía | Sí (solo en este modo) | Sí |

> **Advertencia:** el modo `mqtt` es el único que abre conexión a un broker. **No** apuntar a un broker productivo desde este puente en Fase 3. El cliente `mqtt-client.ts` usa import dinámico y **no** conecta salvo modo `mqtt`. La dependencia `mqtt` está instalada pero inactiva por defecto.

## Variables de entorno

> Definidas en `apps/iot-bridge/.env` (gitignored). `config.ts` aplica `maskSecret` y **nunca** imprime valores de secretos en logs. No se documentan valores aquí.

| Variable | Propósito |
|---|---|
| `IOT_BRIDGE_MODE` | Modo de operación (`dry-run` / `file` / `mqtt`) |
| `IOT_BRIDGE_API_URL` | Base URL de la API destino para `POST /iot/telemetry` |
| `IOT_BRIDGE_API_TOKEN` | Bearer token para autenticar el reenvío (enmascarado en logs) |
| `IOT_BRIDGE_MQTT_URL` | URL del broker MQTT (solo modo `mqtt`; enmascarada) |
| `IOT_BRIDGE_MQTT_TOPIC` | Topic de suscripción (solo modo `mqtt`) |
| `IOT_BRIDGE_INPUT_FILE` | Ruta del archivo de lecturas (solo modo `file`) |

## Contrato de payload

El bridge produce el DTO plano que consume `POST /iot/telemetry`:

```
{ device_id, kit_id, installation_id, source_timestamp,
  voltage_v?, current_a?, active_power_w?, reactive_power_var?,
  apparent_power_va?, power_factor?, energy_wh_delta?, frequency_hz?,
  signal_quality?, firmware_version?, raw_payload?, reading_id?, event_hash? }
```

`telemetry-contract.ts` expone `validateIngest`, que valida el DTO antes de reenviarlo.

## Normalización

`normalizer.ts` mapea dos formas de entrada al DTO plano:
- Forma MQTT anidada (`metrics{}`) → DTO plano.
- Forma ya plana → DTO plano.

Reglas:
- Conserva el payload original en `raw_payload`.
- Calcula `event_hash` si falta.
- **Rechaza** métricas negativas, `power_factor` fuera de `[-1,1]` y `source_timestamp` futuro.

## Cálculo de `event_hash`

- Se calcula con `computeEventHash` de `@smartsense/shared` (`packages/shared/src/telemetry/hash.ts`).
- Algoritmo: **sha256** sobre `device_id | source_timestamp | canonical(metrics)` (forma canónica de las métricas).
- Usa `node:crypto` (solo backend). Garantiza idempotencia: la misma lectura produce el mismo hash, y la API la marca `duplicate`.

## Fixtures

`apps/iot-bridge` incluye fixtures para verificación sin broker ni DB:

| Fixture | Caso |
|---|---|
| `valid-reading` | Lectura válida → DTO normalizado correcto |
| `duplicate-reading` | Mismo `event_hash` que `valid-reading` → idempotencia |
| `invalid-negative-power` | Potencia negativa → rechazada por el normalizador |
| `invalid-future-timestamp` | `source_timestamp` futuro → rechazado |

## Cómo correr (dry-run)

```bash
pnpm install

# Dry-run (default): no HTTP, no broker — solo normaliza y muestra el DTO
IOT_BRIDGE_MODE=dry-run pnpm --filter @smartsense/iot-bridge dev

# Tests del bridge (no requieren DB ni broker):
pnpm --filter @smartsense/iot-bridge test   # 23/23 PASS (normalizer 10, contract 6, http-forwarder 7)
```

> Para `file`/`mqtt` deben definirse las variables correspondientes en `apps/iot-bridge/.env`. **No** conectar a broker productivo en Fase 3.

## Estado

- **23/23 tests PASS** (`pnpm --filter @smartsense/iot-bridge test`): normalizer 10, contract 6, http-forwarder 7.
- `http-forwarder.ts` envía `POST /iot/telemetry` con `Bearer` si hay token y **no** filtra el token.
- Funcional en dry-run; MQTT productivo fuera de alcance de Fase 3.
