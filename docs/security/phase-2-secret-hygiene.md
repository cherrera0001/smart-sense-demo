# Fase 2 — Higiene de Secretos

> Fecha: 2026-06-02 · Rama `feat/phase-2-api-base`.

## Estado verificado
- `.env`, `.env.local`, `.env.vercel.local`, `packages/db/.env`, `apps/api/.env` → **todos gitignored** (verificado `git check-ignore`).
- `git grep` de credenciales reales (`npg_…`, connection strings con password, `JWT_SECRET=…`) en archivos versionados → **sin coincidencias reales**. La única coincidencia es un **placeholder** (`DATABASE_URL=postgresql://user:password@localhost…`) en `docs/00-Gobierno/BACKLOG_MVP_BACKEND.md` (no es secreto).

## ⚠️ Recomendación de rotación (acción del usuario)
La contraseña de Neon (`npg_…`) fue **pegada en el chat** durante Fase 1.4. Aunque quedó solo en `packages/db/.env` (gitignored, nunca commiteada), **una credencial expuesta en chat/logs debe considerarse comprometida**. 

**Acción recomendada:** rotar la contraseña en Neon (Dashboard → Branch/Roles → Reset password), actualizar `packages/db/.env` (y la variable en Vercel), y re-ejecutar `pnpm verify:phase1:external`. No bloquea Fase 2 (DB de desarrollo), pero debe hacerse antes de cualquier dato sensible real.

## Reglas Fase 2
- `JWT_SECRET`: en `apps/api/.env` (gitignored). `env.ts` rechaza secretos inseguros en `NODE_ENV=production`.
- Nunca imprimir `DATABASE_URL`/`DIRECT_URL`/`JWT_SECRET`/passwords en logs (enmascarar).
- `password_hash` nunca en respuestas de API.
- `.env.example` solo placeholders.
