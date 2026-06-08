-- =====================================================================================
-- SmartSense — Migración inicial (0001_init)
-- PostgreSQL 16 (+ TimescaleDB opcional para telemetry_readings).
-- Fuente de verdad: specs/03-data-model/{relational-model,constraints,indexes}.md,
-- specs/_canon.md y specs/07-iot/telemetry-model.md.
--
-- Esta migración es manual (no generada por `prisma migrate diff`) porque incluye
-- elementos que Prisma no expresa: CHECK constraints, citext, UNIQUE/índices parciales,
-- NULLS NOT DISTINCT, hypertable Timescale, y triggers (updated_at + append-only).
--
-- Ejecutable de corrido en Postgres 16 con o sin la extensión timescaledb instalada.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 0. Extensiones
-- -------------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- TimescaleDB es opcional. Si no está disponible en el clúster, continuamos sin fallar:
-- telemetry_readings funcionará como tabla normal (sin particionamiento de hypertable).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB no disponible (%); telemetry_readings se creará como tabla regular.', SQLERRM;
END$$;

-- -------------------------------------------------------------------------------------
-- 1. Tipos ENUM (14 canónicos + estados de tabla con CHECK IN del modelo relacional)
-- -------------------------------------------------------------------------------------
CREATE TYPE "installation_segment"     AS ENUM ('home', 'smb', 'business');
CREATE TYPE "membership_role"          AS ENUM ('owner', 'admin', 'operator', 'viewer');
CREATE TYPE "pairing_status"           AS ENUM ('paired', 'recommended', 'scanning', 'unpaired', 'error');
CREATE TYPE "device_state"             AS ENUM ('online', 'offline', 'unknown');
CREATE TYPE "control_action_type"      AS ENUM ('turn_on', 'turn_off', 'set_limit');
CREATE TYPE "control_action_status"    AS ENUM ('pending', 'success', 'failed', 'rejected');
CREATE TYPE "alert_severity"           AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "alert_status"             AS ENUM ('open', 'reviewed', 'dismissed');
CREATE TYPE "alert_type"               AS ENUM ('anomaly', 'high_device', 'over_budget', 'offline');
CREATE TYPE "recommendation_source"    AS ENUM ('alert', 'periodic_analysis');
CREATE TYPE "bill_status"              AS ENUM ('uploaded', 'parsed', 'confirmed');
CREATE TYPE "ingestion_status"         AS ENUM ('accepted', 'duplicate', 'invalid');
CREATE TYPE "aggregate_granularity"    AS ENUM ('hour', 'day', 'week', 'month');
CREATE TYPE "notification_channel"     AS ENUM ('in_app', 'email', 'push');

CREATE TYPE "user_status"              AS ENUM ('active', 'suspended');
CREATE TYPE "organization_plan"        AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE "organization_status"      AS ENUM ('active', 'suspended');
CREATE TYPE "membership_status"        AS ENUM ('active', 'invited', 'revoked');
CREATE TYPE "installation_status"      AS ENUM ('active', 'inactive');
CREATE TYPE "energy_kit_status"        AS ENUM ('unclaimed', 'active', 'transferring', 'retired');
CREATE TYPE "recommendation_status"    AS ENUM ('new', 'applied', 'dismissed');
CREATE TYPE "control_schedule_action"  AS ENUM ('turn_on', 'turn_off');
CREATE TYPE "limit_window"             AS ENUM ('day', 'month');
CREATE TYPE "limit_action_on_exceed"   AS ENUM ('alert', 'turn_off');

-- -------------------------------------------------------------------------------------
-- 2. Tablas
-- -------------------------------------------------------------------------------------

