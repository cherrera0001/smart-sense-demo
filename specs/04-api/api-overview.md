# API Overview — SmartSense

> Deriva de `specs/_canon.md`, `specs/02-domain/domain-model.md`, `specs/03-data-model/relational-model.md` y `specs/01-requirements/functional-requirements.md`.
> Contrato formal: `openapi.yaml` (OpenAPI 3.1). Errores: `error-model.md`. AuthZ/AuthN: `auth-and-permissions.md`.

## Estado de implementación (Fases 2–4)

> **Fase 2 — ✅ PASS (2026-06-02, `feat/phase-2-api-base`).** Implementados en `apps/api` (Fastify 5) y verificados con 39/39 tests contra Neon real: **19 endpoints** de los grupos **Auth** (4), **Organizations** (3), **Installations** (4), **Devices** (4) y **Onboarding** (4). Detalle y auditoría OpenAPI ↔ código 1:1: `docs/audit/phase-2-openapi-implementation-audit.md` y `docs/implementation/phase-2-summary.md`.
> **Fase 3 — ✅ PASS (2026-06-03, `feat/phase-3-iot-telemetry`).** Implementados y verificados (API 56/56 contra Neon real; 17 tests de telemetría) los **3 endpoints de telemetría**, todos bajo JWT:
> - **POST `/iot/telemetry`** — ingestión idempotente por `event_hash` UNIQUE (`accepted`/`duplicate`); 404 device inexistente, 403 cross-tenant, 409 `DEVICE_KIT_MISMATCH`, 422 negativos/`power_factor`/`INVALID_TIMESTAMP`; capability meter; post-ingest actualiza device y ejecuta `upsertHourBucket` (agregación horaria inline).
> - **GET `/installations/{installationId}/telemetry/latest`** — última lectura + `deviceCount` (empty state OK).
> - **GET `/installations/{installationId}/telemetry/range`** — rango `[from,to]` con `device_id?` y `limit` (default 500, max 5000); 422 `from>to`.
>
>   **Sin migración nueva** (reutiliza `telemetry_readings`/`energy_aggregates` de Fase 1). Detalle: `docs/implementation/phase-3-summary.md`, `docs/audit/phase-3-telemetry-openapi-audit.md`.
> **Fase 4 — ✅ PASS (backend) (2026-06-03, `feat/phase-4-dashboard-reports`).** Implementados y verificados (API **92/92** contra Neon real; 11 billing + 7 dashboard + 9 reports + 9 breakdown) los **6 endpoints de lectura agregada**, todos bajo JWT + `assertInstallationAccess(read)`:
> - **GET `/installations/{id}/dashboard`** — `current_power_w`, `today/month_energy_kwh`, `today/month_cost_clp`, `comparison{previous_period_energy_kwh,delta_percent}`, `latest_reading_timestamp`, `device_count`, `alerts_pending_count=0` (literal, Fase 5), `data_status` (live/stale>15min/empty).
> - **GET `/installations/{id}/reports/{daily,weekly,monthly,last-three-months}`** — `points[{bucket_start,energy_kwh,cost_clp,peak_power_w}]` (buckets vacíos incluidos), `totals` (derivados de `points` → cuadran), `data_status` (complete/partial/empty).
> - **GET `/installations/{id}/breakdown?from&to&group_by`** — `group_by` device(default)/category; rango default 7 días; `items[{id,name,category,energy_kwh,cost_clp,percentage}]` (solo devices medidos, `percentage` suma ~100), `total_energy_kwh`/`total_cost_clp`, `data_status`.
> - **`BillingService`** (`apps/api/src/modules/billing/`): tarifa efectiva (`installation.tariffId` → boleta `confirmed` más reciente → null) + `estimateEnergyCostClp` (`Math.round(energy_kwh * energy_price_clp_kwh)` entero CLP; **null sin tarifa — BR-031**; solo cargo por energía).
>
>   **Sin migración nueva** (reutiliza `telemetry_readings`/`energy_aggregates`/`devices`/`device_categories`/`installations`/`tariffs`/`electricity_bills`/`distributors`; agregados preferidos → fallback telemetría, sin mezclar fuentes; tiempos UTC). **Nota de superset:** las respuestas de dashboard/reports/breakdown son **más ricas que el shape original del `openapi.yaml`** — los **paths se conservan 1:1**, los shapes implementados son un **superset** (extensión contract-first; el `yaml` se reconcilia en Fase 7, no se reescribe ahora). Detalle: `docs/implementation/phase-4-summary.md`, `docs/audit/phase-4-{spec-readiness,openapi-implementation-audit,runtime-verification}.md`, `docs/api/phase-4-dashboard-reports-breakdown.md`.
> **Diferidos (Fase 5+):** Alerts, Recommendations y desglose UI (Fase 5); Control (Fase 6); Bills CRUD/UI y proyecciones (fase posterior). Estos grupos están en el contrato pero **aún no implementados**. El **frontend** (shell/UI en vivo de dashboard/reports/breakdown) es entrega posterior; la demo sigue bajo DEMO_MODE (web client `energyApi.*` preparatorio, no usado por la UI).
> **Desviaciones documentadas:** (Fase 2) password con bcryptjs (12 rounds) en vez de Argon2id del canon; JWT único a 7d (refresh rotado + throttling → Fase 7). (Fase 3) `event_hash` usa `device_id` (no `kit_qr`/`device_ref`); telemetría no audita (volumen); agregación inline sin `cost_clp`; device auth = JWT de usuario (API key/kit-scope → Fase 7); MQTT productivo fuera de alcance (`iot-bridge` en dry-run). (Fase 4) costeo **solo energía** (sin cargo fijo/demanda/punta-valle/horario); tiempos **UTC** (tz local → fase posterior); breakdown solo dispositivos medidos (no NILM); `alerts_pending_count` fijo en 0 (Fase 5); respuestas **superset** del `openapi.yaml`.

