# Fase 1.2 — Verificación con PostgreSQL externa

> Guía para cerrar los gates de runtime de Fase 1 (`GATE-DB-001..004`, ver `specs/08-quality/runtime-gates.md`) usando una **PostgreSQL externa de desarrollo** cuando no hay Docker local operativo.
> Fuente de verdad del soporte: `packages/db/tests/setup.ts` (modo dual `docker`/`external`, guard anti-producción, `maskDbUrl`). Comando único agregador: `pnpm verify:phase1:external`.

---

## 1. Propósito

Permitir que `db:migrate:deploy` + `db:seed` + `test:db` corran contra una Postgres **real** sin depender de Docker en la máquina local, manteniendo los mismos criterios PASS/FAIL/BLOCKED del flujo SDD.

## 2. Por qué existe este fallback

Fase 1.1 quedó **BLOCKED**: Docker Desktop falla con HTTP 500 persistente (backend WSL2 sin el distro `docker-desktop`), `docker run hello-world` falla y no hay PostgreSQL nativo instalado (la política prohíbe instalar software). El código y el modelo de datos están correctos y commiteados, pero nunca se verificaron contra datos reales. Este fallback permite la verificación apuntando a una Postgres externa de desarrollo (cloud efímera o VPS), sin tocar Docker. Bloqueo formal: `docs/audit/phase-1-runtime-blocker.md`.

## 3. Cuándo usarlo

- Docker local no inicializa y necesitas cerrar los gates de DB.
- CI/entorno que ya provee una Postgres de desarrollo accesible por `DATABASE_URL`.
- **No** lo uses si tienes Docker operativo → prefiere `pnpm test:db:docker` (Testcontainers efímero, sin dependencias externas).

## 4. Requisitos

- Node ≥ 20, pnpm ≥ 8; `pnpm install` ejecutado.
- Una PostgreSQL 16 accesible (TimescaleDB **recomendado** pero no obligatorio: la migración tolera su ausencia vía `DO/EXCEPTION` y `telemetry_readings` queda como tabla normal — ver `phase-1-db-setup.md §7`).
- Una base de datos **dedicada y desechable** llamada idealmente `smartsense_dev`.
- Conectividad de red saliente al host de la DB.

## 5. ADVERTENCIA — NO usar producción

El guard en `packages/db/tests/setup.ts` (`assertSafeExternalUrl`) **aborta** si la `DATABASE_URL` parece de producción.

- **Tokens RECHAZADOS** (si aparecen en la URL → abort): `prod`, `production`, `live`, `primary`, `master`, `main`.
- **Señales EXIGIDAS** (al menos una): `dev`, `test`, `staging`, `sandbox`, `smartsense_dev`.
- Si la URL no contiene ninguna señal dev/test, el guard también aborta (a menos que exportes `SMARTSENSE_DB_ALLOW_UNSAFE=1`, solo bajo confirmación manual explícita).
- Reglas operativas: la DB debe ser **dev/test desechable**; **NUNCA** apuntes a datos reales; **NUNCA** commitees la `DATABASE_URL` (debe quedar solo en variables de entorno de la sesión o en `packages/db/.env`, que está gitignored).

`db:seed` y `test:db` **escriben** en la base. Usar producción causaría modificación de datos reales. El guard es la última línea de defensa, no un sustituto del criterio.

## 6. Crear una DB externa temporal (alto nivel)

Cualquier proveedor que entregue una `DATABASE_URL` Postgres 16 sirve. Nombra la base `smartsense_dev` para satisfacer el guard.

- **Neon** (serverless, recomendado para efímero): crear proyecto → DB `smartsense_dev` → copiar la connection string (incluye `?sslmode=require`). Tiene branching; ideal para borrar luego.
- **Supabase:** New project → Settings → Database → Connection string (usar la del pooler o la directa). Renombrar/crear schema/DB `smartsense_dev` si aplica.
- **Railway:** New → Database → PostgreSQL → copiar `DATABASE_URL` del servicio. Crear DB `smartsense_dev` (`CREATE DATABASE smartsense_dev;`).
- **Render:** New → PostgreSQL → copiar "External Database URL". La base por defecto suele no llamarse dev → crear `smartsense_dev` o usar `SMARTSENSE_DB_ALLOW_UNSAFE=1` con criterio.
- **VPS / Docker en otra máquina:** `timescale/timescaledb:latest-pg16` con `POSTGRES_DB=smartsense_dev`, puerto expuesto y firewall restringido a tu IP.

