# Fase 8.1 — Migración de DB de staging

> Fecha: **2026-06-06**. Solo documentación. **No se tocó código.** Sin secretos (placeholders `USER:PASSWORD@HOST`).
> Estado: **READY-BLOCKED** — no hay entorno de staging desplegado.

## 1. Estado

| Item | Estado |
|---|---|
| Entorno de staging | **NINGUNO desplegado** (READY-BLOCKED) |
| DB Neon **dev** | ✅ **ya migrada** — `0001`–`0004` aplicadas vía `prisma migrate deploy`; `prisma migrate status` = "up to date" |
| DB de **staging** | **PENDIENTE** — sin host de API ni `DATABASE_URL` de staging provisionada |

> La migración contra Neon **dev** ya está verificada (Fase 1.4 + Fase 7, 4 migraciones aditivas). Para **staging real** falta provisionar la DB de staging y su `DATABASE_URL`/`DIRECT_URL`, que dependen del hosting de la API (sin credenciales en esta fase).

## 2. Migraciones (4, todas aditivas / no destructivas)

| Migración | Contenido |
|---|---|
| `0001_init` | 21 tablas + hypertable (fallback `DO/EXCEPTION`) + triggers (`set_updated_at`, append-only). |
| `0002_phase5_recommendations` | `recommendations.type` + `estimated_saving_kwh` + CHECK no-neg. |
| `0003_phase6_control` | `control_actions.idempotency_key` + `dry_run` (default true) + UNIQUE parcial. |
| `0004_phase7_refresh_tokens` | tabla `refresh_tokens` (`jti` + `token_hash` sha256). |

## 3. Comandos a ejecutar contra staging (cuando exista la DB)

> `DATABASE_URL`/`DIRECT_URL` de staging se inyectan **solo** en el entorno del host, nunca en el repo. Usar la URL **directa/unpooled** para migrar.

```bash
# 1. Generar cliente Prisma
pnpm db:generate

# 2. Aplicar migraciones (deploy, NUNCA dev) contra la DATABASE_URL de staging
pnpm db:migrate:deploy        # DIRECT_URL → DB de staging

# 3. Verificar estado (sin drift)
pnpm --filter @smartsense/db exec prisma migrate status   # → "up to date", sin pendientes
```

- **Criterio PASS:** las 4 migraciones aplican limpio sobre la DB de staging vacía; `migrate status` reporta "up to date" sin drift.
- **Seed:** solo si staging lo autoriza (`pnpm db:seed`); para un staging real con datos productivos no se siembra el escenario demo.
- **Evidencia a registrar:** exit code + conteo de tablas (`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'` → 21) + salida enmascarada de `migrate status`.

## 4. Conclusión

**READY-BLOCKED.** El pipeline de migración está validado contra Neon dev y listo para correr contra staging. Queda **PENDIENTE** ejecutar `db:generate → db:migrate:deploy → migrate status` contra la `DATABASE_URL` del staging, que requiere primero provisionar la DB y el hosting de la API (credenciales no disponibles en esta fase).
