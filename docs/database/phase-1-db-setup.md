# Guía operativa de base de datos — SmartSense Fase 1

> Cómo levantar PostgreSQL 16 + TimescaleDB, configurar variables de entorno y ejecutar migración, seed y tests de integridad del paquete `@smartsense/db`.
> Fuente de verdad: `packages/db/prisma/schema.prisma` (21 modelos + enums nativos), `packages/db/prisma/migrations/0001_init/migration.sql` (592 líneas), `packages/db/prisma/seed.ts` (idempotente).
> Estado: **estructura implementada**; la ejecución de migración/seed/tests está **pendiente de un entorno con Docker/Postgres** (ver `09-implementation-plan/roadmap.md` §FASE 1).

---

## 1. Requisitos

- Node.js ≥ 20, pnpm ≥ 8 (ver `package.json` raíz, `engines`).
- Docker (para Postgres + TimescaleDB y para los tests con Testcontainers).
- Dependencias instaladas: `pnpm install` en la raíz del monorepo.

> Sin Docker: la suite `db` (Vitest + Testcontainers) **se salta** (guard de Docker), y `db:migrate`/`db:seed` no pueden ejecutarse. La estructura (schema, migración SQL, seed) ya está versionada y queda lista para correr cuando haya un Postgres disponible.

---

## 2. Levantar PostgreSQL + TimescaleDB

### Opción A — `docker run` (rápida)

```bash
docker run -d \
  --name smartsense-db \
  -e POSTGRES_USER=smartsense \
  -e POSTGRES_PASSWORD=smartsense \
  -e POSTGRES_DB=smartsense \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg16
```

La imagen `timescale/timescaledb:latest-pg16` ya trae PostgreSQL 16 + la extensión TimescaleDB precargada (no requiere instalación adicional). La migración habilita las extensiones por sí misma (ver §4).

Detener / reiniciar / eliminar:

```bash
docker stop smartsense-db
docker start smartsense-db
docker rm -f smartsense-db
```

### Opción B — Docker Compose (recomendada para desarrollo)

Crear `docker-compose.yml` en la raíz del monorepo:

```yaml
services:
  db:
    image: timescale/timescaledb:latest-pg16
    container_name: smartsense-db
    environment:
      POSTGRES_USER: smartsense
      POSTGRES_PASSWORD: smartsense
      POSTGRES_DB: smartsense
    ports:
      - "5432:5432"
    volumes:
      - smartsense-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smartsense -d smartsense"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  smartsense-db-data:
```

Levantar / bajar:

```bash
docker compose up -d db
docker compose down            # conserva el volumen
docker compose down -v         # elimina también los datos
```

---

## 3. Variables de entorno

La conexión se resuelve por la variable `DATABASE_URL` (ver `packages/db/prisma/schema.prisma`, `datasource db { url = env("DATABASE_URL") }`).

Crear `packages/db/.env` (no versionar) con:

```dotenv
# packages/db/.env.example  →  copiar a packages/db/.env
DATABASE_URL="postgresql://smartsense:smartsense@localhost:5432/smartsense?schema=public"
```

Si las credenciales/puertos del contenedor difieren, ajustar usuario, contraseña, host, puerto y base en la URL.

---

## 4. Habilitar TimescaleDB

No requiere paso manual: la migración inicial (`0001_init/migration.sql`) habilita las extensiones al inicio:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  -- TimescaleDB no disponible: se continúa sin hypertable (fallback, ver §7).
  RAISE NOTICE 'timescaledb no disponible; telemetry_readings será tabla normal';
END $$;
```

Con la imagen `timescale/timescaledb:latest-pg16` la extensión está disponible y se crea sin problema. La conversión de `telemetry_readings` a hypertable se hace más adelante en la misma migración mediante `create_hypertable(...)` envuelto en `DO/EXCEPTION` (tolerante a ausencia de Timescale).

---

## 5. Flujo reproducible

Desde la **raíz del monorepo** (scripts definidos en `package.json` raíz, delegan a `@smartsense/db`):

```bash
# 1) Generar el cliente Prisma a partir del schema
pnpm db:generate

