# Fase 8.1 — Health / Readiness de staging

> Fecha: **2026-06-06**. Solo documentación. **No se tocó código.** Sin secretos (placeholders).
> Estado: **READY-BLOCKED** — sin API de staging desplegada no hay endpoints remotos que verificar.

## 1. Estado

| Item | Estado |
|---|---|
| API de staging | **NO desplegada** (READY-BLOCKED) |
| `/health` /`/healthz` remoto | **PENDIENTE** (no hay `STAGING_API_URL`) |
| `/readyz` remoto | **PENDIENTE** |

> Los endpoints `/health`, `/healthz` (liveness) y `/readyz` (readiness `SELECT 1`) están **implementados y verificados local** contra Neon en Fase 7 (GATE-OPS-001/002 = PASS). La verificación **remota** queda bloqueada hasta que exista un host de API real.

## 2. Comandos a ejecutar (cuando exista `<STAGING_API_URL>`)

```bash
# Liveness
curl <STAGING_API_URL>/health     # → 200
curl <STAGING_API_URL>/healthz    # → 200

# Readiness (chequea DB con SELECT 1)
curl <STAGING_API_URL>/readyz     # → 200 (db ok); 503 si la DB está caída
```

## 3. Criterios PASS

| Check | Criterio |
|---|---|
| `/health` · `/healthz` | HTTP **200**; shape `{ status: "ok", service, version, timestamp, uptime_s }` |
| `/readyz` | HTTP **200** con `status: ready` y `db: ok` (DB caída → **503 degraded**) |
| Sin fuga de secretos | la respuesta **no** expone `DATABASE_URL`, connection strings ni credenciales |
| CORS | `CORS_ORIGIN`/`CORS_ORIGINS` apunta al dominio del preview web real, **sin wildcard** (`*`) en producción |

- **Evidencia a registrar:** request + response reales (status code + body) de `/healthz` y `/readyz`; cabecera CORS observada (origen permitido vs denegado).

## 4. Conclusión

**READY-BLOCKED.** Endpoints implementados y verificados local (Fase 7); la verificación remota depende del despliegue de la API a un host real (credenciales no disponibles en esta fase).
