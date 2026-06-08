# Diccionario de Datos — SmartSense

> Deriva de `specs/03-data-model/relational-model.md`. Documenta cada tabla y columna: descripción, tipo, obligatoriedad, ejemplo, validaciones, sensibilidad y origen del dato. Las constraints completas viven en `constraints.md`; los índices en `indexes.md`.

## Leyenda

- **Oblig.:** `NN` = NOT NULL · `NULL` = admite nulo · `PK`/`FK`/`UQ` indican rol clave.
- **Sensibilidad:**
  - **Pública** = no sensible (catálogos).
  - **Interna** = operativa, no expone identidad ni hábitos.
  - **Sensible** = datos de negocio/operación con impacto si se filtran (consumo, control remoto, montos).
  - **PII** = identifica a una persona o cliente eléctrico.
- **Origen:** `usuario` · `sistema` (generado por la app) · `IoT` (dispositivo/broker) · `boleta` (carga/OCR) · `cálculo` (derivado) · `externa` (integración: distribuidora, email/push, OAuth).
- Convenciones de tipos en `_canon.md` (UUIDv7, CLP entero, energía/potencia numéricas, `timestamptz`).
- Columnas comunes salvo indicación: `created_at`/`updated_at timestamptz NN DEFAULT now()`; soft delete `deleted_at timestamptz NULL` donde el canon lo define.

---

## users

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de la cuenta | `018f...` | UUIDv7 | Interna | sistema |
| email | citext | NN UQ | Correo de login | `cris@c4a.cl` | único global, formato email | **PII** | usuario |
| password_hash | text | NN | Hash Argon2id de la contraseña | `$argon2id$...` | nunca se expone | **Sensible** | sistema |
| full_name | text | NN | Nombre completo | `Cristóbal Herrera` | — | **PII** | usuario |
| phone | text | NULL | Teléfono de contacto | `+56912345678` | formato E.164 | **PII** | usuario |
| locale | text | NN | Locale de UI | `es-CL` | default `es-CL` | Interna | usuario/sistema |
| status | text | NN | Estado de cuenta | `active` | `active\|suspended` | Interna | sistema |
| last_login_at | timestamptz | NULL | Último login exitoso | `2026-06-01T12:00Z` | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## organizations

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador del tenant | `018f...` | UUIDv7 | Interna | sistema |
| name | text | NN | Razón social / nombre | `Panadería Sur` | — | Interna | usuario |
| legal_id | text | NULL UQ | RUT u otro identificador legal | `76.123.456-7` | único cuando no nulo | **PII** | usuario |
| segment_default | text | NULL | Segmento por defecto | `smb` | `home\|smb\|business` | Interna | usuario |
| plan | text | NN | Plan SaaS | `pro` | `free\|pro\|enterprise` | Interna | sistema |
| status | text | NN | Estado del tenant | `active` | default `active` | Interna | sistema |
| deleted_at | timestamptz | NULL | Soft delete | — | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## memberships

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de membresía | `018f...` | UUIDv7 | Interna | sistema |
| user_id | uuid | NN FK | Usuario vinculado | `018f...` | FK→users | Interna | sistema |
| organization_id | uuid | NN FK | Organización | `018f...` | FK→organizations ON DELETE CASCADE | Interna | sistema |
| role | text | NN | Rol RBAC | `operator` | `owner\|admin\|operator\|viewer` | **Sensible** | usuario/sistema |
| status | text | NN | Estado de la membresía | `active` | `active\|invited\|revoked` | Interna | sistema |
| invited_at / accepted_at | timestamptz | NULL | Hitos de invitación | — | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

UNIQUE (`user_id`, `organization_id`).

