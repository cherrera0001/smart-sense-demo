# Modelo Relacional Lógico/Físico — SmartSense (PostgreSQL 16 + TimescaleDB)

> Deriva de `mer-conceptual.md`. ORM objetivo: Prisma. Tipos en notación PostgreSQL. Ver `data-dictionary.md` (semántica por columna), `constraints.md` (reglas) e `indexes.md` (estrategia de índices).

## Convenciones físicas

- PK `id uuid` (UUIDv7 generado en app) salvo `telemetry_readings`.
- `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`.
- Soft delete: `deleted_at timestamptz NULL` en `organizations`, `installations`, `energy_kits`, `devices`.
- Enums implementados como `text` + `CHECK` (portabilidad Prisma) o tipos Postgres `ENUM` (decisión en ADR). Aquí se documentan los valores.
- FKs `ON DELETE RESTRICT` por defecto; `CASCADE` solo donde se indica.

---

### users
| Columna | Tipo | Constraints |
|---|---|---|
| id | uuid | PK |
| email | citext | NOT NULL, UNIQUE |
| password_hash | text | NOT NULL |
| full_name | text | NOT NULL |
| phone | text | NULL |
| locale | text | NOT NULL DEFAULT 'es-CL' |
| status | text | NOT NULL DEFAULT 'active', CHECK in (active,suspended) |
| last_login_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Índices: `UNIQUE(email)`.

### organizations
| id | uuid | PK |
| name | text | NOT NULL |
| legal_id | text | NULL, UNIQUE WHERE not null |
| segment_default | text | NULL, CHECK in (home,smb,business) |
| plan | text | NOT NULL DEFAULT 'free', CHECK in (free,pro,enterprise) |
| status | text | NOT NULL DEFAULT 'active' |
| deleted_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

### memberships
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK→users(id) |
| organization_id | uuid | NOT NULL, FK→organizations(id) ON DELETE CASCADE |
| role | text | NOT NULL, CHECK in (owner,admin,operator,viewer) |
| status | text | NOT NULL DEFAULT 'active', CHECK in (active,invited,revoked) |
| invited_at / accepted_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Constraints: `UNIQUE(user_id, organization_id)`. Índices: `(organization_id)`, `(user_id)`.

### installations
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK→organizations(id) |
| name | text | NOT NULL |
| segment | text | NOT NULL, CHECK in (home,smb,business) |
| address | text | NULL |
| timezone | text | NOT NULL DEFAULT 'America/Santiago' |
| distributor_id | uuid | NULL, FK→distributors(id) |
| tariff_id | uuid | NULL, FK→tariffs(id) |
| status | text | NOT NULL DEFAULT 'active' |
| deleted_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Índices: `(organization_id)`, `(distributor_id)`, `(tariff_id)`.

### installation_profiles
| id | uuid | PK |
| installation_id | uuid | NOT NULL, UNIQUE, FK→installations(id) ON DELETE CASCADE |
| segment | text | NOT NULL, CHECK in (home,smb,business) |
| occupants | int | NULL, CHECK >= 0 |
| heating_system | text | NULL |
| critical_equipment | jsonb | NULL |
| declared_power_kw | numeric(10,2) | NULL, CHECK >= 0 |
| operating_hours | jsonb | NULL |
| extra | jsonb | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

### energy_kits
| id | uuid | PK |
| installation_id | uuid | NULL, FK→installations(id) |
| qr_code | text | NOT NULL, UNIQUE |
| serial | text | NOT NULL |
| model | text | NULL |
| firmware_version | text | NULL |
| status | text | NOT NULL DEFAULT 'unclaimed', CHECK in (unclaimed,active,transferring,retired) |
| claimed_at | timestamptz | NULL |
| deleted_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Índices: `UNIQUE(qr_code)`, `(installation_id)`. Constraint parcial: a lo sumo una fila `status='active'` por `serial`.

