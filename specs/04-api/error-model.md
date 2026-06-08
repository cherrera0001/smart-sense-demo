# Error Model — SmartSense API

> Contrato de errores transversal. Schema formal `ErrorResponse` en `openapi.yaml`. Convenciones generales en `api-overview.md`.

## 1. Estructura estándar

Toda respuesta de error usa el mismo envelope JSON con `Content-Type: application/json`:

```json
{
  "code": "KIT_ALREADY_CLAIMED",
  "message": "El kit ya está activo en otra instalación.",
  "details": [
    { "field": "qr_code", "issue": "kit en estado active" }
  ],
  "traceId": "01J8Z9K3M7QF2N4P6R8T0V2W4X"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `code` | string | sí | Código de negocio estable y estable entre versiones. UPPER_SNAKE_CASE. El cliente conmuta por `code`, nunca por `message`. |
| `message` | string | sí | Texto legible (es-CL). No expone detalles internos ni stack traces. |
| `details` | array\<{field, issue}\> \| objeto | no | Detalle por campo (validación) u objeto auxiliar. Ausente cuando no aplica. |
| `traceId` | string | sí | Correlación de request (logs/observabilidad). Se pide al usuario para soporte. |

**Reglas:**
- Nunca se devuelve HTML ni texto plano en errores de la API.
- Mensajes de auth son **genéricos** (anti-enumeración): no se revela si un email existe (FR-AUTH-001/002/005).
- Acceso cross-tenant se trata como inexistencia (`404`) cuando confirmar existencia filtraría información; `403 CROSS_TENANT_DENIED` cuando el recurso es legítimamente referenciable pero la operación no está permitida.

## 2. Mapeo HTTP

| HTTP | Significado | Uso típico |
|---|---|---|
| 400 | Bad Request | JSON malformado, parámetros faltantes/ininterpretables, tipo incorrecto. |
| 401 | Unauthorized | Sin token, token inválido/expirado, refresh revocado. |
| 403 | Forbidden | Autenticado pero sin permiso (rol insuficiente, control sin permiso, cross-tenant). |
| 404 | Not Found | Recurso inexistente o fuera del tenant (oculto deliberadamente). |
| 409 | Conflict | Conflicto de estado (kit ya reclamado, email existente, transición inválida). |
| 422 | Unprocessable Entity | Sintaxis válida pero regla de negocio/validación semántica fallida. |
| 429 | Too Many Requests | Rate limit / throttling. Incluye `Retry-After`. |
| 500 | Internal Server Error | Fallo no controlado. `message` genérico, `traceId` para soporte. |

> Distinción 400 vs 422: 400 = el request no se puede interpretar; 422 = se interpreta pero viola una invariante (rango inválido, consumo negativo, timestamp futuro).

## 3. Catálogo de códigos de negocio

### Genéricos / validación
| code | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Falla de validación de campos (acompaña `details`). |
| `MALFORMED_REQUEST` | 400 | Body/params no interpretables. |
| `INVALID_RANGE` | 422 | `from > to` o rango temporal inválido en telemetría/reportes. |
| `INVALID_GRANULARITY` | 422 | Granularidad fuera de `hour\|day\|week\|month`. |
| `RESOURCE_NOT_FOUND` | 404 | Recurso inexistente dentro del tenant. |
| `RATE_LIMITED` | 429 | Cuota excedida. |
| `INTERNAL_ERROR` | 500 | Error no controlado. |

### Auth / sesión (FR-AUTH)
| code | HTTP | Cuándo |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Login con email/password incorrectos (mensaje genérico). |
| `EMAIL_ALREADY_REGISTERED` | 409 | Registro con email existente (mensaje genérico anti-enumeración). |
| `TOKEN_EXPIRED` | 401 | Access token vencido. |
| `TOKEN_INVALID` | 401 | Token mal firmado/manipulado. |
| `REFRESH_REVOKED` | 401 | Refresh token revocado o ya rotado. |
| `ACCOUNT_SUSPENDED` | 403 | Usuario `status=suspended`. |
| `NO_ACTIVE_MEMBERSHIP` | 403 | Usuario sin membership activa (no puede operar). |
| `AUTH_THROTTLED` | 429 | Demasiados intentos de login/registro. |

### AutZ / multi-tenant
| code | HTTP | Cuándo |
|---|---|---|
| `INSUFFICIENT_ROLE` | 403 | Rol por debajo del requerido para la acción. |
| `CROSS_TENANT_DENIED` | 403 | Intento de operar sobre recurso de otra `organization`. |
| `LAST_OWNER_PROTECTED` | 409 | Intento de degradar/revocar al último `owner` (FR-AUTH-006/008). |

### Onboarding / kit (FR-ONB)
| code | HTTP | Cuándo |
|---|---|---|
| `KIT_NOT_FOUND` | 404 | QR no resuelve a ningún `energy_kit`. |
| `KIT_ALREADY_CLAIMED` | 409 | Kit ya `active` en otra instalación (FR-ONB-002). |
| `KIT_RETIRED` | 409 | Kit `retired` no se puede escanear/reclamar (FR-ONB-001). |
| `KIT_TRANSFERRING` | 409 | Kit en `transferring`; no acepta claim de terceros (FR-ONB-009). |
| `PAIRING_NOT_FOUND` | 404 | `device_pairing` inexistente. |
| `PAIRING_INVALID_STATE` | 409 | Pairing no está en `recommended\|paired` para confirmar. |
| `DEVICE_EXTERNAL_REF_TAKEN` | 409 | Viola `UNIQUE(kit_id, external_ref)` (FR-ONB-005). |

### Telemetría (FR-DASH / IoT)
| code | HTTP | Cuándo |
|---|---|---|
| `TELEMETRY_DUPLICATE` | 200 | `event_hash` ya existe. **No es error**: respuesta 200 con `ingestion_status=duplicate`. |
| `INVALID_TIMESTAMP` | 422 | `source_timestamp` inválido o excesivamente futuro. |
| `NEGATIVE_CONSUMPTION` | 422 | `energy_wh_delta`/`active_power_w` negativos (CHECK ≥ 0). |
| `DEVICE_NOT_RESOLVED` | 404 | `device_external_ref`/`kit` no resuelve a un device válido. |
| `KIT_NOT_INGESTING` | 403 | Kit no `active` (p. ej. `retired`) no acepta telemetría nueva (FR-SET-003). |

> `TELEMETRY_DUPLICATE` se documenta aquí por trazabilidad pero **no** produce status 4xx: la ingesta es idempotente y responde 200 (ver `api-overview.md` §9).

### Boletas (FR-BILL)
| code | HTTP | Cuándo |
|---|---|---|
| `INVALID_BILL_PERIOD` | 422 | `period_end < period_start`. |
| `NEGATIVE_AMOUNT` | 422 | `total_clp`/`consumption_kwh` negativos. |
| `UNSUPPORTED_FILE_TYPE` | 422 | Tipo de archivo no permitido al cargar boleta (FR-BILL-001). |

### Costos / tarifa
| code | HTTP | Cuándo |
|---|---|---|
| `TARIFF_REQUIRED_FOR_COST` | 422 | Se solicitó un cálculo CLP sin tarifa/boleta base. En lecturas (dashboard/reportes) no es error: se devuelve `tariff_configured=false` y `*_clp=null` (no se inventa, canon). |

### Control (FR-CTRL)
| code | HTTP | Cuándo |
|---|---|---|
| `CONTROL_NOT_PERMITTED` | 403 | Rol sin permiso de control (viewer). Intento auditado, sin comando (FR-CTRL-009). |
| `DEVICE_NOT_SWITCHABLE` | 422 | Device sin `capabilities.switch` para turn_on/turn_off. |
| `CRITICAL_EQUIPMENT_PROTECTED` | 422 | Apagado automático bloqueado en equipo crítico (FR-PROF-005). |
| `SCHEDULE_OVERLAP` | 409 | Programación con solapamiento lógico (FR-CTRL-004). |
| `INVALID_LIMIT` | 422 | Límite no positivo o sin `limit_kwh`/`limit_power_w` (FR-CTRL-005). |
| `CONTROL_ACTION_PENDING` | 409 | Ya hay una acción `pending` para el device (evita comandos en conflicto). |

### Alertas / recomendaciones
| code | HTTP | Cuándo |
|---|---|---|
| `ALERT_INVALID_TRANSITION` | 409 | Revisar una alerta que no está `open` (FR-ALRT-005). |
| `RECOMMENDATION_INVALID_TRANSITION` | 409 | Transición de estado no válida desde `new` (FR-REC-004). |

## 4. Guía de manejo en frontend

1. **Conmutar por `code`, no por `message`**: el `message` es para mostrar/loggear; la lógica usa `code`.
2. **401**:
   - `TOKEN_EXPIRED` → intentar refresh transparente una vez; si falla (`REFRESH_REVOKED`/`TOKEN_INVALID`) → cerrar sesión y redirigir a login.
   - `INVALID_CREDENTIALS` → mensaje genérico, no revelar si el email existe.
3. **403**:
   - `INSUFFICIENT_ROLE` / `CONTROL_NOT_PERMITTED` → ocultar/deshabilitar la acción en UI según rol (defensa en profundidad, no solo backend).
   - `CROSS_TENANT_DENIED` / `ACCOUNT_SUSPENDED` → forzar re-selección de organización o cierre de sesión.
4. **404**: tratar como recurso inexistente; no asumir que confirma/desmiente pertenencia a otro tenant.
5. **409**: estado en conflicto → refrescar el recurso y mostrar el motivo concreto (`KIT_ALREADY_CLAIMED`, `LAST_OWNER_PROTECTED`, etc.). No reintentar automáticamente.
6. **422**: pintar errores por campo usando `details[].field`; bloquear el submit hasta corregir.
7. **429**: respetar `Retry-After`; aplicar backoff y deshabilitar reintentos manuales hasta que expire.
8. **500**: mostrar error genérico + `traceId` copiable para soporte; no exponer detalles internos.
9. **Telemetría (clientes IoT/bridge)**: tratar `200 duplicate` como éxito idempotente (no reintentar). `422` → descartar el evento (payload inválido), no reintentar indefinidamente.
10. **Idempotencia**: ante timeout de red en `control-actions`/`telemetry`, reintentar con el **mismo** `Idempotency-Key`/`event_hash` para evitar duplicar la acción.