## 1. Estilo y principios

- **REST** sobre HTTP/JSON. Recursos en plural y `snake_case` en el cuerpo (alineado al canon de tablas).
- **Stateless**: cada request lleva su `Authorization: Bearer <access_token>`. Sin estado de sesión server-side salvo la lista de refresh tokens.
- **Costos en backend**: la API nunca espera ni acepta cálculos de costo del cliente; el CLP siempre lo computa el backend (canon).
- **Multi-tenant por diseño**: ninguna respuesta expone datos de un `organization_id` ajeno (invariante de canon).

## 2. Versionado

- Versión en el path: `/v1`. Base URL: `https://api.smartsense.cl/v1`.
- Cambios retrocompatibles (campos nuevos opcionales) no incrementan versión. Cambios incompatibles → `/v2`.
- Deprecación anunciada con header `Deprecation` + `Sunset` (RFC 8594).

## 3. Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Path de colección | plural, kebab si compuesto | `/installations`, `/control-actions` |
| Path de recurso | `/{recurso}/{id}` con UUID | `/devices/{id}` |
| Sub-recurso scoped | anidado bajo el padre | `/installations/{installationId}/devices` |
| Campos JSON | `snake_case` | `energy_today_kwh`, `event_hash` |
| Enums | valores exactos del canon | `home`, `turn_on`, `over_budget` |
| Acciones no-CRUD | sufijo verbo bajo recurso | `/alerts/{id}/review`, `/onboarding/kit/claim` |

## 4. Identificadores y formatos

- **IDs**: UUID v7 (string `format: uuid`). Telemetría usa `reading_id` + `event_hash`.
- **Fechas/timestamps**: ISO8601 en **UTC** (`2026-06-01T13:45:00Z`). Rangos en query con `from`/`to` (`from` inclusivo, `to` exclusivo).
- **Fechas calendario** (boletas): `format: date` (`2026-05-31`).
- **Zona horaria** de presentación: `installations.timezone` (default `America/Santiago`); el almacenamiento es siempre UTC.

## 5. Unidades

| Magnitud | Unidad | Tipo en payload | Notas |
|---|---|---|---|
| Energía | kWh | number | `energy_kwh`, `consumption_kwh`. Telemetría usa `energy_wh_delta` (Wh). |
| Potencia | W | number | `active_power_w`, `live_power_w`, `peak_power_w`, `limit_power_w`. |
| Dinero | CLP | integer | Enteros sin decimales (canon). `cost_clp`, `total_clp`, `estimated_saving_clp`. |
| Tarifa | CLP/kWh | number | Solo en catálogo de tarifas (`numeric(12,4)`). |

> Si no hay tarifa/boleta base, los campos `*_clp` van `null` y se acompaña `tariff_configured: false`. **Nunca** se inventa un valor monetario (canon).

## 6. Paginación (cursor)

- Listados devuelven envelope: `{ "data": [...], "page_info": { "has_next": bool, "next_cursor": string|null } }`.
- Query params: `cursor` (opaco), `limit` (1..200, default 50).
- Cursor opaco y estable; no se exponen offsets numéricos (evita drift en series temporales).

