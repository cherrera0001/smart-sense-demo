# Fase 8.5 — Auditoría Modelo de Datos vs Prisma

Specs `03-data-model/relational-model.md` + `constraints.md` vs `packages/db/prisma/schema.prisma` + 4 migraciones SQL.

## Tablas: 21/21 del spec presentes + 1 extra (refresh_tokens)

| Tabla (spec) | Modelo Prisma | Migración | Estado |
|---|---|---|---|
| users, memberships, installations, installation_profiles, energy_kits, device_categories, devices, device_pairings, energy_aggregates, distributors, tariffs, electricity_bills, alerts, control_schedules, consumption_limits, notifications, audit_logs | (todos) | 0001 | PASS |
| organizations | Organization | 0001 | DEVIATION (col `is_demo` extra, documentada) |
| telemetry_readings | TelemetryReading | 0001 | DEVIATION (tabla normal en Neon, no hypertable — ver abajo) |
| recommendations | Recommendation | 0001 + **0002** (`type`, `estimated_saving_kwh`) | DEVIATION aditiva documentada (notas F5) |
| control_actions | ControlAction | 0001 + **0003** (`idempotency_key`, `dry_run`) | DEVIATION aditiva documentada (notas F6) |
| **refresh_tokens** | RefreshToken | **0004** | DEVIATION (tabla NO listada en spec → documentar) |

Conteo: 22 modelos Prisma (21 + RefreshToken); 24 enums nativos (migration 0001:32-56). 

## Desviaciones conocidas — confirmadas con evidencia

| Punto | Confirmación | Evidencia |
|---|---|---|
| Neon SIN TimescaleDB — fallback create_hypertable vía DO/EXCEPTION | CONFIRMADO (doble fallback: extensión + create_hypertable envueltos en DO $$…EXCEPTION) | 0001 migration.sql:22-27 y :316-322 |
| telemetry_readings como tabla normal | CONFIRMADO; PK compuesta + UNIQUE(event_hash,source_timestamp) funcionan igual sin hypertable; idempotencia preservada | 0001:275-313; relational-model nota (b) |
| recommendations.type / estimated_saving_kwh (0002) | CONFIRMADO (`ADD COLUMN IF NOT EXISTS`; type text NULL; numeric(14,4) + CHECK ≥0) | 0002/migration.sql:5-19 |
| control_actions.idempotency_key / dry_run (0003) | CONFIRMADO (dry_run NOT NULL DEFAULT true; índice único parcial dev+idempotency_key) | 0003/migration.sql:5-12 |
| refresh_tokens (0004) | CONFIRMADO (token_hash, jti UNIQUE, expires_at, revoked_at, replaced_by_jti, FK CASCADE) | 0004/migration.sql:5-20 |
| audit_logs append-only | CONFIRMADO con **TRIGGER real** `trg_audit_logs_append_only BEFORE UPDATE/DELETE` (RAISE EXCEPTION) | 0001:581-590 |

## Constraints/FK/índices críticos: PASS
citext+UNIQUE email; legal_id UNIQUE parcial; memberships UNIQUE+CASCADE/RESTRICT; energy_kits UNIQUE serial parcial WHERE active (BR-011); devices UNIQUE(kit_id,external_ref); telemetry 6 CHECK + PK compuesta; energy_aggregates UNIQUE 5-col NULLS NOT DISTINCT; consumption_limits CHECK at-least-one (BR-054, refuerzo BD); trigger set_updated_at en 15 tablas. Todo verificado con file:line en schema/SQL.

## Gaps/desfases
1. **refresh_tokens no documentada en spec** (tabla productiva F7) → agregar a relational-model. (LOW)
2. **Cuerpo de constraints.md/relational-model.md dice "enums text+CHECK"** pero impl usa enums nativos (reconciliado en nota c, cuerpo no actualizado). (LOW)
3. **audit_logs**: trigger existe (cumple BR-061/TC-004); la 2ª mitad del spec (revocar GRANT UPDATE/DELETE al rol de app, constraints.md:177) NO está en migraciones — endurecimiento defensa-en-profundidad opcional (el trigger ya bloquea). (LOW)

Sin GAPs reales de tablas ni de constraints de integridad. Desviaciones todas aditivas y documentadas (salvo refresh_tokens, a documentar).