## installations

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador del sitio | `018f...` | UUIDv7 | Interna | sistema |
| organization_id | uuid | NN FK | Tenant dueño | `018f...` | FK→organizations | Interna | sistema |
| name | text | NN | Nombre del sitio | `Local Centro` | — | Interna | usuario |
| segment | text | NN | Segmento del sitio | `business` | `home\|smb\|business` | Interna | usuario |
| address | text | NULL | Dirección física | `Av. X 123, Concepción` | — | **PII** | usuario |
| timezone | text | NN | Zona horaria | `America/Santiago` | default `America/Santiago` | Interna | usuario/sistema |
| distributor_id | uuid | NULL FK | Distribuidora eléctrica | `018f...` | FK→distributors | Interna | usuario/externa |
| tariff_id | uuid | NULL FK | Tarifa asignada | `018f...` | FK→tariffs | Sensible | usuario/cálculo |
| status | text | NN | Estado del sitio | `active` | `active\|inactive` | Interna | sistema |
| deleted_at | timestamptz | NULL | Soft delete | — | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## installation_profiles

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de perfil | `018f...` | UUIDv7 | Interna | sistema |
| installation_id | uuid | NN UQ FK | Instalación caracterizada | `018f...` | FK→installations ON DELETE CASCADE, 1:1 | Interna | sistema |
| segment | text | NN | Segmento del perfil | `home` | `home\|smb\|business` | Interna | usuario |
| occupants | int | NULL | N° de ocupantes | `4` | `>= 0` | **Sensible** | usuario |
| heating_system | text | NULL | Sistema de calefacción | `gas` | — | **Sensible** | usuario |
| critical_equipment | jsonb | NULL | Equipos críticos declarados | `[{"name":"cámara frío"}]` | — | **Sensible** | usuario |
| declared_power_kw | numeric(10,2) | NULL | Potencia declarada | `15.00` | `>= 0` | Sensible | usuario |
| operating_hours | jsonb | NULL | Horario de operación | `{"mon":["08:00","20:00"]}` | — | **Sensible** | usuario |
| extra | jsonb | NULL | Datos específicos por segmento | `{...}` | shape valida vs segment | **Sensible** | usuario |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## energy_kits

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador del kit | `018f...` | UUIDv7 | Interna | sistema |
| installation_id | uuid | NULL FK | Instalación (NULL hasta claim) | `018f...` | FK→installations | Interna | sistema |
| qr_code | text | NN UQ | Código QR del kit | `SS-QR-7F3A` | único global | **Sensible** | sistema/IoT |
| serial | text | NN | Serial del hardware | `KIT-0001` | — | Interna | IoT |
| model | text | NULL | Modelo del kit | `SS-Home-v2` | — | Pública | IoT |
| firmware_version | text | NULL | Firmware actual | `1.4.2` | — | Interna | IoT |
| status | text | NN | Estado del kit | `active` | `unclaimed\|active\|transferring\|retired` | Interna | sistema |
| claimed_at | timestamptz | NULL | Momento de claim | — | — | Interna | sistema |
| deleted_at | timestamptz | NULL | Soft delete | — | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

UNIQUE parcial: a lo sumo una fila `status='active'` por `serial`.

## device_categories

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de categoría | `018f...` | UUIDv7 | Pública | sistema |
| key | text | NN UQ | Clave estable | `refrigeration` | único | Pública | sistema |
| name | text | NN | Nombre legible | `Refrigeración` | — | Pública | sistema |
| icon | text | NULL | Icono UI | `snowflake` | — | Pública | sistema |
| typical_power_w | numeric(12,2) | NULL | Potencia típica de referencia | `350.00` | — | Pública | sistema |

## devices

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador del dispositivo | `018f...` | UUIDv7 | Interna | sistema |
| kit_id | uuid | NN FK | Kit dueño | `018f...` | FK→energy_kits ON DELETE CASCADE | Interna | sistema |
| installation_id | uuid | NN FK | Instalación (denormalizado) | `018f...` | FK→installations | Interna | sistema |
| category_id | uuid | NULL FK | Categoría para desglose | `018f...` | FK→device_categories | Interna | usuario/sistema |
| name | text | NN | Nombre del dispositivo | `Refrigerador cocina` | — | Interna | usuario |
| external_ref | text | NN | ID en kit/broker | `plug-03` | único por kit | Interna | IoT |
| capabilities | jsonb | NN | Capacidades del device | `{"meter":true,"switch":true}` | default `{}` | Interna | IoT |
| state | text | NN | Estado de conexión | `online` | `online\|offline\|unknown` | Interna | IoT/cálculo |
| last_seen_at | timestamptz | NULL | Última telemetría recibida | — | — | Interna | IoT/cálculo |
| deleted_at | timestamptz | NULL | Soft delete | — | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