## 7. Filtros y rangos temporales

- Filtros por enum vía query (`status`, `severity`, `type`, `segment`, `state`).
- Rangos temporales obligatorios en telemetría/reportes con `from`/`to` (ISO8601 UTC). Validación `from <= to` → `422 INVALID_RANGE`.
- Reportes con granularidad fija por endpoint (`daily`/`weekly`/`monthly`/`last-three-months`); el desglose acepta `groupBy=device|category`.

## 8. Rate limiting

- Límites por `organization_id` + por token. Respuesta `429` con `Retry-After` (segundos) y header `RateLimit-Remaining`.
- Endpoint de ingesta `/iot/telemetry` con cuota mayor (alto volumen IoT); el límite por kit se documenta en `07-iot`.
- Endpoints de auth (`/auth/login`, `/auth/register`) con throttling anti-fuerza-bruta (FR-AUTH-002).

## 9. Idempotencia

- **Header `Idempotency-Key`** (UUID/opaco) en operaciones de escritura sensibles a reintento: `POST /iot/telemetry`, `POST /devices/{deviceId}/control-actions`. Reintento con la misma clave devuelve el resultado original sin re-ejecutar.
- **Telemetría**: idempotencia fuerte adicional por `event_hash` (UNIQUE en `telemetry_readings`). `POST /iot/telemetry` responde **200**:
  - `ingestion_status=accepted` (`duplicate=false`) si el `event_hash` es nuevo.
  - `ingestion_status=duplicate` (`duplicate=true`) si ya existía (no se inserta de nuevo).
  - `ingestion_status=invalid` → se rechaza con `422` (p. ej. `INVALID_TIMESTAMP`, consumo negativo).

## 10. Multi-tenancy (scoping)

- Cada recurso de negocio cuelga de una `Organization` (directa o vía FK). El backend deriva el tenant del access token (claim `org`) y/o del path.
- `Installation` siempre pertenece a una sola `Organization`; los sub-recursos (`devices`, `bills`, `alerts`, `recommendations`, telemetría, reportes) se resuelven dentro de esa instalación.
- Acceso a un recurso de otro tenant → `404 NOT_FOUND` (no se confirma existencia) o `403 CROSS_TENANT_DENIED` según el caso (ver `error-model.md`).
- `organizationId` opcional como query en `/installations` para seleccionar tenant cuando el usuario pertenece a varias organizaciones.

## 11. Seguridad transversal

- TLS obligatorio. `Authorization: Bearer` con access JWT. Refresh vía `/auth/login`/rotación (ver `auth-and-permissions.md`).
- Ingesta IoT usa token de kit/bridge con scope `telemetry:ingest` (no es un usuario).
- Acciones de control y claim de kit quedan en `audit_logs` (append-only, canon).

---

## 12. Endpoints por grupo (permisos · trazabilidad · aceptación)

> Rol mínimo según matriz RBAC (`auth-and-permissions.md` / FR-AUTH-009). `viewer+` = cualquier rol con membership activa. Ingesta = token de kit (scope `telemetry:ingest`).

### Auth
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/auth/register` | POST | público | FR-AUTH-001 | Email nuevo → user+org+membership owner+sesión; email existente → 409 genérico. |
| `/auth/login` | POST | público | FR-AUTH-002 | Credenciales válidas → 200 + tokens; inválidas → 401 genérico; throttling tras N fallos. |
| `/auth/logout` | POST | autenticado | FR-AUTH-004 | Tras logout el refresh ya no renueva. |
| `/auth/me` | GET | autenticado | FR-AUTH-002, 009 | Devuelve user + memberships activas. |

### Organizations
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/organizations` | GET | viewer+ | FR-AUTH-009 | Solo organizaciones con membership activa del usuario. |
| `/organizations` | POST | autenticado | FR-AUTH-001 | Crea org y deja al actor como owner. |
| `/organizations/{id}` | GET | viewer+ (de la org) | FR-AUTH-009 | Org propia → 200; ajena → 403/404. |

