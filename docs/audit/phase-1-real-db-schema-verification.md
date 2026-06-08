# Fase 1.4 — Verificación del esquema contra DB real (Neon)

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Verificación de que las **21 tablas del MER** existen en la PostgreSQL real (Neon vía Vercel, proyecto `cherrera0001s-projects/smart-sense-demo`, entorno Development, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`) tras `pnpm db:migrate:deploy` y `pnpm db:seed`.
> Motor: **Neon Postgres sin TimescaleDB** → `create_hypertable` cayó al fallback `DO/EXCEPTION`; `telemetry_readings` funciona como tabla normal. `prisma migrate status`: "Database schema is up to date!".

---

## Resultado global

- **21/21 tablas de dominio existen** en la DB real. Sin tablas faltantes ni extra inesperadas.
- Tabla adicional `_prisma_migrations`: presente, es el **tracking interno de Prisma** (no es del dominio; esperada).
- Las columnas "Filas seed" indican: **(catálogo)** = dato global; **(demo)** = bajo `organizations.is_demo=true`; **(estructura)** = tabla creada y verificada, sin filas sembradas en Fase 1 (se poblará en fases de runtime/ingesta).

## Tabla de verificación

| Tabla | Existe en DB real | Filas seed (catálogo/demo) | Observación |
|---|---|---|---|
| `users` | ✅ | 1 (demo) | usuario owner del escenario demo |
| `organizations` | ✅ | 1 (demo, `is_demo=true`) | raíz de todos los datos demo |
| `memberships` | ✅ | 1 (demo) | owner del usuario en la org demo |
| `installations` | ✅ | 1 (demo) | instalación demo |
| `installation_profiles` | ✅ | 1 (demo) | perfil 1↔1 de la instalación demo |
| `energy_kits` | ✅ | 1 (demo) | kit demo |
| `device_categories` | ✅ | 5 (catálogo) | catálogo global de categorías |
| `devices` | ✅ | 4 (demo) | 4 dispositivos demo |
| `device_pairings` | ✅ | 4 (demo) | 4 emparejamientos demo |
| `telemetry_readings` | ✅ | 0 (estructura) | **sin Timescale → tabla normal** (fallback `DO/EXCEPTION`); se puebla en Fase 3 |
| `energy_aggregates` | ✅ | 0 (estructura) | UNIQUE idempotente `NULLS NOT DISTINCT` verificado por tests |
| `distributors` | ✅ | 2 (catálogo) | CGE, Enel |
| `tariffs` | ✅ | 2 (catálogo) | BT-1 / BT-1A |
| `electricity_bills` | ✅ | 1 (demo) | boleta demo |
| `alerts` | ✅ | 2 (demo) | alertas demo |
| `recommendations` | ✅ | 2 (demo) | recomendaciones demo (ligadas a alertas) |
| `control_actions` | ✅ | 0 (estructura) | tabla creada; control real es Fase 6 |
| `control_schedules` | ✅ | 0 (estructura) | tabla creada; Fase 6 |
| `consumption_limits` | ✅ | 0 (estructura) | tabla creada; Fase 6 |
| `notifications` | ✅ | 0 (estructura) | tabla creada; Fase 5 |
| `audit_logs` | ✅ | 0 (estructura) | trigger append-only verificado (UPDATE/DELETE rechazados) |

**Subtotal dominio: 21/21 ✅.**

| Tabla de tracking | Existe en DB real | Observación |
|---|---|---|
| `_prisma_migrations` | ✅ | Tracking interno de Prisma (`0001_init` aplicada). No pertenece al MER. |

---

## Conteos de seed (escenario completo)

`device_categories=5`, `distributors=2`, `tariffs=2`, `organizations(is_demo=true)=1`, `installations` demo=1, `energy_kits` demo=1, `devices` demo=4, `device_pairings=4`, `electricity_bills=1`, `alerts=2`, `recommendations=2`. Detalle en `docs/audit/phase-1-vercel-neon-seed-verification.md`.

---

## Veredicto

**Esquema verificado contra Neon real: 21/21 tablas de dominio presentes** (+ `_prisma_migrations` de tracking), migración aplicada sin drift, seed poblado y consistente. Sin TimescaleDB (Neon no la ofrece): `telemetry_readings` opera como tabla normal vía el fallback previsto. **PASS.**