UNIQUE (`kit_id`, `external_ref`).

## device_pairings

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador del pairing | `018f...` | UUIDv7 | Interna | sistema |
| kit_id | uuid | NN FK | Kit en emparejamiento | `018f...` | FK→energy_kits ON DELETE CASCADE | Interna | sistema |
| device_external_ref | text | NN | Ref del device candidato | `plug-03` | — | Interna | IoT |
| status | text | NN | Estado del pairing | `paired` | `paired\|recommended\|scanning\|unpaired\|error` | Interna | IoT/sistema |
| device_id | uuid | NULL FK | Device resuelto | `018f...` | FK→devices | Interna | sistema |
| detail | jsonb | NULL | Detalle del proceso | `{"rssi":-60}` | — | Interna | IoT |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## telemetry_readings (hypertable Timescale, partición por source_timestamp)

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| reading_id | uuid | NN | Identificador de la lectura | `018f...` | parte de PK lógica | Interna | IoT |
| device_id | uuid | NN FK | Dispositivo emisor | `018f...` | FK→devices | Interna | IoT |
| kit_id | uuid | NN | Kit (denormalizado) | `018f...` | — | Interna | IoT |
| installation_id | uuid | NN | Instalación (denormalizado) | `018f...` | — | Interna | IoT |
| source_timestamp | timestamptz | NN | Instante en el dispositivo | `2026-06-01T11:59Z` | válido, no muy futuro | **Sensible** | IoT |
| received_timestamp | timestamptz | NN | Instante de recepción | `2026-06-01T12:00Z` | default now() | Interna | sistema |
| voltage_v | numeric(8,2) | NULL | Tensión (V) | `220.30` | `>= 0` | **Sensible** | IoT |
| current_a | numeric(10,3) | NULL | Corriente (A) | `1.420` | `>= 0` | **Sensible** | IoT |
| active_power_w | numeric(12,2) | NULL | Potencia activa (W) | `312.50` | `>= 0` | **Sensible** | IoT |
| reactive_power_var | numeric(12,2) | NULL | Potencia reactiva (VAR) | `40.00` | — | **Sensible** | IoT |
| apparent_power_va | numeric(12,2) | NULL | Potencia aparente (VA) | `315.00` | `>= 0` | **Sensible** | IoT |
| power_factor | numeric(4,3) | NULL | Factor de potencia | `0.993` | `[-1,1]` | Sensible | IoT |
| energy_wh_delta | numeric(14,4) | NULL | Energía incremental (Wh) | `5.2000` | `>= 0` | **Sensible** | IoT |
| frequency_hz | numeric(6,3) | NULL | Frecuencia (Hz) | `50.010` | — | Sensible | IoT |
| signal_quality | int | NULL | Calidad de señal | `87` | — | Interna | IoT |
| firmware_version | text | NULL | Firmware del emisor | `1.4.2` | — | Interna | IoT |
| ingestion_status | text | NN | Resultado de ingesta | `accepted` | `accepted\|duplicate\|invalid` | Interna | sistema |
| event_hash | text | NN UQ | Hash de idempotencia | `sha256:...` | único | Interna | sistema |
| raw_payload | jsonb | NULL | Payload crudo del broker | `{...}` | — | **Sensible** | IoT |

PK lógica (`device_id`, `source_timestamp`, `reading_id`); UNIQUE(`event_hash`). El patrón temporal de consumo es dato sensible (revela hábitos/ocupación).