### device_categories
| id | uuid | PK |
| key | text | NOT NULL, UNIQUE |
| name | text | NOT NULL |
| icon | text | NULL |
| typical_power_w | numeric(12,2) | NULL |

### devices
| id | uuid | PK |
| kit_id | uuid | NOT NULL, FK→energy_kits(id) ON DELETE CASCADE |
| installation_id | uuid | NOT NULL, FK→installations(id) |
| category_id | uuid | NULL, FK→device_categories(id) |
| name | text | NOT NULL |
| external_ref | text | NOT NULL |
| capabilities | jsonb | NOT NULL DEFAULT '{}' |
| state | text | NOT NULL DEFAULT 'unknown', CHECK in (online,offline,unknown) |
| last_seen_at | timestamptz | NULL |
| deleted_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Constraints: `UNIQUE(kit_id, external_ref)`. Índices: `(installation_id)`, `(category_id)`.

### device_pairings
| id | uuid | PK |
| kit_id | uuid | NOT NULL, FK→energy_kits(id) ON DELETE CASCADE |
| device_external_ref | text | NOT NULL |
| status | text | NOT NULL, CHECK in (paired,recommended,scanning,unpaired,error) |
| device_id | uuid | NULL, FK→devices(id) |
| detail | jsonb | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

### telemetry_readings  (hypertable Timescale, particionada por source_timestamp)
| reading_id | uuid | NOT NULL |
| device_id | uuid | NOT NULL, FK→devices(id) |
| kit_id | uuid | NOT NULL |
| installation_id | uuid | NOT NULL |
| source_timestamp | timestamptz | NOT NULL |
| received_timestamp | timestamptz | NOT NULL DEFAULT now() |
| voltage_v | numeric(8,2) | NULL, CHECK >= 0 |
| current_a | numeric(10,3) | NULL, CHECK >= 0 |
| active_power_w | numeric(12,2) | NULL, CHECK >= 0 |
| reactive_power_var | numeric(12,2) | NULL |
| apparent_power_va | numeric(12,2) | NULL, CHECK >= 0 |
| power_factor | numeric(4,3) | NULL, CHECK between -1 and 1 |
| energy_wh_delta | numeric(14,4) | NULL, CHECK >= 0 |
| frequency_hz | numeric(6,3) | NULL |
| signal_quality | int | NULL |
| firmware_version | text | NULL |
| ingestion_status | text | NOT NULL DEFAULT 'accepted', CHECK in (accepted,duplicate,invalid) |
| event_hash | text | NOT NULL |
| raw_payload | jsonb | NULL |

PK lógica: `(device_id, source_timestamp, reading_id)`. `UNIQUE(event_hash)` para idempotencia. Hypertable: `create_hypertable('telemetry_readings','source_timestamp')`. Compresión + retención vía políticas Timescale.

### energy_aggregates
| id | uuid | PK |
| installation_id | uuid | NOT NULL, FK→installations(id) |
| device_id | uuid | NULL, FK→devices(id) |
| category_id | uuid | NULL, FK→device_categories(id) |
| granularity | text | NOT NULL, CHECK in (hour,day,week,month) |
| bucket_start | timestamptz | NOT NULL |
| energy_kwh | numeric(14,4) | NOT NULL DEFAULT 0, CHECK >= 0 |
| cost_clp | bigint | NULL, CHECK >= 0 |
| peak_power_w | numeric(12,2) | NULL |
| recomputed_at | timestamptz | NOT NULL DEFAULT now() |

Constraints: `UNIQUE(installation_id, device_id, category_id, granularity, bucket_start)`. Índices: `(installation_id, granularity, bucket_start)`.

### distributors
| id | uuid | PK | name text NOT NULL | country text NOT NULL DEFAULT 'CL' | code text NULL UNIQUE |