En todos los casos, asegúrate de poder **borrar** la base al terminar (§9).

## 7. Configurar y ejecutar (comandos exactos)

Define `DATABASE_URL` (DB de desarrollo) y `SMARTSENSE_DB_TEST_MODE=external`, luego corre el verificador.

### PowerShell

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/smartsense_dev?schema=public"
$env:SMARTSENSE_DB_TEST_MODE="external"
pnpm verify:phase1:external
```

### Bash

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/smartsense_dev?schema=public"
export SMARTSENSE_DB_TEST_MODE="external"
pnpm verify:phase1:external
```

`pnpm verify:phase1:external` encadena: `db:generate` → `db:migrate:deploy` → `db:seed` → `test:db:external` → `typecheck` → `lint` → `build:web` → `build:api`. Cada paso debe terminar en exit 0; el primero que falle detiene la cadena.

> La `DATABASE_URL` debe ser **dev/test** — el guard rechaza producción (§5). **No** la commitees: úsala solo como variable de entorno de la sesión (o en `packages/db/.env`, gitignored). En logs se enmascara (`postgresql://***@host/db`) vía `maskDbUrl`.

## 8. Verificación de seeds (consultas)

Tras `db:seed`, conéctate a la DB y confirma los conteos del escenario demo (catálogo global + datos bajo `organizations.is_demo=true`):

```sql
SELECT 'device_categories' AS t, count(*) FROM device_categories
UNION ALL SELECT 'distributors', count(*) FROM distributors
UNION ALL SELECT 'tariffs', count(*) FROM tariffs
UNION ALL SELECT 'organizations_demo', count(*) FROM organizations WHERE is_demo = true
UNION ALL SELECT 'installations_demo', count(*) FROM installations
UNION ALL SELECT 'energy_kits_demo', count(*) FROM energy_kits
UNION ALL SELECT 'devices_demo', count(*) FROM devices
UNION ALL SELECT 'alerts_demo', count(*) FROM alerts
UNION ALL SELECT 'recommendations_demo', count(*) FROM recommendations;
```

**Criterio de seeds (todos deben cumplirse):**

- `device_categories` > 0
- `distributors` > 0
- `tariffs` > 0
- `organizations` con `is_demo = true` ≥ 1
- `installations` + `energy_kits` + `devices` demo presentes (> 0)
- `alerts` y `recommendations` demo presentes (> 0)

Idempotencia: reejecutar `pnpm db:seed` **no** debe aumentar los conteos (upserts deterministas).

## 9. Limpieza posterior

La base es desechable — elimínala al terminar para no dejar datos ni credenciales activas:

- **Cloud (Neon/Supabase/Railway/Render):** borrar el proyecto/servicio/base desde el panel del proveedor.
- **Postgres propio (VPS/Docker remoto):** `DROP DATABASE smartsense_dev;` (o `docker rm -f <contenedor>` + `docker volume rm` si fue un contenedor dedicado).
- **Local:** limpiar las variables de entorno de la sesión:
  - PowerShell: `Remove-Item Env:DATABASE_URL; Remove-Item Env:SMARTSENSE_DB_TEST_MODE`
  - Bash: `unset DATABASE_URL SMARTSENSE_DB_TEST_MODE`
- Verificar que la `DATABASE_URL` **no** quedó commiteada: `git ls-files | grep -i '\.env'` debe mostrar solo `.env.example`.

## 10. Criterios PASS / BLOCKED / FAIL

- **PASS:** `pnpm verify:phase1:external` termina en exit 0; migración aplicada (21 tablas + 24 enums), seeds con los conteos de §8, `test:db:external` verde (sin skips), typecheck/lint/builds en verde. → Fase 1 pasa de READY-BLOCKED a **PASS**; se actualizan matrices y se desbloquea Fase 2 (GATE-SDD-001).
- **BLOCKED:** no hay Postgres accesible o `DATABASE_URL` no definida → `setup.ts` emite `BLOCKED_MESSAGE`; los gates de DB quedan BLOCKED (estado actual de la subfase). No es FAIL.
- **FAIL:** la DB está accesible pero un paso falla con datos reales (migración rechazada, violación de constraint inesperada, seed no idempotente, test rojo). → registrar el error real y corregir antes de declarar cierre.

Registro de resultados: `docs/audit/phase-1-runtime-verification.md` (migración/tests/builds) y `docs/audit/phase-1-seed-verification.md` (seeds).