## energy_aggregates

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador del agregado | `018f...` | UUIDv7 | Interna | sistema |
| installation_id | uuid | NN FK | Instalación | `018f...` | FK→installations | Interna | sistema |
| device_id | uuid | NULL FK | Device (si aplica) | `018f...` | FK→devices | Interna | sistema |
| category_id | uuid | NULL FK | Categoría (si aplica) | `018f...` | FK→device_categories | Interna | sistema |
| granularity | text | NN | Granularidad del bucket | `day` | `hour\|day\|week\|month` | Interna | sistema |
| bucket_start | timestamptz | NN | Inicio del bucket | `2026-06-01T00:00Z` | — | Interna | sistema |
| energy_kwh | numeric(14,4) | NN | Energía agregada (kWh) | `12.4000` | `>= 0`, default 0 | **Sensible** | cálculo |
| cost_clp | bigint | NULL | Costo estimado (CLP) | `2150` | `>= 0` | **Sensible** | cálculo |
| peak_power_w | numeric(12,2) | NULL | Pico de potencia (W) | `1800.00` | — | Sensible | cálculo |
| recomputed_at | timestamptz | NN | Último recálculo | — | default now() | Interna | sistema |

UNIQUE (`installation_id`, `device_id`, `category_id`, `granularity`, `bucket_start`).

## distributors

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador | `018f...` | UUIDv7 | Pública | sistema |
| name | text | NN | Nombre de la distribuidora | `Enel Distribución` | — | Pública | externa/sistema |
| country | text | NN | País | `CL` | default `CL` | Pública | sistema |
| code | text | NULL UQ | Código de la distribuidora | `ENEL` | único | Pública | externa/sistema |

## tariffs

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de tarifa | `018f...` | UUIDv7 | Pública | sistema |
| distributor_id | uuid | NULL FK | Distribuidora (NULL = genérica) | `018f...` | FK→distributors | Pública | externa |
| code | text | NN | Código tarifario | `BT1` | — | Pública | externa |
| name | text | NN | Nombre legible | `Baja Tensión 1` | — | Pública | externa |
| segment | text | NULL | Segmento aplicable | `home` | `home\|smb\|business` | Pública | sistema |
| energy_price_clp_kwh | numeric(12,4) | NN | Precio energía (CLP/kWh) | `145.5000` | `>= 0` | **Sensible** | externa |
| fixed_charge_clp | bigint | NULL | Cargo fijo (CLP) | `1200` | `>= 0` | Sensible | externa |
| demand_charge_clp_kw | numeric(12,4) | NULL | Cargo por demanda (CLP/kW) | `8500.0000` | `>= 0` | Sensible | externa |
| valid_from / valid_to | date | NULL | Vigencia | `2026-01-01` | — | Pública | externa |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

UNIQUE (`distributor_id`, `code`, `valid_from`).

