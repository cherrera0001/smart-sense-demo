# Fase 8.3 — Estado del despliegue de API staging

> Fecha: **2026-06-06**. Solo documentación. Sin secretos.
> Clasificación: **READY-BLOCKED por credenciales** — el paquete de despliegue (render.yaml + scripts + `verify:staging`) está **listo y verificado en definición**; falta una **URL de staging** porque **ningún CLI de hosting está disponible/autenticado**. **No se desplegó (no se inventó).**

## 1. Disponibilidad de herramientas (verificado 2026-06-06)

| Herramienta | Estado | Detalle |
|---|---|---|
| Railway CLI | ⛔ **no autenticado** | `railway whoami` → **Unauthorized**; `RAILWAY_TOKEN` **ausente** (bash + Windows) |
| Fly.io (`flyctl`) | ⛔ **ausente** | binario no instalado |
| Render CLI | ⛔ **ausente** | binario no instalado |
| Docker | ⛔ **ausente** | no disponible en el entorno |

> Consecuencia: no se pudo obtener una `STAGING_API_URL`. Cualquier afirmación de "API desplegada" sería inventada → **no se hizo**.

## 2. Qué SÍ está listo (paquete ejecutable)

| Artefacto | Estado |
|---|---|
| `render.yaml` (Render Blueprint, `smartsense-api-staging`, start `tsx`, healthCheck `/health`) | ✅ creado |
| `scripts/deploy-railway-staging.sh` / `.ps1` (no interactivos, falla claro sin auth, start `tsx`) | ✅ creados |
| `scripts/verify-staging.mjs` (`STAGING_API_URL` → `/health` + `/readyz` + smoke E2E; exit 1 si falla) | ✅ creado |
| script root `verify:staging` | ✅ añadido |
| Runbook Render | ✅ `docs/deployment/phase-8-3-render-blueprint.md` |
| Runbook Railway | ✅ `docs/deployment/phase-8-3-railway-staging.md` |
| Runbook VPS (systemd + nginx + TLS) | ✅ `docs/deployment/phase-8-3-vps-api-staging.md` |

## 3. Clasificación

**API staging = READY-BLOCKED por credenciales.** No es FAIL (no falló un deploy ejecutado): no hubo manera de ejecutarlo por falta de credenciales/binarios. El runtime correcto (`tsx`, no node-dist) ya está fijado en todos los artefactos.

## 4. Acción exacta para desbloquear

Cualquiera de estas habilita el deploy y la verificación remota:

- **Railway:** `railway login` (interactivo) **o** exportar `RAILWAY_TOKEN`, luego `bash scripts/deploy-railway-staging.sh`.
- **Render:** seguir `docs/deployment/phase-8-3-render-blueprint.md` (New → Blueprint → repo → branch → secretos).
- **VPS:** seguir `docs/deployment/phase-8-3-vps-api-staging.md`.

Tras cualquiera de ellas:
```
STAGING_API_URL=<url-de-staging> pnpm verify:staging
```
(`/health` + `/readyz` + smoke E2E; exit 1 si falla).

> **Producción no tocada.** Web v2 build PASS / acceso BLOCKED-by-protection: `docs/audit/phase-8-3-vercel-web-v2-access.md`.
