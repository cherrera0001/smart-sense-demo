# Fase 7 — Auditoría OpenAPI ↔ Implementación (Hardening)

> Fecha: 2026-06-04 · Rama: `feat/phase-7-hardening`.
> Reconcilia el contrato OpenAPI (`specs/04-api/openapi.yaml` / `api-overview.md`) con los endpoints **nuevos o cambiados** en Fase 7 y su cobertura de tests.
> **Verificación contract-first manual:** los paths se cotejaron a mano contra el contrato (sin tooling automático de validación OpenAPI), consistente con Fases 2–6.
> **Alcance:** Fase 7 es hardening transversal; **no agrega endpoints de negocio**. Los cambios de contrato son: un endpoint **nuevo de auth** (`/auth/refresh`), un cambio de comportamiento en `/auth/logout` (revoca refresh) y dos endpoints **operativos** de salud (`/healthz`, `/readyz`).

## Endpoints nuevos / cambiados de Fase 7

> Cubiertos por la suite API (**156/156** total contra Neon real; +security 7, health 2, auth-refresh 7 sobre los 140 de Fase 6).

| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| POST `/auth/refresh` | adición Fase 7 (ver nota) | sí | sí (auth-refresh) | PASS |
| POST `/auth/logout` (revoca refresh) | sí (comportamiento ampliado) | sí | sí (auth-refresh) | PASS |
| GET `/healthz` | adición Fase 7 (ver nota) | sí | sí (health) | PASS |
| GET `/readyz` | adición Fase 7 (ver nota) | sí | sí (health) | PASS |

**Total Fase 7: 4 endpoints nuevos/cambiados — Implementado=sí, Test=sí, Estado=PASS.**

> `GET /health` ya existía desde el esqueleto Fastify (Fase 1/2); en Fase 7 su payload se enriqueció (`status/service/version/timestamp/uptime_s`) y se añadió el alias `/healthz`. `register`/`login` ya estaban en el contrato; en Fase 7 conservan el shape previo y **añaden** `refresh_token` (extensión retrocompatible).

## Nota de superset / adición Fase 7 (no se reescribe el yaml)

El `openapi.yaml` original **no declara** `/auth/refresh`, `/healthz` ni `/readyz` (el contrato canónico de auth contemplaba access + refresh rotado como intención, sin un path explícito de refresh; health/readiness son endpoints operativos). Consistente con la decisión de superset de Fases 4–6, en Fase 7:

- **No se reescribe masivamente el `openapi.yaml`.**
- Se documentan estos paths como **adición Fase 7** (superset retrocompatible):
  - **POST `/auth/refresh`**: body `{ refresh_token }` → `{ token, refresh_token }` (access 15m + refresh rotado). Reuso de refresh revocado → **401** + revocación del árbol.
  - **POST `/auth/logout`**: además de cerrar sesión, **revoca** el refresh activo.
  - **GET `/healthz`**: liveness `{ status, service, version, timestamp, uptime_s }` (alias de `/health`).
  - **GET `/readyz`**: readiness con `SELECT 1` → `{ status: ready, db: ok }`; **503 degraded** si la DB falla. Sin secretos.
- La reconciliación formal del `yaml` (incorporar estos paths + los supersets de Fases 4–6) queda como tarea de documentación de contrato final junto con la incorporación de validación OpenAPI en CI (Fase 8 / contrato API final, NFR-045).

## Cambios de comportamiento sin endpoint nuevo (transversales)

No alteran paths del contrato; endurecen la superficie existente:

- **Cabeceras de seguridad** (helmet) en todas las respuestas — `x-content-type-options: nosniff` verificado.
- **CORS** controlado por `CORS_ORIGINS`; wildcard rechazado en producción.
- **Rate-limit** global (300/min) + estricto en `/auth/login`, `/auth/register` y `POST /devices/{deviceId}/control-actions` → **429** al exceder.
- **Logger redactado** (no afecta contrato; afecta logs).

## Cobertura de tests (resumen)

- **auth-refresh (7):** refresh rota; reuso de refresh revocado → 401 + revoca árbol; logout revoca; `register`/`login` devuelven `token`+`refresh_token` (shape conservado); access sin `passwordHash`; persistencia `refresh_tokens` (jti+token_hash sha256, migración 0004).
- **health (2):** `/health` y `/healthz` liveness sin secretos; `/readyz` `SELECT 1` → ready / 503 degraded.
- **security (7):** helmet `nosniff`; CORS allow/deny; rate-limit 429; `env.ts` rechaza JWT débil y CORS wildcard en producción.

## Endpoints en OpenAPI NO implementados (Fase 8 / fase futura)

| Grupo | Endpoint / capacidad | Estado | Fase prevista |
|---|---|---|---|
| Bills | POST/GET `/installations/{id}/bills` | DIFERIDO | Fase posterior (UI/CRUD boletas) |
| Control (downlink real) | resolución async vía MQTT, on/off físico, ACK/timeout | DIFERIDO | Fase futura (canal IoT autenticado) |
| Observabilidad | `/metrics` Prometheus | DIFERIDO | Fase 8 |

## Veredicto

Los 4 endpoints nuevos/cambiados de Fase 7 (`/auth/refresh`, `/auth/logout` con revocación, `/healthz`, `/readyz`) están **implementados y testeados** (PASS), dentro de **156/156 API** contra Neon real. `/auth/refresh`, `/healthz` y `/readyz` se documentan como **adición Fase 7** (superset; el `openapi.yaml` no se reescribe masivamente, se reconcilia con validación en Fase 8). **Fase 7 PASS.**
