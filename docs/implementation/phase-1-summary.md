# Fase 1 — Resumen de Implementación (Base de datos y dominio)

> Fecha: 2026-06-02 · Rama: `feat/phase-1-db-domain` · Monorepo `smartsense`. Estrategia A (Preserve UI, add backend gradually) + B-lite.

## Qué se implementó

### Monorepo pnpm (sobre el repo git existente, historial preservado)
```
apps/
  web/         # Next.js 15 demo MIGRADA (build verde, 12 rutas) — @smartsense/web
  api/         # Fastify esqueleto: solo GET /health — @smartsense/api
  iot-bridge/  # scaffold sin MQTT — @smartsense/iot-bridge
packages/
  shared/      # enums/ids/DTOs/schemas Zod/formatters — @smartsense/shared
  db/          # Prisma + migración + seeds + tests — @smartsense/db
docs/  specs/  archive/
```
Raíz: `pnpm-workspace.yaml`, `package.json` (scripts dev/build/lint/typecheck/test/db:*), `tsconfig.base.json`.

### `packages/shared`
14 enums canónicos (`as const` + union), 21 branded IDs, DTOs en inglés alineados al domain-model, schemas Zod por dominio (telemetry/billing/control/alerts/installation/device/common), y `formatCLP`/`formatKwh`/`formatDelta`/`formatHora` migrados desde la demo como formatter canónico compartido.

### `packages/db` (núcleo de la fase)
- **`schema.prisma`: 21 modelos** (las 21 tablas del canon) + **24 enums** nativos, `@@map`/`@map` snake_case, PK `uuid`, timestamps `timestamptz`, soft-delete en organizations/installations/energy_kits/devices, FKs con `onDelete` Cascade/Restrict según relational-model, todos los UNIQUE, `telemetry_readings` con PK lógica compuesta `(device_id, source_timestamp, reading_id)`.
- **Migración inicial** `prisma/migrations/0001_init/migration.sql` (592 líneas): extensiones (`uuid-ossp`, `citext`, `timescaledb` opcional), `CREATE TYPE` de enums, 21 `CREATE TABLE` con **todos los CHECK** de `constraints.md` (no-negatividad, `power_factor ∈ [-1,1]`, `pre_alert_pct 1..100`, `period_end ≥ period_start`, etc.), `create_hypertable` envuelto en `DO/EXCEPTION` (fallback si no hay Timescale), índices de `indexes.md`, trigger genérico `set_updated_at` y **trigger append-only** en `audit_logs`.
- **Seeds** (`seed.ts`, idempotentes): catálogo **global** (device_categories, distributors CGE/Enel, tariffs BT-1/BT-1A) + escenario **demo** bajo `organizations.is_demo=true` (org/user/membership/installation/profile/kit/4 devices/boleta/alertas/recomendaciones), derivados del mock del deck.
- **Tests** (Vitest + Testcontainers): 18 tests de integridad/constraints/idempotencia con guard de Docker (compilan y skippean sin Docker).

### `apps/web` — demo preservada bajo DEMO_MODE
- Migrada íntegra a `apps/web` con `git mv` (historial conservado), build verde sin cambios visuales.
- `apps/web/lib/config/demo-mode.ts` (`isDemoMode`, default seguro `true`).
- `lib/mock-data.ts` → `lib/fixtures/mock-data.ts` (marcado DEMO-ONLY); 7 imports actualizados.

### `apps/api` / `apps/iot-bridge`
Esqueletos mínimos. API: `GET /health → {status:"ok",service:"smartsense-api",phase:"1"}` + graceful shutdown. iot-bridge: imprime `iot-bridge scaffold ready — no MQTT connection in Phase 1`. Sin lógica de negocio.

## Qué NO se implementó (pertenece a Fase 2/3, fuera de alcance)
- Endpoints de negocio (Auth, Dashboard, Reports, Telemetry, Control, Alerts, Recommendations) — **Fase 2**.
- Conexión frontend↔API real / reemplazo de mocks por API — **Fase 2** (por módulo, vía DEMO_MODE).
- Autenticación real, RBAC en runtime, control remoto real — **Fase 2/6**.
- Ingestión MQTT real, workers de agregación, continuous aggregates — **Fase 3**.
- Cálculo tarifario chileno completo — **Fase 5**.

## Decisiones técnicas
1. Monorepo sobre el repo git existente (preserva historial + linealidad de la demo desplegada).
2. `@smartsense/shared` consumido como **source** (sin build previo) → contrato único de tipos/enums.
3. Enums como **enums nativos Postgres/Prisma** (no text+CHECK), por limpieza con Prisma.
4. CHECK, citext, hypertable y triggers → **migración SQL manual** (Prisma no los expresa).
5. DEMO_MODE con default `true` → la demo nunca depende del backend.

## Desviaciones frente a specs (documentadas)
- **`organizations.is_demo`** añadido (no estaba en relational-model) como marca de datos demo (Paso 8). Todos los datos demo cuelgan de la org `is_demo=true`. Registrado en `relational-model.md §Notas de implementación Fase 1`.
- **Idempotencia de telemetría**: el índice UNIQUE físico es `(event_hash, source_timestamp)` (la hypertable exige incluir la columna de particionamiento). Prisma declara `@unique` simple como intención lógica. `event_hash` sigue siendo único por diseño del bridge.

## Migraciones / Seeds / Tests creados
- Migración: `packages/db/prisma/migrations/0001_init/migration.sql`.
- Seeds: `packages/db/prisma/seed.ts`.
- Tests: `packages/db/tests/{setup,integrity,constraints}.test.ts`.

## Riesgos abiertos
1. **Migración SQL no ejecutada contra Postgres real** (entorno sin Docker) — verificar `db:migrate` + `db:seed` + `test:db` con Docker antes de Fase 2. **Gate de cierre real.**
2. La idempotencia compuesta de telemetría asume `event_hash` globalmente único; validar en pruebas con Docker.
3. Warning `react-hooks/exhaustive-deps` preexistente en la demo (deuda, no bloqueante).
4. `next lint` deprecado en Next 16 (migrar a ESLint CLI).

## Comandos para reproducir
```bash
pnpm install
pnpm db:generate          # valida schema + genera client
pnpm -r typecheck
pnpm -r lint
pnpm build:web            # demo (12 rutas)
pnpm build:api
# Requieren Docker/Postgres (ver docs/database/phase-1-db-setup.md):
pnpm db:migrate
pnpm db:seed
pnpm test:db
```

## Actualización Fase 1.1 (2026-06-02) — Runtime verification
Se intentó cerrar el gate de runtime (migración/seed/tests contra Postgres+TimescaleDB real). Se añadió `docker-compose.yml` + `.env.example`, se revisó el drift schema↔migración (sin drift), pero **el engine de Docker Desktop no inicializó** (backend WSL2 sin el distro `docker-desktop`; HTTP 500 persistente ~8 min). `db:migrate`/`db:seed`/`test:db` **no se ejecutaron contra DB real**. Detalle y remediación en `docs/audit/phase-1-runtime-verification.md`. **Estado sigue PARTIAL.** El trabajo estructural quedó commiteado.

## Siguiente fase recomendada
**Fase 2 — API base** (Auth, Organizations, Installations, Devices, Onboarding) sobre Fastify, **solo tras** verificar migración/seed/tests con Docker (Fase 1.1 cerrada en PASS).
