# Estrategia de Índices — SmartSense

> Deriva de `specs/03-data-model/relational-model.md`. Define índices por tabla justificados por patrón de query (dashboard, reportes por rango, desglose por categoría, alertas abiertas, audit por org+fecha). Las constraints (que generan índices implícitos) viven en `constraints.md`.

## Principios

- Todo UNIQUE/PK genera índice implícito (no se re-lista salvo nota).
- Índices compuestos siguen orden **igualdad → rango/orden** (el prefijo más selectivo y de igualdad primero, el rango/ordenamiento al final).
- Se prefieren **índices parciales** para columnas con baja cardinalidad de interés (estados "activos/abiertos") y para soft delete.
- Telemetría (hypertable) hereda el índice por `source_timestamp` de Timescale; se añaden índices de acceso por device/instalación.
- No sobre-indexar tablas de escritura intensiva (`telemetry_readings`): cada índice penaliza la ingesta.

---

## users

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(email)` | implícito | login por email (lookup por igualdad). |

## organizations

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(legal_id) WHERE legal_id IS NOT NULL` | parcial | búsqueda por RUT sin penalizar orgs sin legal_id. |

## memberships

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(user_id, organization_id)` | implícito | unicidad + resolución de membresía del usuario en un tenant. |
| `(organization_id)` | btree | listar miembros de una organización (gestión de equipo, RBAC). |
| `(user_id)` | btree | listar organizaciones a las que pertenece un usuario (selector de tenant en login). |

## installations

| Índice | Tipo | Justificación |
|---|---|---|
| `(organization_id) WHERE deleted_at IS NULL` | parcial | listar sitios activos del tenant (pantalla principal). |
| `(distributor_id)` | btree | filtrar instalaciones por distribuidora (reportes/admin tarifario). |
| `(tariff_id)` | btree | recálculo de costos al cambiar una tarifa (encontrar instalaciones afectadas). |

## installation_profiles

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(installation_id)` | implícito | relación 1:1; lookup directo del perfil. |

## energy_kits

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(qr_code)` | implícito | claim de kit por escaneo de QR. |
| `UNIQUE(serial) WHERE status='active'` | parcial | kit activo único por serial (BR-011); permite múltiples históricos no-activos. |
| `(installation_id) WHERE deleted_at IS NULL` | parcial | listar kits de una instalación. |

## device_categories

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(key)` | implícito | catálogo pequeño; lookup por clave estable. |

## devices

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(kit_id, external_ref)` | implícito | resolución del device durante ingesta/pairing por (kit, ref). |
| `(installation_id) WHERE deleted_at IS NULL` | parcial | listar dispositivos del sitio (dashboard, control). |
| `(category_id)` | btree | desglose por categoría (join devices↔categorías). |

## device_pairings

| Índice | Tipo | Justificación |
|---|---|---|
| `(kit_id)` | btree | seguir el estado del emparejamiento de un kit (pantalla de pairing). |

## telemetry_readings (hypertable Timescale)

| Índice | Tipo | Justificación |
|---|---|---|
| Índice por `source_timestamp` (chunk) | Timescale (implícito) | particionamiento temporal de la hypertable. |
| `(device_id, source_timestamp DESC)` | btree compuesto | **dashboard latest reading**: última lectura por dispositivo; y series por device en un rango. |
| `(installation_id, source_timestamp DESC)` | btree compuesto | series/consumo a nivel de instalación en rango de tiempo. |
| `UNIQUE(event_hash)` | implícito | idempotencia de ingesta (BR-021); detecta duplicados antes de insertar. |

Nota: en hypertables el orden `... source_timestamp DESC` favorece las consultas "más recientes primero" típicas del dashboard en vivo. Se evita indexar columnas de medición (`active_power_w`, etc.) para no penalizar el alto volumen de escritura.

## energy_aggregates

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(installation_id, device_id, category_id, granularity, bucket_start)` | implícito | upsert idempotente del recálculo (BR-025). |
| `(installation_id, granularity, bucket_start)` | btree compuesto | **reportes por rango**: consumo por instalación a una granularidad en un periodo (igualdad en installation+granularity, rango en bucket_start). |
| `(installation_id, category_id, granularity, bucket_start) WHERE category_id IS NOT NULL` | parcial compuesto | **desglose por categoría**: gráfico de torta/barras por categoría en un periodo. |
| `(installation_id, device_id, granularity, bucket_start) WHERE device_id IS NOT NULL` | parcial compuesto | desglose por dispositivo (ranking de mayores consumidores). |

