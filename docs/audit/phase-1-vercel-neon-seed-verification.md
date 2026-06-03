# Fase 1.4 — Verificación del seed contra Neon (resultado real)

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Resultado real de `pnpm db:seed` ejecutado contra la PostgreSQL de Neon (Vercel, proyecto `cherrera0001s-projects/smart-sense-demo`, entorno Development, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`).
> No se incluyen credenciales ni connection strings: el seed se ejecuta vía `DATABASE_URL`/`DIRECT_URL` directas/unpooled mantenidas solo en entorno de sesión / `packages/db/.env` (gitignored).

---

## Resultado de `pnpm db:seed`

`pnpm db:seed` → **OK** (exit 0).

> Nota: el primer intento de seed falló con `42P10` por un índice único **parcial** en `distributors.code` (`WHERE code IS NOT NULL`) incompatible con `ON CONFLICT(code)`. Se corrigió a índice único **completo** sobre `code` (alineado al `relational-model` que declara `code UNIQUE`), `prisma migrate reset --force` + re-aplicar, y el seed corre OK. Detalle en `docs/audit/phase-1-vercel-neon-runtime-verification.md §Cierre Fase 1.4`.

## Conteos verificados (catálogo global + escenario demo)

| Tipo | Tabla | Conteo | Criterio |
|---|---|---|---|
| Catálogo (global) | `device_categories` | **5** | > 0 ✅ |
| Catálogo (global) | `distributors` (CGE, Enel) | **2** | > 0 ✅ |
| Catálogo (global) | `tariffs` (BT-1, BT-1A) | **2** | > 0 ✅ |
| Demo | `organizations` con `is_demo=true` | **1** | ≥ 1 ✅ |
| Demo | `installations` | **1** (demo) | > 0 ✅ |
| Demo | `energy_kits` | **1** (demo) | > 0 ✅ |
| Demo | `devices` | **4** (demo) | > 0 ✅ |
| Demo | `device_pairings` | **4** (demo) | > 0 ✅ |
| Demo | `electricity_bills` | **1** (demo) | > 0 ✅ |
| Demo | `alerts` | **2** (demo) | > 0 ✅ |
| Demo | `recommendations` | **2** (demo) | > 0 ✅ |

## Confirmaciones

- **Catálogo global** (`device_categories`, `distributors`, `tariffs`) poblado e independiente de cualquier organización.
- **Todos los datos demo** cuelgan de la **org `is_demo=true`** (usuario, membership, instalación, perfil, kit, 4 devices, 4 pairings, boleta, 2 alertas, 2 recomendaciones). La marca `is_demo` aísla los datos de demostración del catálogo productivo.
- **Idempotencia:** el seed usa upserts deterministas; reejecutarlo no aumenta los conteos (la suite `test:db:external` incluye "seed corre sin error").

---

## Veredicto

`pnpm db:seed` ejecutado **OK** contra Neon real; catálogo global y escenario demo poblados con los conteos esperados; org demo marcada `is_demo=true`. **PASS.** Sin secretos ni connection strings en este documento.