### Installations
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations` | GET | viewer+ | FR-SET-002 | Lista solo instalaciones del tenant en contexto. |
| `/installations` | POST | admin, owner | FR-ONB-008 | Crea instalación en la org; queda disponible para claim. |
| `/installations/{id}` | GET | viewer+ | FR-ONB-008, FR-SET-002 | Devuelve instalación + perfil; ajena → 403/404. |
| `/installations/{id}` | PATCH | admin, owner | FR-SET-002, FR-SET-004 | Edita datos/tarifa/estado; cambios sensibles → audit. |

### Onboarding
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/onboarding/kit/scan` | POST | admin, owner (o instalador) | FR-ONB-001 | QR válido unclaimed → datos del kit; inválido → 404; retired → 409. |
| `/onboarding/kit/claim` | POST | admin, owner | FR-ONB-002 | Kit unclaimed → active ligado a instalación + audit; ya active en otra → 409 KIT_ALREADY_CLAIMED. |
| `/onboarding/devices/pair` | POST | admin, owner | FR-ONB-004, 005 | Aceptar recommended → paired + Device creado; UNIQUE(kit_id, external_ref). |
| `/onboarding/status` | GET | viewer+ | FR-ONB-007 | Refleja avance kit→devices→perfil→boleta y permite retomar. |

### Devices
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/devices` | GET | viewer+ | FR-ONB-005, FR-BRK-001 | Lista devices del tenant; filtro por `state`. |
| `/devices` | POST | admin, owner | FR-ONB-005 | Crea Device con UNIQUE(kit_id, external_ref); listo para telemetría. |
| `/devices/{id}` | GET | viewer+ | FR-CTRL-003 | Device propio → 200; ajeno → 403/404. |
| `/devices/{id}` | PATCH | admin, owner | FR-SET-003 | Renombrar/categorizar persistido. |

### Telemetry
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/iot/telemetry` | POST | token de kit (`telemetry:ingest`) | FR-DASH-001 | Nuevo event_hash → 200 accepted; repetido → 200 duplicate; inválido → 422. |
| `/installations/{installationId}/telemetry/latest` | GET | viewer+ | FR-DASH-001 | Última lectura por device; sin datos → arreglo vacío / sin live. |
| `/installations/{installationId}/telemetry/range` | GET | viewer+ | FR-BRK-006 | Serie en rango válido; `from>to` → 422 INVALID_RANGE. |

### Dashboard
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/dashboard` | GET | viewer+ | FR-DASH-001..007 | Potencia viva, kWh/CLP del día, estado kit, alertas open; sin datos → empty state. |

### Reports
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/reports/daily` | GET | viewer+ | FR-REP-001 | Serie buckets day con kWh y CLP (CLP solo si hay tarifa). |
| `/installations/{installationId}/reports/weekly` | GET | viewer+ | FR-REP-002 | Serie buckets week. |
| `/installations/{installationId}/reports/monthly` | GET | viewer+ | FR-REP-003 | Serie buckets month. |
| `/installations/{installationId}/reports/last-three-months` | GET | viewer+ | FR-REP-004 | Hasta 3 buckets month; menos disponibles si no hay historial. |

### Breakdown
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/breakdown` | GET | viewer+ | FR-BRK-001..005 | Por device/categoría con %, ranking desc y total = suma de items. |

### Bills
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/bills` | POST | operator, admin, owner | FR-BILL-001..006 | Crea boleta (uploaded/parsed) con file_url; period_end ≥ period_start. |
| `/installations/{installationId}/bills` | GET | viewer+ | FR-BILL-007 | Lista boletas del tenant; filtro por `status`. |

### Alerts
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/alerts` | GET | viewer+ | FR-ALRT-001..006, FR-DASH-006 | Lista alertas del tenant; filtros status/severity/type; orden por severidad. |
| `/alerts/{id}/review` | PATCH | operator, admin, owner | FR-ALRT-005 | open → reviewed/dismissed con reviewed_by/at; baja contador dashboard. |

### Recommendations
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/installations/{installationId}/recommendations` | GET | viewer+ | FR-REC-001..005 | Lista ordenada por prioridad/impacto; CLP solo con tarifa base. |

### Control
| Endpoint | Método | Rol requerido | FR | Criterio de aceptación (resumen) |
|---|---|---|---|---|
| `/devices/{deviceId}/control-actions` | POST | operator, admin, owner | FR-CTRL-001/002/008/009 | Con permiso → 202 ControlAction pending (resuelve async); viewer → 403 + audit. |
| `/devices/{deviceId}/control-schedules` | POST | operator, admin, owner | FR-CTRL-004 | Crea ControlSchedule; valida solapamientos; ejecuciones auditadas. |
| `/devices/{deviceId}/consumption-limits` | POST | operator, admin, owner | FR-CTRL-005/006 | Crea límite (kWh o W) con pre-alerta y acción al exceder. |
| `/devices/{deviceId}/control-state` | GET | viewer+ | FR-CTRL-003 | Estado on/off/unknown + última acción confirmada. |
