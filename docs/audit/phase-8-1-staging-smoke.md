# Fase 8.1 — Smoke remoto de staging

> Fecha: **2026-06-06**. Solo documentación. **No se tocó código.** Sin secretos (placeholders).
> Estado: **READY-BLOCKED** — sin API de staging desplegada no hay smoke remoto que correr.

## 1. Estado

| Item | Estado |
|---|---|
| API de staging | **NO desplegada** (READY-BLOCKED) |
| Smoke remoto | **PENDIENTE** (depende del host de API) |
| Smoke **local** | ✅ **7 pasos OK** (API real + Neon dev) — verificado en este HEAD |

> El smoke (`scripts/smoke-api.mjs`) está verificado contra la API local + Neon (Fase 7, GATE-E2E-001 = PASS). La corrida **remota** queda bloqueada hasta que exista `<STAGING_API_URL>`.

## 2. Comando a ejecutar (cuando exista `<STAGING_API_URL>`)

> El script lee la URL base de la variable de entorno `API_BASE_URL` (default `http://localhost:3001`).

```bash
API_BASE_URL=<STAGING_API_URL> pnpm smoke:api
```

## 3. Pasos verificados por el smoke (7)

| # | Paso | Valida |
|---|---|---|
| 1 | health | `/health` 200 (API arriba) |
| 2 | register | alta de usuario/organización |
| 3 | login | emisión de JWT (access + refresh) |
| 4 | installation | creación/lectura de instalación |
| 5 | dashboard | `GET /installations/{id}/dashboard` |
| 6 | alerts | `GET /installations/{id}/alerts` |
| 7 | recommendations | `GET /installations/{id}/recommendations` |

- **Criterio PASS:** **7/7** pasos OK contra la API de staging.
- **Evidencia a registrar:** salida del smoke (`[smoke] API_BASE_URL = <STAGING_API_URL>` + 7/7) con la URL del host real.

## 4. Conclusión

**READY-BLOCKED.** Smoke verde local; la corrida remota depende del despliegue de la API a staging (credenciales no disponibles en esta fase).