### tariffs
| id | uuid | PK |
| distributor_id | uuid | NULL, FK→distributors(id) |
| code | text | NOT NULL |
| name | text | NOT NULL |
| segment | text | NULL, CHECK in (home,smb,business) |
| energy_price_clp_kwh | numeric(12,4) | NOT NULL, CHECK >= 0 |
| fixed_charge_clp | bigint | NULL, CHECK >= 0 |
| demand_charge_clp_kw | numeric(12,4) | NULL, CHECK >= 0 |
| valid_from / valid_to | date | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Constraints: `UNIQUE(distributor_id, code, valid_from)`.

### electricity_bills
| id | uuid | PK |
| installation_id | uuid | NOT NULL, FK→installations(id) |
| distributor_id | uuid | NULL, FK→distributors(id) |
| tariff_id | uuid | NULL, FK→tariffs(id) |
| client_number | text | NULL |
| period_start / period_end | date | NOT NULL |
| consumption_kwh | numeric(14,4) | NOT NULL, CHECK >= 0 |
| total_clp | bigint | NOT NULL, CHECK >= 0 |
| fixed_charge_clp | bigint | NULL |
| variable_charge_clp | bigint | NULL |
| due_date | date | NULL |
| file_url | text | NOT NULL |
| status | text | NOT NULL DEFAULT 'uploaded', CHECK in (uploaded,parsed,confirmed) |
| raw_extraction | jsonb | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Constraints: `CHECK(period_end >= period_start)`. Índices: `(installation_id, period_start)`.

### alerts
| id | uuid | PK |
| installation_id | uuid | NOT NULL, FK→installations(id) |
| device_id | uuid | NULL, FK→devices(id) |
| type | text | NOT NULL, CHECK in (anomaly,high_device,over_budget,offline) |
| severity | text | NOT NULL, CHECK in (info,warning,critical) |
| status | text | NOT NULL DEFAULT 'open', CHECK in (open,reviewed,dismissed) |
| message | text | NOT NULL |
| context | jsonb | NULL |
| estimated_impact_clp | bigint | NULL |
| reviewed_by | uuid | NULL, FK→users(id) |
| reviewed_at | timestamptz | NULL |
| created_at/updated_at | timestamptz | NOT NULL |

Índices: `(installation_id, status)`, `(device_id)`.

### recommendations
| id | uuid | PK |
| installation_id | uuid | NOT NULL, FK→installations(id) |
| alert_id | uuid | NULL, FK→alerts(id) |
| source | text | NOT NULL, CHECK in (alert,periodic_analysis) |
| title | text | NOT NULL |
| description | text | NOT NULL |
| estimated_saving_clp | bigint | NULL |
| priority | int | NOT NULL DEFAULT 0 |
| status | text | NOT NULL DEFAULT 'new', CHECK in (new,applied,dismissed) |
| created_at/updated_at | timestamptz | NOT NULL |

### control_actions
| id | uuid | PK |
| device_id | uuid | NOT NULL, FK→devices(id) |
| user_id | uuid | NOT NULL, FK→users(id) |
| type | text | NOT NULL, CHECK in (turn_on,turn_off,set_limit) |
| status | text | NOT NULL DEFAULT 'pending', CHECK in (pending,success,failed,rejected) |
| payload | jsonb | NULL |
| result | jsonb | NULL |
| requested_at | timestamptz | NOT NULL DEFAULT now() |
| resolved_at | timestamptz | NULL |

Índices: `(device_id, requested_at)`.

### control_schedules
| id | uuid | PK |
| device_id | uuid | NOT NULL, FK→devices(id) ON DELETE CASCADE |
| action | text | NOT NULL, CHECK in (turn_on,turn_off) |
| rule | jsonb | NOT NULL |
| enabled | boolean | NOT NULL DEFAULT true |
| created_by | uuid | NOT NULL, FK→users(id) |
| created_at/updated_at | timestamptz | NOT NULL |