-- users -------------------------------------------------------------------------------
CREATE TABLE "users" (
  "id"            uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email"         citext        NOT NULL,
  "password_hash" text          NOT NULL,
  "full_name"     text          NOT NULL,
  "phone"         text,
  "locale"        text          NOT NULL DEFAULT 'es-CL',
  "status"        user_status   NOT NULL DEFAULT 'active',
  "last_login_at" timestamptz,
  "created_at"    timestamptz   NOT NULL DEFAULT now(),
  "updated_at"    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- organizations -----------------------------------------------------------------------
CREATE TABLE "organizations" (
  "id"              uuid                PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"            text                NOT NULL,
  "legal_id"        text,
  "segment_default" installation_segment,
  "plan"            organization_plan   NOT NULL DEFAULT 'free',
  "status"          organization_status NOT NULL DEFAULT 'active',
  "is_demo"         boolean             NOT NULL DEFAULT false,
  "deleted_at"      timestamptz,
  "created_at"      timestamptz         NOT NULL DEFAULT now(),
  "updated_at"      timestamptz         NOT NULL DEFAULT now()
);
-- UNIQUE parcial: legal_id único cuando no es NULL
CREATE UNIQUE INDEX "organizations_legal_id_key"
  ON "organizations" ("legal_id") WHERE "legal_id" IS NOT NULL;

-- memberships -------------------------------------------------------------------------
CREATE TABLE "memberships" (
  "id"              uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"         uuid              NOT NULL,
  "organization_id" uuid              NOT NULL,
  "role"            membership_role   NOT NULL,
  "status"          membership_status NOT NULL DEFAULT 'active',
  "invited_at"      timestamptz,
  "accepted_at"     timestamptz,
  "created_at"      timestamptz       NOT NULL DEFAULT now(),
  "updated_at"      timestamptz       NOT NULL DEFAULT now(),
  CONSTRAINT "memberships_user_org_key" UNIQUE ("user_id", "organization_id"),
  CONSTRAINT "memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
  CONSTRAINT "memberships_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE
);
CREATE INDEX "memberships_organization_id_idx" ON "memberships" ("organization_id");
CREATE INDEX "memberships_user_id_idx" ON "memberships" ("user_id");

-- distributors ------------------------------------------------------------------------
CREATE TABLE "distributors" (
  "id"      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"    text NOT NULL,
  "country" text NOT NULL DEFAULT 'CL',
  "code"    text
);
-- UNIQUE completo (no parcial): `code` es la clave natural usada por upsert (ON CONFLICT).
-- Postgres permite múltiples NULL en un UNIQUE no parcial, así que respeta `code` nullable.
CREATE UNIQUE INDEX "distributors_code_key"
  ON "distributors" ("code");

-- tariffs -----------------------------------------------------------------------------
CREATE TABLE "tariffs" (
  "id"                   uuid                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  "distributor_id"       uuid,
  "code"                 text                 NOT NULL,
  "name"                 text                 NOT NULL,
  "segment"              installation_segment,
  "energy_price_clp_kwh" numeric(12,4)        NOT NULL,
  "fixed_charge_clp"     bigint,
  "demand_charge_clp_kw" numeric(12,4),
  "valid_from"           date,
  "valid_to"             date,
  "created_at"           timestamptz          NOT NULL DEFAULT now(),
  "updated_at"           timestamptz          NOT NULL DEFAULT now(),
  CONSTRAINT "tariffs_distributor_code_valid_from_key" UNIQUE ("distributor_id", "code", "valid_from"),
  CONSTRAINT "tariffs_distributor_id_fkey"
    FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE RESTRICT,
  CONSTRAINT "tariffs_energy_price_chk"  CHECK ("energy_price_clp_kwh" >= 0),
  CONSTRAINT "tariffs_fixed_charge_chk"  CHECK ("fixed_charge_clp" IS NULL OR "fixed_charge_clp" >= 0),
  CONSTRAINT "tariffs_demand_charge_chk" CHECK ("demand_charge_clp_kw" IS NULL OR "demand_charge_clp_kw" >= 0)
);
CREATE INDEX "tariffs_distributor_valid_from_idx" ON "tariffs" ("distributor_id", "valid_from" DESC);

-- installations -----------------------------------------------------------------------
CREATE TABLE "installations" (
  "id"              uuid                PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid                NOT NULL,
  "name"            text                NOT NULL,
  "segment"         installation_segment NOT NULL,
  "address"         text,
  "timezone"        text                NOT NULL DEFAULT 'America/Santiago',
  "distributor_id"  uuid,
  "tariff_id"       uuid,
  "status"          installation_status NOT NULL DEFAULT 'active',
  "deleted_at"      timestamptz,
  "created_at"      timestamptz         NOT NULL DEFAULT now(),
  "updated_at"      timestamptz         NOT NULL DEFAULT now(),
  CONSTRAINT "installations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "installations_distributor_id_fkey"
    FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE RESTRICT,
  CONSTRAINT "installations_tariff_id_fkey"
    FOREIGN KEY ("tariff_id") REFERENCES "tariffs" ("id") ON DELETE RESTRICT
);
CREATE INDEX "installations_organization_id_idx"
  ON "installations" ("organization_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "installations_distributor_id_idx" ON "installations" ("distributor_id");
CREATE INDEX "installations_tariff_id_idx" ON "installations" ("tariff_id");

-- installation_profiles ---------------------------------------------------------------
CREATE TABLE "installation_profiles" (
  "id"                 uuid                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  "installation_id"    uuid                 NOT NULL,
  "segment"            installation_segment NOT NULL,
  "occupants"          integer,
  "heating_system"     text,
  "critical_equipment" jsonb,
  "declared_power_kw"  numeric(10,2),
  "operating_hours"    jsonb,
  "extra"              jsonb,
  "created_at"         timestamptz          NOT NULL DEFAULT now(),
  "updated_at"         timestamptz          NOT NULL DEFAULT now(),
  CONSTRAINT "installation_profiles_installation_id_key" UNIQUE ("installation_id"),
  CONSTRAINT "installation_profiles_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE CASCADE,
  CONSTRAINT "installation_profiles_occupants_chk"      CHECK ("occupants" IS NULL OR "occupants" >= 0),
  CONSTRAINT "installation_profiles_declared_power_chk" CHECK ("declared_power_kw" IS NULL OR "declared_power_kw" >= 0)
);

-- energy_kits -------------------------------------------------------------------------
CREATE TABLE "energy_kits" (
  "id"               uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  "installation_id"  uuid,
  "qr_code"          text              NOT NULL,
  "serial"           text              NOT NULL,
  "model"            text,
  "firmware_version" text,
  "status"           energy_kit_status NOT NULL DEFAULT 'unclaimed',
  "claimed_at"       timestamptz,
  "deleted_at"       timestamptz,
  "created_at"       timestamptz       NOT NULL DEFAULT now(),
  "updated_at"       timestamptz       NOT NULL DEFAULT now(),
  CONSTRAINT "energy_kits_qr_code_key" UNIQUE ("qr_code"),
  CONSTRAINT "energy_kits_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);
CREATE INDEX "energy_kits_installation_id_idx"
  ON "energy_kits" ("installation_id") WHERE "deleted_at" IS NULL;
-- UNIQUE parcial: a lo sumo un kit 'active' por serial (BR-011)
CREATE UNIQUE INDEX "energy_kits_active_serial_key"
  ON "energy_kits" ("serial") WHERE "status" = 'active';

-- device_categories -------------------------------------------------------------------
CREATE TABLE "device_categories" (
  "id"              uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  "key"             text          NOT NULL,
  "name"            text          NOT NULL,
  "icon"            text,
  "typical_power_w" numeric(12,2),
  CONSTRAINT "device_categories_key_key" UNIQUE ("key")
);

-- devices -----------------------------------------------------------------------------
CREATE TABLE "devices" (
  "id"              uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "kit_id"          uuid         NOT NULL,
  "installation_id" uuid         NOT NULL,
  "category_id"     uuid,
  "name"            text         NOT NULL,
  "external_ref"    text         NOT NULL,
  "capabilities"    jsonb        NOT NULL DEFAULT '{}',
  "state"           device_state NOT NULL DEFAULT 'unknown',
  "last_seen_at"    timestamptz,
  "deleted_at"      timestamptz,
  "created_at"      timestamptz  NOT NULL DEFAULT now(),
  "updated_at"      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "devices_kit_external_ref_key" UNIQUE ("kit_id", "external_ref"),
  CONSTRAINT "devices_kit_id_fkey"
    FOREIGN KEY ("kit_id") REFERENCES "energy_kits" ("id") ON DELETE CASCADE,
  CONSTRAINT "devices_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "devices_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "device_categories" ("id") ON DELETE RESTRICT
);
CREATE INDEX "devices_installation_id_idx"
  ON "devices" ("installation_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "devices_category_id_idx" ON "devices" ("category_id");

-- device_pairings ---------------------------------------------------------------------
CREATE TABLE "device_pairings" (
  "id"                  uuid           PRIMARY KEY DEFAULT uuid_generate_v4(),
  "kit_id"              uuid           NOT NULL,
  "device_external_ref" text           NOT NULL,
  "status"              pairing_status NOT NULL,
  "device_id"           uuid,
  "detail"              jsonb,
  "created_at"          timestamptz    NOT NULL DEFAULT now(),
  "updated_at"          timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT "device_pairings_kit_id_fkey"
    FOREIGN KEY ("kit_id") REFERENCES "energy_kits" ("id") ON DELETE CASCADE,
  CONSTRAINT "device_pairings_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT
);
CREATE INDEX "device_pairings_kit_id_idx" ON "device_pairings" ("kit_id");

-- telemetry_readings (hypertable) -----------------------------------------------------
-- PK lógica compuesta (device_id, source_timestamp, reading_id). Para que la hypertable
-- de Timescale incluya la columna de particionamiento (source_timestamp) en la PK, esta
-- ya forma parte de la PK compuesta. kit_id / installation_id denormalizados SIN FK dura.
CREATE TABLE "telemetry_readings" (
  "reading_id"         uuid            NOT NULL,
  "device_id"          uuid            NOT NULL,
  "kit_id"             uuid            NOT NULL,  -- denormalizado, sin FK (rendimiento)
  "installation_id"    uuid            NOT NULL,  -- denormalizado, sin FK (rendimiento)
  "source_timestamp"   timestamptz     NOT NULL,
  "received_timestamp" timestamptz     NOT NULL DEFAULT now(),
  "voltage_v"          numeric(8,2),
  "current_a"          numeric(10,3),
  "active_power_w"     numeric(12,2),
  "reactive_power_var" numeric(12,2),
  "apparent_power_va"  numeric(12,2),
  "power_factor"       numeric(4,3),
  "energy_wh_delta"    numeric(14,4),
  "frequency_hz"       numeric(6,3),
  "signal_quality"     integer,
  "firmware_version"   text,
  "ingestion_status"   ingestion_status NOT NULL DEFAULT 'accepted',
  "event_hash"         text            NOT NULL,
  "raw_payload"        jsonb,
  CONSTRAINT "telemetry_readings_pkey" PRIMARY KEY ("device_id", "source_timestamp", "reading_id"),
  CONSTRAINT "telemetry_readings_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT,
  CONSTRAINT "telemetry_readings_voltage_chk"        CHECK ("voltage_v" IS NULL OR "voltage_v" >= 0),
  CONSTRAINT "telemetry_readings_current_chk"        CHECK ("current_a" IS NULL OR "current_a" >= 0),
  CONSTRAINT "telemetry_readings_active_power_chk"   CHECK ("active_power_w" IS NULL OR "active_power_w" >= 0),
  CONSTRAINT "telemetry_readings_apparent_power_chk" CHECK ("apparent_power_va" IS NULL OR "apparent_power_va" >= 0),
  CONSTRAINT "telemetry_readings_power_factor_chk"   CHECK ("power_factor" IS NULL OR ("power_factor" BETWEEN -1 AND 1)),
  CONSTRAINT "telemetry_readings_energy_delta_chk"   CHECK ("energy_wh_delta" IS NULL OR "energy_wh_delta" >= 0)
);
-- UNIQUE de idempotencia. NOTA: en una hypertable Timescale, todo índice UNIQUE debe incluir
-- la columna de particionamiento. Por eso el unique de idempotencia es (event_hash, source_timestamp).
-- Como event_hash ya es globalmente único por diseño del bridge, esto preserva la idempotencia.
CREATE UNIQUE INDEX "telemetry_readings_event_hash_key"
  ON "telemetry_readings" ("event_hash", "source_timestamp");
CREATE INDEX "telemetry_readings_device_ts_idx"
  ON "telemetry_readings" ("device_id", "source_timestamp" DESC);
CREATE INDEX "telemetry_readings_installation_ts_idx"
  ON "telemetry_readings" ("installation_id", "source_timestamp" DESC);

-- Conversión a hypertable (opcional). Si TimescaleDB no está disponible, se omite con NOTICE.
DO $$
BEGIN
  PERFORM create_hypertable('telemetry_readings', 'source_timestamp', if_not_exists => TRUE, migrate_data => TRUE);
  RAISE NOTICE 'telemetry_readings convertida a hypertable Timescale.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo crear hypertable (%); telemetry_readings queda como tabla regular.', SQLERRM;
END$$;

-- energy_aggregates -------------------------------------------------------------------
CREATE TABLE "energy_aggregates" (
  "id"              uuid                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  "installation_id" uuid                  NOT NULL,
  "device_id"       uuid,
  "category_id"     uuid,
  "granularity"     aggregate_granularity NOT NULL,
  "bucket_start"    timestamptz           NOT NULL,
  "energy_kwh"      numeric(14,4)         NOT NULL DEFAULT 0,
  "cost_clp"        bigint,
  "peak_power_w"    numeric(12,2),
  "recomputed_at"   timestamptz           NOT NULL DEFAULT now(),
  CONSTRAINT "energy_aggregates_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "energy_aggregates_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT,
  CONSTRAINT "energy_aggregates_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "device_categories" ("id") ON DELETE RESTRICT,
  CONSTRAINT "energy_aggregates_energy_kwh_chk" CHECK ("energy_kwh" >= 0),
  CONSTRAINT "energy_aggregates_cost_clp_chk"   CHECK ("cost_clp" IS NULL OR "cost_clp" >= 0)
);
-- UNIQUE con NULLS NOT DISTINCT (PG15+): trata device_id/category_id NULL como valor único
-- (buckets a nivel instalación). Idempotencia del recálculo (BR-025).
CREATE UNIQUE INDEX "energy_aggregates_bucket_key"
  ON "energy_aggregates" ("installation_id", "device_id", "category_id", "granularity", "bucket_start")
  NULLS NOT DISTINCT;
CREATE INDEX "energy_aggregates_inst_gran_bucket_idx"
  ON "energy_aggregates" ("installation_id", "granularity", "bucket_start");
CREATE INDEX "energy_aggregates_inst_cat_gran_bucket_idx"
  ON "energy_aggregates" ("installation_id", "category_id", "granularity", "bucket_start")
  WHERE "category_id" IS NOT NULL;
CREATE INDEX "energy_aggregates_inst_dev_gran_bucket_idx"
  ON "energy_aggregates" ("installation_id", "device_id", "granularity", "bucket_start")
  WHERE "device_id" IS NOT NULL;

-- electricity_bills -------------------------------------------------------------------
CREATE TABLE "electricity_bills" (
  "id"                  uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  "installation_id"     uuid          NOT NULL,
  "distributor_id"      uuid,
  "tariff_id"           uuid,
  "client_number"       text,
  "period_start"        date          NOT NULL,
  "period_end"          date          NOT NULL,
  "consumption_kwh"     numeric(14,4) NOT NULL,
  "total_clp"           bigint        NOT NULL,
  "fixed_charge_clp"    bigint,
  "variable_charge_clp" bigint,
  "due_date"            date,
  "file_url"            text          NOT NULL,
  "status"              bill_status   NOT NULL DEFAULT 'uploaded',
  "raw_extraction"      jsonb,
  "created_at"          timestamptz   NOT NULL DEFAULT now(),
  "updated_at"          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT "electricity_bills_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "electricity_bills_distributor_id_fkey"
    FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE RESTRICT,
  CONSTRAINT "electricity_bills_tariff_id_fkey"
    FOREIGN KEY ("tariff_id") REFERENCES "tariffs" ("id") ON DELETE RESTRICT,
  CONSTRAINT "electricity_bills_period_chk"      CHECK ("period_end" >= "period_start"),
  CONSTRAINT "electricity_bills_consumption_chk" CHECK ("consumption_kwh" >= 0),
  CONSTRAINT "electricity_bills_total_chk"       CHECK ("total_clp" >= 0)
);
CREATE INDEX "electricity_bills_inst_period_idx"
  ON "electricity_bills" ("installation_id", "period_start" DESC);
CREATE INDEX "electricity_bills_inst_status_idx"
  ON "electricity_bills" ("installation_id", "status");

-- alerts ------------------------------------------------------------------------------
CREATE TABLE "alerts" (
  "id"                   uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  "installation_id"      uuid          NOT NULL,
  "device_id"            uuid,
  "type"                 alert_type    NOT NULL,
  "severity"             alert_severity NOT NULL,
  "status"               alert_status  NOT NULL DEFAULT 'open',
  "message"              text          NOT NULL,
  "context"              jsonb,
  "estimated_impact_clp" bigint,
  "reviewed_by"          uuid,
  "reviewed_at"          timestamptz,
  "created_at"           timestamptz   NOT NULL DEFAULT now(),
  "updated_at"           timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT "alerts_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "alerts_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT,
  CONSTRAINT "alerts_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id") ON DELETE RESTRICT
);
CREATE INDEX "alerts_inst_status_idx" ON "alerts" ("installation_id", "status");
CREATE INDEX "alerts_inst_open_idx"
  ON "alerts" ("installation_id", "created_at" DESC) WHERE "status" = 'open';
CREATE INDEX "alerts_device_id_idx" ON "alerts" ("device_id") WHERE "device_id" IS NOT NULL;

-- recommendations ---------------------------------------------------------------------
CREATE TABLE "recommendations" (
  "id"                   uuid                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  "installation_id"      uuid                  NOT NULL,
  "alert_id"             uuid,
  "source"               recommendation_source NOT NULL,
  "title"                text                  NOT NULL,
  "description"          text                  NOT NULL,
  "estimated_saving_clp" bigint,
  "priority"             integer               NOT NULL DEFAULT 0,
  "status"               recommendation_status NOT NULL DEFAULT 'new',
  "created_at"           timestamptz           NOT NULL DEFAULT now(),
  "updated_at"           timestamptz           NOT NULL DEFAULT now(),
  CONSTRAINT "recommendations_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "recommendations_alert_id_fkey"
    FOREIGN KEY ("alert_id") REFERENCES "alerts" ("id") ON DELETE RESTRICT
);
CREATE INDEX "recommendations_inst_status_priority_idx"
  ON "recommendations" ("installation_id", "status", "priority" DESC);
CREATE INDEX "recommendations_alert_id_idx"
  ON "recommendations" ("alert_id") WHERE "alert_id" IS NOT NULL;

-- control_actions ---------------------------------------------------------------------
CREATE TABLE "control_actions" (
  "id"           uuid                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  "device_id"    uuid                  NOT NULL,
  "user_id"      uuid                  NOT NULL,
  "type"         control_action_type   NOT NULL,
  "status"       control_action_status NOT NULL DEFAULT 'pending',
  "payload"      jsonb,
  "result"       jsonb,
  "requested_at" timestamptz           NOT NULL DEFAULT now(),
  "resolved_at"  timestamptz,
  CONSTRAINT "control_actions_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE RESTRICT,
  CONSTRAINT "control_actions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
CREATE INDEX "control_actions_device_requested_idx"
  ON "control_actions" ("device_id", "requested_at" DESC);
CREATE INDEX "control_actions_device_pending_idx"
  ON "control_actions" ("device_id") WHERE "status" = 'pending';

-- control_schedules -------------------------------------------------------------------
CREATE TABLE "control_schedules" (
  "id"         uuid                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  "device_id"  uuid                    NOT NULL,
  "action"     control_schedule_action NOT NULL,
  "rule"       jsonb                   NOT NULL,
  "enabled"    boolean                 NOT NULL DEFAULT true,
  "created_by" uuid                    NOT NULL,
  "created_at" timestamptz             NOT NULL DEFAULT now(),
  "updated_at" timestamptz             NOT NULL DEFAULT now(),
  CONSTRAINT "control_schedules_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE,
  CONSTRAINT "control_schedules_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT
);
CREATE INDEX "control_schedules_device_enabled_idx"
  ON "control_schedules" ("device_id") WHERE "enabled";

-- consumption_limits ------------------------------------------------------------------
CREATE TABLE "consumption_limits" (
  "id"               uuid                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  "device_id"        uuid                   NOT NULL,
  "limit_kwh"        numeric(14,4),
  "limit_power_w"    numeric(12,2),
  "window"           limit_window           NOT NULL,
  "pre_alert_pct"    integer,
  "action_on_exceed" limit_action_on_exceed NOT NULL DEFAULT 'alert',
  "enabled"          boolean                NOT NULL DEFAULT true,
  "created_at"       timestamptz            NOT NULL DEFAULT now(),
  "updated_at"       timestamptz            NOT NULL DEFAULT now(),
  CONSTRAINT "consumption_limits_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE,
  CONSTRAINT "consumption_limits_limit_kwh_chk"   CHECK ("limit_kwh" IS NULL OR "limit_kwh" > 0),
  CONSTRAINT "consumption_limits_limit_power_chk" CHECK ("limit_power_w" IS NULL OR "limit_power_w" > 0),
  CONSTRAINT "consumption_limits_pre_alert_chk"   CHECK ("pre_alert_pct" IS NULL OR ("pre_alert_pct" BETWEEN 1 AND 100)),
  -- BR-054: al menos uno de limit_kwh / limit_power_w definido.
  CONSTRAINT "consumption_limits_at_least_one_chk" CHECK ("limit_kwh" IS NOT NULL OR "limit_power_w" IS NOT NULL)
);
CREATE INDEX "consumption_limits_device_enabled_idx"
  ON "consumption_limits" ("device_id") WHERE "enabled";

-- notifications -----------------------------------------------------------------------
CREATE TABLE "notifications" (
  "id"              uuid                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid                 NOT NULL,
  "installation_id" uuid,
  "user_id"         uuid,
  "channel"         notification_channel NOT NULL,
  "title"           text                 NOT NULL,
  "body"            text                 NOT NULL,
  "read_at"         timestamptz,
  "related_type"    text,
  "related_id"      uuid,
  "created_at"      timestamptz          NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "notifications_installation_id_fkey"
    FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
CREATE INDEX "notifications_user_read_idx" ON "notifications" ("user_id", "read_at");
CREATE INDEX "notifications_user_unread_idx"
  ON "notifications" ("user_id", "created_at" DESC) WHERE "read_at" IS NULL;
CREATE INDEX "notifications_organization_id_idx" ON "notifications" ("organization_id");

-- audit_logs (append-only) ------------------------------------------------------------
CREATE TABLE "audit_logs" (
  "id"              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid        NOT NULL,
  "user_id"         uuid,
  "action"          text        NOT NULL,
  "entity_type"     text        NOT NULL,
  "entity_id"       uuid,
  "before"          jsonb,
  "after"           jsonb,
  "ip"              inet,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "audit_logs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE RESTRICT,
  CONSTRAINT "audit_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" ("organization_id", "created_at" DESC);
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id");

-- -------------------------------------------------------------------------------------
-- 3. Trigger genérico updated_at
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tablas con columna updated_at (audit_logs y notifications NO la tienen; telemetry_readings tampoco).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users','organizations','memberships','installations','installation_profiles',
    'energy_kits','devices','device_pairings','energy_aggregates','tariffs',
    'electricity_bills','alerts','recommendations','control_schedules','consumption_limits'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      'trg_set_updated_at_' || t, t
    );
  END LOOP;
END$$;

-- -------------------------------------------------------------------------------------
-- 4. Trigger append-only en audit_logs (BR-061)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es append-only: % no permitido', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

-- =====================================================================================
-- Fin de la migración 0001_init
-- =====================================================================================