## electricity_bills

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de boleta | `018f...` | UUIDv7 | Interna | sistema |
| installation_id | uuid | NN FK | Instalación | `018f...` | FK→installations | Interna | sistema |
| distributor_id | uuid | NULL FK | Distribuidora | `018f...` | FK→distributors | Interna | boleta/usuario |
| tariff_id | uuid | NULL FK | Tarifa inferida/asignada | `018f...` | FK→tariffs | Sensible | boleta/cálculo |
| client_number | text | NULL | N° de cliente eléctrico | `1234567-8` | — | **PII** | boleta/usuario |
| period_start / period_end | date | NN | Periodo facturado | `2026-05-01` / `2026-05-31` | `period_end >= period_start` | Sensible | boleta |
| consumption_kwh | numeric(14,4) | NN | Consumo facturado (kWh) | `310.0000` | `>= 0` | **Sensible** | boleta |
| total_clp | bigint | NN | Total a pagar (CLP) | `48500` | `>= 0` | **Sensible** | boleta |
| fixed_charge_clp | bigint | NULL | Cargo fijo (CLP) | `1200` | — | Sensible | boleta |
| variable_charge_clp | bigint | NULL | Cargo variable (CLP) | `47300` | — | Sensible | boleta |
| due_date | date | NULL | Vencimiento | `2026-06-15` | — | Sensible | boleta |
| file_url | text | NN | Referencia al archivo original | `s3://bills/...` | storage privado/firmado | **PII/Sensible** | usuario |
| status | text | NN | Estado de la boleta | `confirmed` | `uploaded\|parsed\|confirmed` | Interna | sistema |
| raw_extraction | jsonb | NULL | Extracción cruda OCR | `{...}` | — | **Sensible** | externa(OCR) |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## alerts

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de alerta | `018f...` | UUIDv7 | Interna | sistema |
| installation_id | uuid | NN FK | Instalación | `018f...` | FK→installations | Interna | sistema |
| device_id | uuid | NULL FK | Device (si aplica) | `018f...` | FK→devices | Interna | sistema |
| type | text | NN | Tipo de alerta | `over_budget` | `anomaly\|high_device\|over_budget\|offline` | Sensible | cálculo |
| severity | text | NN | Severidad | `warning` | `info\|warning\|critical` | Interna | cálculo |
| status | text | NN | Estado | `open` | `open\|reviewed\|dismissed`, default `open` | Interna | sistema |
| message | text | NN | Mensaje | `Consumo 30% sobre presupuesto` | — | Sensible | cálculo |
| context | jsonb | NULL | Contexto de detección | `{"window":"day"}` | — | Sensible | cálculo |
| estimated_impact_clp | bigint | NULL | Impacto estimado (CLP) | `5200` | — | **Sensible** | cálculo |
| reviewed_by | uuid | NULL FK | Usuario revisor | `018f...` | FK→users | Interna | usuario |
| reviewed_at | timestamptz | NULL | Momento de revisión | — | — | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## recommendations

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador | `018f...` | UUIDv7 | Interna | sistema |
| installation_id | uuid | NN FK | Instalación | `018f...` | FK→installations | Interna | sistema |
| alert_id | uuid | NULL FK | Alerta origen (si aplica) | `018f...` | FK→alerts | Interna | sistema |
| source | text | NN | Fuente | `alert` | `alert\|periodic_analysis` | Interna | sistema |
| title | text | NN | Título | `Apagar cámara fuera de horario` | — | Sensible | cálculo |
| description | text | NN | Descripción | `...` | — | Sensible | cálculo |
| estimated_saving_clp | bigint | NULL | Ahorro estimado (CLP) | `8000` | NULL si no hay base | **Sensible** | cálculo |
| priority | int | NN | Prioridad | `2` | default 0 | Interna | cálculo |
| status | text | NN | Estado | `new` | `new\|applied\|dismissed`, default `new` | Interna | sistema |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## control_actions

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador de acción | `018f...` | UUIDv7 | Interna | sistema |
| device_id | uuid | NN FK | Device objetivo | `018f...` | FK→devices | **Sensible** | sistema |
| user_id | uuid | NN FK | Usuario solicitante | `018f...` | FK→users | **Sensible** | usuario |
| type | text | NN | Tipo de acción | `turn_off` | `turn_on\|turn_off\|set_limit` | **Sensible** | usuario |
| status | text | NN | Resultado | `success` | `pending\|success\|failed\|rejected`, default `pending` | **Sensible** | sistema/IoT |
| payload | jsonb | NULL | Parámetros del comando | `{"limit_w":1000}` | — | Sensible | usuario |
| result | jsonb | NULL | Resultado del device | `{"ok":true}` | — | Sensible | IoT |
| requested_at | timestamptz | NN | Solicitud | — | default now() | Interna | sistema |
| resolved_at | timestamptz | NULL | Resolución | — | — | Interna | sistema |

Toda acción se audita en `audit_logs` (control remoto = dato sensible).

## control_schedules

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador | `018f...` | UUIDv7 | Interna | sistema |
| device_id | uuid | NN FK | Device objetivo | `018f...` | FK→devices ON DELETE CASCADE | **Sensible** | sistema |
| action | text | NN | Acción programada | `turn_off` | `turn_on\|turn_off` | **Sensible** | usuario |
| rule | jsonb | NN | Regla horaria | `{"cron":"0 22 * * *"}` | regla válida | Sensible | usuario |
| enabled | boolean | NN | Habilitada | `true` | default true | Interna | usuario |
| created_by | uuid | NN FK | Creador | `018f...` | FK→users | **Sensible** | usuario |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## consumption_limits

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador | `018f...` | UUIDv7 | Interna | sistema |
| device_id | uuid | NN FK | Device limitado | `018f...` | FK→devices ON DELETE CASCADE | Sensible | sistema |
| limit_kwh | numeric(14,4) | NULL | Límite de energía (kWh) | `20.0000` | `> 0` | Sensible | usuario |
| limit_power_w | numeric(12,2) | NULL | Límite de potencia (W) | `1500.00` | `> 0` | Sensible | usuario |
| window | text | NN | Ventana de medición | `day` | `day\|month` | Interna | usuario |
| pre_alert_pct | int | NULL | Umbral de pre-alerta (%) | `80` | `[1,100]` | Interna | usuario |
| action_on_exceed | text | NN | Acción al exceder | `alert` | `alert\|turn_off`, default `alert` | **Sensible** | usuario |
| enabled | boolean | NN | Habilitado | `true` | default true | Interna | usuario |
| created_at / updated_at | timestamptz | NN | Auditoría temporal | — | default now() | Interna | sistema |