# 2) Aplicar la migración inicial (crea las 21 tablas, enums, constraints,
#    triggers, índices, hypertable + extensiones)
pnpm db:migrate

# 3) Poblar catálogo global + datos demo idempotentes
pnpm db:seed

# 4) Correr la suite de integridad/constraints (Vitest + Testcontainers)
pnpm test:db

# 5) (opcional) Inspeccionar la base con Prisma Studio
pnpm db:studio
```

Notas:
- `pnpm db:migrate` usa `prisma migrate dev` (entorno de desarrollo). Para aplicar migraciones en un entorno limpio/CI sin generar nuevas, usar `prisma migrate deploy` desde `packages/db` (`pnpm --filter @smartsense/db migrate:deploy`).
- `pnpm db:seed` es **idempotente** (upserts con UUIDs deterministas + claves naturales): reejecutable sin duplicar.
- `pnpm test:db` levanta un Postgres efímero con Testcontainers. **Requiere Docker corriendo**; si no lo detecta, la suite se salta (guard).

---

## 6. Qué crea la migración / seed

- **Migración `0001_init`** (`packages/db/prisma/migrations/0001_init/migration.sql`):
  - Extensiones `uuid-ossp`, `citext`, `timescaledb` (esta última tolerante a ausencia).
  - Las 21 tablas del modelo relacional + 24 enums nativos Postgres.
  - CHECK de dominio (no-negatividad, `power_factor ∈ [-1,1]`, `pre_alert_pct ∈ [1,100]`, `period_end ≥ period_start`, etc.).
  - `create_hypertable('telemetry_readings','source_timestamp')` en bloque `DO/EXCEPTION`.
  - Índices (tenant/serie), trigger `set_updated_at`, trigger append-only en `audit_logs`.
  - UNIQUE de idempotencia de telemetría físicamente `(event_hash, source_timestamp)` (la columna de particionamiento debe formar parte del índice único de la hypertable).
- **Seed** (`packages/db/prisma/seed.ts`):
  - **Catálogo global** (sin tenant): `device_categories`, `distributors` (CGE, Enel), `tariffs` (BT-1 CGE, BT-1A Enel).
  - **Datos demo** (bajo `organizations.is_demo = true`): organización, usuario, membership, instalación + perfil, kit, devices, pairings, boleta y alertas.

---

## 7. Si TimescaleDB no está disponible (fallback)

La migración **tolera la ausencia** de la extensión TimescaleDB:

1. La creación de la extensión está envuelta en `DO ... EXCEPTION WHEN OTHERS` → si falla, emite un `NOTICE` y continúa.
2. La llamada a `create_hypertable('telemetry_readings','source_timestamp', ...)` también está envuelta en `DO ... EXCEPTION` → si Timescale no está presente, se omite sin abortar la migración.

Consecuencia del fallback: `telemetry_readings` queda como una **tabla PostgreSQL normal** (no hypertable). Funciona para correctitud (inserts, FKs, CHECKs, UNIQUE de idempotencia), pero **sin** particionamiento por tiempo ni políticas de compresión/retención de Timescale. Para producción se exige el motor con TimescaleDB; el fallback es solo para entornos de desarrollo/CI sin la extensión.

Para verificar si la tabla quedó como hypertable:

```sql
SELECT hypertable_name FROM timescaledb_information.hypertables;
-- vacío → quedó como tabla normal (fallback activo)
```

---

## 8. Resolución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `P1001: Can't reach database server` | Contenedor no levantado o puerto distinto | `docker ps`; verificar `DATABASE_URL` |
| `password authentication failed` | Credenciales no coinciden con el contenedor | Alinear usuario/clave de `DATABASE_URL` con las env del contenedor |
| Tests `db` no corren | Docker no disponible (guard) | Iniciar Docker; reintentar `pnpm test:db` |
| `telemetry_readings` no es hypertable | Imagen sin TimescaleDB | Usar `timescale/timescaledb:latest-pg16`; ver §7 |
| Migración pide reset | Drift respecto a `migration_lock` | En dev: `prisma migrate reset` (destructivo, solo desarrollo) |