## distributors

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(code)` | implícito | lookup por código de distribuidora. |

## tariffs

| Índice | Tipo | Justificación |
|---|---|---|
| `UNIQUE(distributor_id, code, valid_from)` | implícito | versión vigente de una tarifa por distribuidora. |
| `(distributor_id, valid_from DESC)` | btree compuesto | resolver la tarifa vigente más reciente de una distribuidora para cálculo de costos. |

## electricity_bills

| Índice | Tipo | Justificación |
|---|---|---|
| `(installation_id, period_start DESC)` | btree compuesto | histórico de boletas de un sitio ordenado por periodo (pantalla de boletas, comparación mensual). |
| `(installation_id, status)` | btree compuesto | encontrar boletas `confirmed` usables como base de cálculo (BR-031/BR-036). |

## alerts

| Índice | Tipo | Justificación |
|---|---|---|
| `(installation_id, status)` | btree compuesto | base para el siguiente índice y filtros por estado. |
| `(installation_id, created_at DESC) WHERE status='open'` | parcial compuesto | **alertas abiertas por instalación**: badge/listado de alertas activas (caso de uso de mayor frecuencia). |
| `(device_id) WHERE device_id IS NOT NULL` | parcial | alertas asociadas a un dispositivo concreto. |

## recommendations

| Índice | Tipo | Justificación |
|---|---|---|
| `(installation_id, status, priority DESC)` | btree compuesto | listar recomendaciones `new` de un sitio ordenadas por prioridad (pantalla de recomendaciones). |
| `(alert_id) WHERE alert_id IS NOT NULL` | parcial | recomendaciones derivadas de una alerta. |

## control_actions

| Índice | Tipo | Justificación |
|---|---|---|
| `(device_id, requested_at DESC)` | btree compuesto | historial de acciones de un dispositivo, más recientes primero. |
| `(device_id) WHERE status='pending'` | parcial | acciones en vuelo a resolver (reintentos/timeouts del bridge). |

## control_schedules

| Índice | Tipo | Justificación |
|---|---|---|
| `(device_id) WHERE enabled` | parcial | evaluar programaciones activas de un dispositivo (scheduler). |

## consumption_limits

| Índice | Tipo | Justificación |
|---|---|---|
| `(device_id) WHERE enabled` | parcial | evaluar límites activos contra telemetría/agregados (BR-055). |

## notifications

| Índice | Tipo | Justificación |
|---|---|---|
| `(user_id, read_at)` | btree compuesto | bandeja del usuario; con filtro `read_at IS NULL` cuenta no leídas. |
| `(user_id, created_at DESC) WHERE read_at IS NULL` | parcial compuesto | badge de no leídas, ordenadas (caso frecuente). |
| `(organization_id)` | btree | notificaciones a nivel de tenant. |

## audit_logs (append-only)

| Índice | Tipo | Justificación |
|---|---|---|
| `(organization_id, created_at DESC)` | btree compuesto | **audit por org + fecha**: visor de bitácora del tenant en orden cronológico inverso. |
| `(entity_type, entity_id)` | btree compuesto | rastrear el historial de una entidad concreta (p. ej. todas las acciones sobre un `control_action`/`membership`). |

---

## Notas sobre índices parciales

- Los índices con `WHERE deleted_at IS NULL` reducen tamaño y mantienen relevancia (TC-005); las queries operativas siempre filtran por soft delete.
- Los parciales por estado (`status='open'`, `status='pending'`, `enabled`) cubren el caso de uso caliente (registros "activos") sin indexar el historial completo, que es la mayoría de las filas con el tiempo.
- En `energy_aggregates`, separar índices parciales por `device_id`/`category_id` NOT NULL evita escanear filas de agregado a nivel instalación cuando se pide desglose fino.
- Para el UNIQUE compuesto de `energy_aggregates` con columnas NULL, usar `NULLS NOT DISTINCT` (PG15+) o índice de expresión con `COALESCE` para que los buckets a nivel instalación (device/category NULL) sean únicos.
- En `telemetry_readings` se mantiene el mínimo de índices viable: solo los necesarios para dashboard (latest), series por instalación e idempotencia; cualquier consulta analítica pesada se sirve desde `energy_aggregates`, no desde la cruda.
