# Fase 8.5 — Auditoría OpenAPI vs Implementación

OpenAPI: `specs/04-api/openapi.yaml` (servers `/v1`). Comparado contra `apps/api/src/app.ts` + `modules/**/*.routes.ts`. Auditoría estática (status confirmado en handlers + aserciones de tests).

## Tabla endpoint

| Método + Path | OpenAPI | Implementado (file:line) | Test | Estado |
|---|:--:|---|:--:|---|
| POST /auth/register | ✓ | auth.routes.ts:9 | ✓ | DEVIATION-shape |
| POST /auth/login | ✓ | auth.routes.ts:21 | ✓ | DEVIATION-shape |
| POST /auth/refresh | ✗ | auth.routes.ts:28 | ✓ | GAP-no-openapi |
| POST /auth/logout | ✓ | auth.routes.ts:38 | ✓ | DEVIATION-shape (200 vs 204) |
| GET /auth/me | ✓ | auth.routes.ts:75 | ✓ | PASS |
| GET/POST/GET:id organizations | ✓ | organizations.routes.ts:12-25 | ✓ | DEVIATION-shape |
| GET/POST/GET:id/PATCH:id installations | ✓ | installations.routes.ts:37-57 | ✓ | DEVIATION-shape |
| GET devices / POST / GET:id / PATCH:id | ✓ | devices.routes.ts:11-36 | ✓ | DEVIATION-shape |
| onboarding scan/claim/pair/status | ✓ | onboarding.routes.ts:11-28 | ✓ | PASS |
| POST /iot/telemetry | ✓ | telemetry.routes.ts:14 | ✓ | DEVIATION-auth (doc) |
| GET telemetry/latest | ✓ | telemetry.routes.ts:21 | ✓ | PASS |
| GET telemetry/range | ✓ | telemetry.routes.ts:31 | ✓ | DEVIATION-shape (device_id snake) |
| GET dashboard | ✓ | dashboard.routes.ts:10 | ✓ | PASS |
| GET reports daily/weekly/monthly/last-three-months | ✓ | reports.routes.ts:20-38 | ✓ | DEVIATION-shape (date vs from/to) |
| GET breakdown | ✓ | breakdown.routes.ts:11 | ✓ | PASS |
| GET alerts / PATCH alerts/:id/review | ✓ | alerts.routes.ts:15-26 | ✓ | PASS/DEVIATION |
| GET recommendations | ✓ | recommendations.routes.ts:13 | ✓ | DEVIATION-shape |
| POST control-actions | ✓ | control.routes.ts:34 | ✓ | DEVIATION-shape (201 vs 202; body {action,value} vs {type,payload}; enum dry_run) |
| GET control-actions | ✗ | control.routes.ts:57 | ✓ | GAP-no-openapi |
| GET control-state | ✓ | control.routes.ts:68 | ✓ | PASS |
| POST/GET control-schedules; PATCH :id | ✓/✗ | control.routes.ts:79-101 | ✓ | GAP-no-openapi (GET/PATCH) |
| POST/GET consumption-limits; PATCH :id | ✓/✗ | control.routes.ts:113-135 | ✓ | GAP-no-openapi (GET/PATCH) |
| GET /health /healthz /readyz | ✗ | health.ts:19-22 | ✓ (healthz no) | GAP-no-openapi (operacional, aceptable) |
| GET/POST bills | ✓ | **NO implementado** (sin billing.routes.ts; no en app.ts:59-70) | unit only | **GAP-no-impl** |

## Brechas y recomendación (verdad SDD)

| Brecha | Severidad | Recomendación |
|---|---|---|
| **Bills en spec sin ruta** (service+schemas+tests existen, falta cablear billing.routes.ts) | MEDIUM | Cablear rutas (follow-up acotado) o marcar como diferido. NO se implementa en este gate (regla no-features). |
| POST /auth/refresh ausente de OpenAPI | MEDIUM | Actualizar OpenAPI (endpoint productivo testeado) |
| control GET actions / GET+PATCH schedules / GET+PATCH limits ausentes de OpenAPI | MEDIUM | Actualizar OpenAPI (F6 implementado/testeado) |
| /health /healthz /readyz fuera de OpenAPI | LOW | Aceptable (operacional); opcional documentar sin auth |
| Envelope `{nombre:[...]}` vs `{data,page_info}` del spec | MEDIUM | Decidir convención; el código no implementa cursor real → unificar (debt NFR-045) |
| camelCase (código) vs snake_case (spec); inconsistencia interna (telemetry usa device_id) | MEDIUM | Elegir UNA convención y alinear (debt NFR-045) |
| AuthSession: `{token}` vs `{access_token,token_type,expires_in,memberships}` | MEDIUM | Reconciliar (debt NFR-045) |
| logout 200 `{ok}` vs 204 | LOW | Actualizar OpenAPI a 200 (refleja realidad) |
| reports `date` vs `from/to` requeridos | MEDIUM | Actualizar OpenAPI al modelo date-anclado (testeado) |
| control 201 vs 202 + body + enum dry_run | MEDIUM | Actualizar OpenAPI a la realidad dry-run síncrona (201, {action,value}, enum dry_run) |
| **/iot/telemetry auth** | **LOW** | Doc: spec documenta token de kit (scope telemetry:ingest); impl usa JWT user **+ tenant-scope verificado** (ver runtime-gates-verification §/iot/telemetry). Funcionalmente seguro; reconciliar el doc del contrato. |

**Conclusión:** todos los endpoints implementados tienen test y responden; las DEVIATION son **drift de contrato OpenAPI** (el código testeado F2–F6 es la fuente de verdad). Reconciliación OpenAPI = deuda MEDIUM ya reconocida (NFR-045), no bloqueante. Único GAP funcional: Bills no cableado (MEDIUM).
