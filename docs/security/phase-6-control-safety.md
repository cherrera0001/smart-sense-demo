# Fase 6 — Modelo de Seguridad del Control de Dispositivos

> Fecha: 2026-06-04 · Rama: `feat/phase-6-device-control`.
> Documenta el modelo de seguridad del control de dispositivos de Fase 6 y las **condiciones que deben cumplirse ANTES de habilitar downlink físico real** (fase futura). El control es la superficie más crítica del sistema: un comando mal autorizado o mal enrutado podría apagar/encender equipos reales. Por eso Fase 6 es **dry-run only**.

## Principio rector: dry-run only (sin efecto físico)

- **Ninguna acción de control envía un comando físico.** Toda acción persiste `dry_run=true` + `status='success'` y el API la expone como `status='dry_run'`. No hay ejecución sobre el dispositivo.
- **NO hay MQTT downlink.** El `iot-bridge` sigue en dry-run (sin publicar comandos a ningún broker); Fase 6 no abre canal de bajada al kit.
- **`control-state` es lógico/simulado.** `current_state` (`on`/`off`/`unknown`) se infiere de la última acción dry-run, **no** se lee del dispositivo físico → puede divergir del estado real. No debe interpretarse como confirmación física.
- **Schedules y limits no ejecutan.** Solo persisten política; no hay scheduler ejecutor ni motor que aplique límites o apague equipos.

## Controles de autorización (vigentes en Fase 6)

| Control | Mecanismo | Verificación |
|---|---|---|
| **Autenticación** | JWT obligatorio (`Authorization: Bearer`) | 401 sin token |
| **RBAC operate+** | Mutaciones de control requieren `ROLES.operate` (owner/admin/operator) | **viewer → 403** (actions/schedules/limits) |
| **Tenant-scope** | `assertDeviceAccess` (device → installation → organization) | device de otra organización → **403** |
| **Capability gate** | `turn_on`/`turn_off`/`set_limit`-as-action exigen `capabilities.switch=true` | device no controlable → **409 `DEVICE_NOT_CONTROLLABLE`** |
| **Idempotencia** | `Idempotency-Key` → UNIQUE parcial `(device_id, idempotency_key)` | reintento no duplica acción |
| **Auditoría obligatoria** | append-only en toda mutación | `control.requested`/`control.resolved`, `control_schedule.created/updated`, `consumption_limit.created/updated` |

Estos controles ya se validan en la suite (26 tests de control, parte de 140/140 API contra Neon; ver `docs/audit/phase-6-runtime-verification.md`). Son la base de autorización que debe estar **probada y endurecida antes** de cualquier downlink real.

## Por qué dry-run primero (defensa en profundidad)

La superficie de control combina: autorización (RBAC + tenant), enrutamiento físico (device → kit → actuador), confirmación de efecto y reversibilidad. Habilitar downlink antes de tener cada capa verificada implica riesgo de:
- Apagado/encendido no autorizado de equipos (incl. equipos críticos).
- Comandos enrutados al device equivocado (cross-tenant o mismatch device/kit).
- Acciones duplicadas por reintento de red.
- Estado físico desconocido o divergente del lógico.

Dry-run permite ejercitar y auditar toda la lógica de autorización **sin riesgo físico**.

## Condiciones de seguridad ANTES de habilitar downlink real (fase futura)

> Checklist de precondiciones. **Ninguna debe omitirse** antes de enviar comandos físicos.

1. **Canal IoT autenticado por kit.** Downlink sobre un canal autenticado/cifrado, con credenciales por kit (no JWT de usuario reutilizado). Autorización de comando a nivel de kit/device, no solo de API.
2. **Confirmación de dispositivo (ACK).** `resolveAction` async con ACK del dispositivo; sin ACK en timeout → `failed`. `control-state` debe pasar a **físico confirmado**, no lógico.
3. **Rollback / reversibilidad.** Toda acción debe ser reversible y con estado seguro por defecto; equipos críticos (`installation_profiles`, FR-PROF-005) **no se apagan** por acción automática de límite.
4. **Rate-limit y anti-flood.** Límite de comandos por device/usuario/ventana; protección contra ráfagas y replays (más allá de la idempotencia por clave).
5. **Verificación de enrutamiento.** Coherencia device↔kit↔installation confirmada en el momento del downlink (evitar comandos al actuador equivocado).
6. **Auditoría reforzada del downlink.** Registrar request físico, ACK/timeout y resultado real, con correlación end-to-end (Fase 7: trazas/observabilidad).
7. **Autorización endurecida y probada.** RBAC + tenant + capability cubiertos por tests exhaustivos de autorización (incl. cross-tenant y rejected) **antes** de abrir el canal.

## Exclusiones explícitas (fase futura)

MQTT downlink productivo, comandos físicos reales, on/off físico, `resolveAction` async, automatización autónoma, reacción automática a alertas/límites, smart-control real, scheduler ejecutor, UI productiva de control.

## Higiene de secretos

- **DB:** Neon dev (host enmascarado `ep-lucky-pine-***.neon.tech`, `neondb`). `DATABASE_URL`/connection strings **no trackeados** (`.env` gitignored). Verificado en `docs/audit/phase-6-precheck.md`.
- **Rotación de la credencial Neon: ✅ EJECUTADA en Fase 7.** La contraseña de Neon que circuló por chat fue **invalidada** vía `ALTER ROLE` (la vieja ya no funciona; la nueva vive solo en `packages/db/.env` gitignored). Ver `docs/security/phase-7-secret-rotation.md`. El recordatorio de Fase 6 queda **cerrado**.

## Referencias

`docs/implementation/phase-6-summary.md`, `docs/api/phase-6-device-control.md`, `docs/audit/phase-6-{precheck,spec-readiness,control-data-model-audit,openapi-implementation-audit,runtime-verification}.md`.