### consumption_limits
| id | uuid | PK |
| device_id | uuid | NOT NULL, FK→devices(id) ON DELETE CASCADE |
| limit_kwh | numeric(14,4) | NULL, CHECK > 0 |
| limit_power_w | numeric(12,2) | NULL, CHECK > 0 |
| window | text | NOT NULL, CHECK in (day,month) |
| pre_alert_pct | int | NULL, CHECK between 1 and 100 |
| action_on_exceed | text | NOT NULL DEFAULT 'alert', CHECK in (alert,turn_off) |
| enabled | boolean | NOT NULL DEFAULT true |
| created_at/updated_at | timestamptz | NOT NULL |

### notifications
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK→organizations(id) |
| installation_id | uuid | NULL, FK→installations(id) |
| user_id | uuid | NULL, FK→users(id) |
| channel | text | NOT NULL, CHECK in (in_app,email,push) |
| title | text | NOT NULL |
| body | text | NOT NULL |
| read_at | timestamptz | NULL |
| related_type | text | NULL |
| related_id | uuid | NULL |
| created_at | timestamptz | NOT NULL |

Índices: `(user_id, read_at)`, `(organization_id)`.

### audit_logs  (append-only)
| id | uuid | PK |
| organization_id | uuid | NOT NULL, FK→organizations(id) |
| user_id | uuid | NULL, FK→users(id) |
| action | text | NOT NULL |
| entity_type | text | NOT NULL |
| entity_id | uuid | NULL |
| before | jsonb | NULL |
| after | jsonb | NULL |
| ip | inet | NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Índices: `(organization_id, created_at)`, `(entity_type, entity_id)`. Sin UPDATE/DELETE (trigger de protección).

## Resumen de 21 tablas

`users`, `organizations`, `memberships`, `installations`, `installation_profiles`, `energy_kits`, `device_categories`, `devices`, `device_pairings`, `telemetry_readings`, `energy_aggregates`, `distributors`, `tariffs`, `electricity_bills`, `alerts`, `recommendations`, `control_actions`, `control_schedules`, `consumption_limits`, `notifications`, `audit_logs`.

## Notas de implementación Fase 1

> Reflejan lo materializado en `packages/db/prisma/schema.prisma` y `packages/db/prisma/migrations/0001_init/migration.sql`. Ver `docs/database/phase-1-db-setup.md`.

- **(a) `organizations.is_demo boolean NOT NULL DEFAULT false`** — desviación menor respecto a este modelo: columna añadida como **marca de datos demo**. Todos los datos demo del seed (`packages/db/prisma/seed.ts`) cuelgan de una organización con `is_demo=true`; el catálogo global (`device_categories`, `distributors`, `tariffs`) no se marca como demo. Permite distinguir datos de escaparate de datos productivos sin tablas separadas.
- **(b) Idempotencia de telemetría — UNIQUE físico compuesto.** El modelo declara `UNIQUE(event_hash)` como intención lógica. En la **hypertable Timescale**, el índice único físico debe incluir la columna de particionamiento, por lo que se materializa como **`UNIQUE(event_hash, source_timestamp)`**. En Prisma se mantiene `@unique` simple sobre `event_hash` (intención lógica) y el índice compuesto real se crea en la migración SQL. La idempotencia por `event_hash` (INV-6) se preserva: el `event_hash` deriva de `source_timestamp`, de modo que un evento repetido produce la misma pareja `(event_hash, source_timestamp)`.
- **(c) Enums como enums nativos.** Los valores enumerados (los 14 enums canónicos + 10 enums auxiliares de estado, 24 en total) se implementaron como **enums nativos PostgreSQL/Prisma** (no `text+CHECK`). Decisión que reemplaza la nota original "`text` + `CHECK` (portabilidad Prisma)"; los enums nativos dan validación a nivel de tipo y mejor integración con el cliente Prisma. Los CHECK de dominio numérico/temporal (no-negatividad, rangos, `period_end ≥ period_start`, etc.) sí se aplican vía SQL en la migración.
