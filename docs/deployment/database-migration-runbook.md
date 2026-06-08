# Runbook de migraciones de base de datos — SmartSense

> Fase 8. Aplica a las 4 migraciones F0–F7 (`0001_init`, `0002_phase5_recommendations`, `0003_phase6_control`, `0004_phase7_refresh_tokens`).
> **Todas las migraciones actuales son aditivas / no destructivas.**
> Connection strings con placeholders (`USER:PASSWORD@HOST`).

## 1. Aplicar migraciones (staging / prod)

- Usar **`prisma migrate deploy`** (aplica migraciones pendientes en orden, sin generar nuevas).
- **NUNCA usar `prisma migrate dev`** en staging/prod (genera/reescribe migraciones y puede resetear la DB).

```bash
# DIRECT_URL apunta a la DB destino (unpooled)
pnpm --filter @smartsense/db exec prisma migrate deploy
```

## 2. Verificar estado

```bash
pnpm --filter @smartsense/db exec prisma migrate status
```

- Debe reportar las 4 migraciones como aplicadas, sin pendientes ni drift.

## 3. Seed

- Seed **solo** en dev/staging **autorizado**. **NO ejecutar seed en prod** sin confirmación explícita.
- El seed es idempotente (catálogo global + datos demo bajo `organizations.is_demo=true`).

```bash
# solo dev/staging autorizado
pnpm --filter @smartsense/db run db:seed
```

## 4. Política de DB

- **Migraciones no destructivas:** F0–F7 solo añade tablas/columnas/constraints aditivos. No hay `DROP`/`ALTER` destructivo de datos.
- Por tanto **no existe un `down` destructivo** que revertir: el rollback de un cambio de esquema se hace por **rollback de aplicación** (ver §5), no deshaciendo la migración.
- Toda futura migración destructiva requiere ADR + backup previo + ventana de mantenimiento.

## 5. Rollback de aplicación

- Si un deploy con migración nueva falla, **revertir la aplicación** (API) a la imagen/commit anterior.
- Como las migraciones son aditivas, una API anterior sigue funcionando contra el esquema más nuevo (columnas extra ignoradas) en la mayoría de los casos.
- Si una migración corrompiera datos (no es el caso de F0–F7), restaurar backup (ver §6).

## 6. Backups Neon

- **Branching:** crear un branch de Neon **antes** de aplicar migraciones en prod, como punto de restauración instantáneo.
- **Restore:** ante incidente, restaurar desde el branch/punto-en-el-tiempo de Neon.
- Documentar el `branch_id` / timestamp del punto de restauración en el registro del deploy.

## 7. Notas de entorno

- **Neon dev sin TimescaleDB:** `0001_init` crea `telemetry_readings` como tabla normal vía fallback `DO/EXCEPTION` (`create_hypertable` no disponible). En un Postgres con Timescale, revisar políticas de compresión/retención.
- `migrate deploy` usa `DIRECT_URL` (unpooled); el runtime de la API puede usar `DATABASE_URL` pooled.
- **Guard anti-prod en tests:** `assertSafeExternalUrl` rechaza URLs con `prod|production|live|primary|master|main`. No apuntar los tests a la DB de prod.
