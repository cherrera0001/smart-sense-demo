# Fase 7 — Rotación y Gestión de Secretos

> Fecha: 2026-06-04. La credencial Neon expuesta en chat durante Fase 1.4 fue **ROTADA** en Fase 7.

## ✅ Rotación Neon ejecutada
La contraseña del rol Neon (`neondb_owner`) que se pegó en el chat (`npg_8lDbPvcBt6OC`) fue **invalidada**: se ejecutó `ALTER ROLE neondb_owner WITH PASSWORD '<nueva>'` (vía conexión autenticada como el propio rol) y se reescribió `packages/db/.env` (gitignored) con la nueva contraseña, **sin imprimir el secreto**. Verificación: `prisma migrate status` → "Database schema is up to date!" con la nueva credencial. **La contraseña vieja ya no funciona.**

La nueva contraseña vive **solo** en `packages/db/.env` (no versionado). No se registra aquí.

## Acción del usuario (si reutilizó la credencial vieja en otros lugares)
1. Si la URL vieja está en Vercel/otra máquina/CI → reemplazarla por la nueva (de `packages/db/.env`).
2. Opcional: rotar de nuevo desde el **Neon Dashboard** (Roles → Reset password) para una contraseña que nunca haya pasado por una herramienta local, y actualizar `packages/db/.env` + Vercel.
3. Ejecutar `pnpm verify:phase1:external` para confirmar.

## Gestión de secretos (estándar Fase 7)
- Secretos solo en `.env`/`packages/db/.env`/`apps/api/.env` (todos gitignored). `.env.example` solo placeholders.
- `pnpm security:scan-secrets` (y CI) falla si detecta secretos en archivos versionados.
- `JWT_SECRET`/`JWT_REFRESH_SECRET` ≥ 32 chars; el arranque (`config/env.ts`) **rechaza** valores débiles o ausentes en producción.
- Logs con **redacción** (`config/logger.ts`): Authorization, Cookie, password, tokens, DATABASE_URL nunca se loguean.
- `CORS_ORIGIN` no admite wildcard en producción.

## Variables (.env.example)
`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `API_PORT`, `NEXT_PUBLIC_DEMO_MODE`.
