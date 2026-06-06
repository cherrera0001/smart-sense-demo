# Fase 8 — Secret Scan (verificación pre-release)

> Fecha de verificación: **2026-06-06**. Rama `release/smartsense-f0-f7` (HEAD `a8bc3b6`).
> Objetivo: confirmar que **ningún secreto real** (connection strings, contraseñas, tokens) está versionado antes del push.

## 1. Resultado del scanner

| Check | Comando | Resultado |
|---|---|---|
| Secret-scan del repo | `pnpm security:scan-secrets` | **exit 0** — sin secretos en archivos versionados |
| Búsqueda manual | `git grep` de patrones de credenciales sobre archivos trackeados | sin secretos reales (solo placeholders) |

## 2. Manejo de `.env`

| Archivo | Estado | Nota |
|---|---|---|
| `packages/db/.env` | **IGNORADO** por `.gitignore` (no trackeado) | contiene la `DATABASE_URL` real de Neon (rotada) — nunca se versiona |
| `.env.example` (raíz y por app) | trackeado | **solo placeholders** (`USER:PASSWORD@HOST`, `JWT_SECRET=changeme`, etc.) |

- No hay `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` ni `JWT_REFRESH_SECRET` con valores reales en el árbol versionado.
- Los Dockerfiles (`apps/api`, `apps/web`) **no copian** `.env` (`.dockerignore` lo excluye).
- El logger de la API (`config/logger.ts`) redacta `authorization/cookie/password/tokens/DATABASE_URL` — los secretos tampoco aparecen en logs.

## 3. Rotación de credencial (recordatorio)

- La contraseña de Neon fue **ROTADA en Fase 7** (`ALTER ROLE … WITH PASSWORD`): la credencial vieja quedó inválida.
- La credencial nueva existe **solo** en `packages/db/.env` (gitignored). Ver `docs/security/phase-7-secret-rotation.md`.
- No se requiere nueva rotación para Fase 8, salvo que se detecte filtración (ver `docs/deployment/rollback-plan.md`).

## 4. Estado del gate

| Gate | Estado |
|---|---|
| `pnpm security:scan-secrets` exit 0 | ✅ |
| Sin secretos reales en `git grep` | ✅ |
| `.env` reales ignorados / `.env.example` solo placeholders | ✅ |
| Rotación Neon vigente (Fase 7) | ✅ |

> **Conclusión:** no hay secretos versionados. Push de la rama de release **seguro** desde el punto de vista de exposición de credenciales.