## notifications

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador | `018f...` | UUIDv7 | Interna | sistema |
| organization_id | uuid | NN FK | Tenant | `018f...` | FK→organizations | Interna | sistema |
| installation_id | uuid | NULL FK | Instalación | `018f...` | FK→installations | Interna | sistema |
| user_id | uuid | NULL FK | Destinatario | `018f...` | FK→users | Interna | sistema |
| channel | text | NN | Canal de entrega | `email` | `in_app\|email\|push` | Interna | sistema |
| title | text | NN | Título | `Alerta de consumo` | — | Sensible | sistema |
| body | text | NN | Cuerpo | `...` | — | Sensible | sistema |
| read_at | timestamptz | NULL | Lectura | — | — | Interna | sistema |
| related_type | text | NULL | Tipo de entidad relacionada | `alert` | — | Interna | sistema |
| related_id | uuid | NULL | Id de entidad relacionada | `018f...` | — | Interna | sistema |
| created_at | timestamptz | NN | Creación | — | default now() | Interna | sistema |

## audit_logs (append-only)

| Columna | Tipo | Oblig. | Descripción | Ejemplo | Validaciones | Sensibilidad | Origen |
|---|---|---|---|---|---|---|---|
| id | uuid | PK NN | Identificador | `018f...` | UUIDv7 | Interna | sistema |
| organization_id | uuid | NN FK | Tenant | `018f...` | FK→organizations | Interna | sistema |
| user_id | uuid | NULL FK | Actor (NULL = sistema) | `018f...` | FK→users | **Sensible** | sistema |
| action | text | NN | Acción ejecutada | `control.requested` | — | **Sensible** | sistema |
| entity_type | text | NN | Tipo de entidad | `control_action` | — | Interna | sistema |
| entity_id | uuid | NULL | Id de la entidad | `018f...` | — | Interna | sistema |
| before | jsonb | NULL | Estado previo | `{...}` | — | **Sensible** | sistema |
| after | jsonb | NULL | Estado posterior | `{...}` | — | **Sensible** | sistema |
| ip | inet | NULL | IP del actor | `190.x.x.x` | — | **PII** | sistema |
| created_at | timestamptz | NN | Momento | — | default now() | Interna | sistema |

Append-only (sin UPDATE/DELETE; trigger de protección).

---

## Resumen de datos especialmente sensibles

| Dato | Tabla.columna | Clasificación | Nota de manejo |
|---|---|---|---|
| Email | `users.email` | PII | minimizar exposición, no en logs |
| Nombre / teléfono | `users.full_name`, `users.phone` | PII | acceso scoped |
| RUT / dato legal | `organizations.legal_id` | PII | único, cifrado en reposo recomendado |
| Dirección | `installations.address` | PII | scoped por tenant |
| N° cliente eléctrico | `electricity_bills.client_number` | PII | dato de cliente de distribuidora |
| Archivo de boleta | `electricity_bills.file_url` | PII/Sensible | storage privado, URL firmada, retención legal |
| Patrón de consumo | `telemetry_readings.*`, `energy_aggregates.energy_kwh` | Sensible | revela hábitos/ocupación |
| Control remoto | `control_actions.*`, `control_schedules.*` | Sensible | requiere RBAC + auditoría |
| Montos / costos | `*_clp`, `total_clp`, precios de tarifa | Sensible | calculados en backend |
| Bitácora | `audit_logs.before/after/ip` | Sensible/PII | inmutable, acceso restringido |
