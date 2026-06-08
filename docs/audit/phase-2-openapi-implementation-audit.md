# Fase 2 — Auditoría OpenAPI ↔ Implementación

> Fecha: 2026-06-02 · Rama: `feat/phase-2-api-base`.
> Reconcilia el contrato OpenAPI (`specs/04-api/openapi.yaml` / `api-overview.md`) con los endpoints implementados en `apps/api` y su cobertura de tests, para los grupos de Fase 2 (auth, organizations, installations, devices, onboarding).
> **Verificación contract-first manual:** los paths fueron cotejados 1:1 contra el contrato a mano (no se usó tooling automático de validación OpenAPI). Cada endpoint implementado existe en el contrato y viceversa para el alcance de Fase 2.

## Endpoints de Fase 2 (implementados)

> 19 endpoints. Todos: presentes en OpenAPI (`OpenAPI=sí`), implementados (`Implementado=sí`), con cobertura de tests (`Test=sí`), **Estado=PASS**.
> Tests: **39/39 PASS contra Neon real** (`pnpm --filter @smartsense/api test`): auth 6 · organizations 4 · installations 8 · devices 13 · onboarding 8.

### Auth (4)
| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| POST `/auth/register` | sí | sí | sí | PASS |
| POST `/auth/login` | sí | sí | sí | PASS |
| POST `/auth/logout` | sí | sí | sí | PASS |
| GET `/auth/me` | sí | sí | sí | PASS |

### Organizations (3)
| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| GET `/organizations` | sí | sí | sí | PASS |
| POST `/organizations` | sí | sí | sí | PASS |
| GET `/organizations/{id}` | sí | sí | sí | PASS |

### Installations (4)
| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| GET `/installations` | sí | sí | sí | PASS |
| POST `/installations` | sí | sí | sí | PASS |
| GET `/installations/{id}` | sí | sí | sí | PASS |
| PATCH `/installations/{id}` | sí | sí | sí | PASS |

### Devices (4)
| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| GET `/installations/{installationId}/devices` | sí | sí | sí | PASS |
| POST `/devices` | sí | sí | sí | PASS |
| GET `/devices/{id}` | sí | sí | sí | PASS |
| PATCH `/devices/{id}` | sí | sí | sí | PASS |

### Onboarding (4)
| Endpoint | OpenAPI | Implementado | Test | Estado |
|---|---|---|---|---|
| POST `/onboarding/kit/scan` | sí | sí | sí | PASS |
| POST `/onboarding/kit/claim` | sí | sí | sí | PASS |
| POST `/onboarding/devices/pair` | sí | sí | sí | PASS |
| GET `/onboarding/status` | sí | sí | sí | PASS |

**Total Fase 2: 19/19 endpoints — OpenAPI=sí, Implementado=sí, Test=sí, Estado=PASS.**

## Cobertura de casos de prueba (resumen)

Los 39 tests cubren, además del happy path:
- **401** sin token (rutas autenticadas).
- **403** cross-tenant (`CROSS_TENANT_DENIED`) vía `assertOrgAccess`/`assertInstallationAccess`/`assertDeviceAccess` (scoping por `organization_id`).
- **403** RBAC (`viewer` sin permiso de escritura).
- **409** conflictos: `EMAIL_TAKEN`, `KIT_ALREADY_CLAIMED`, duplicado `(kitId, externalRef)`.
- **422** payload inválido (validación Zod).
- `passwordHash` **nunca** presente en respuestas.

## Endpoints en OpenAPI NO implementados (Fase 3+)

> Presentes en el contrato (`api-overview.md §12` / `openapi.yaml`) pero **DIFERIDOS** por fase. `app.ts` no los registra en Fase 2.

| Grupo | Endpoint(s) | Estado | Fase prevista |
|---|---|---|---|
| Telemetry | POST `/iot/telemetry`, GET `/installations/{installationId}/telemetry/latest`, GET `/installations/{installationId}/telemetry/range` | DIFERIDO | Fase 3 |
| Dashboard | GET `/installations/{installationId}/dashboard` | DIFERIDO | Fase 3 |
| Reports | GET `/installations/{installationId}/reports/{daily,weekly,monthly,last-three-months}` | DIFERIDO | Fase 3 |
| Breakdown | GET `/installations/{installationId}/breakdown` | DIFERIDO | Fase 5 |
| Alerts | GET `/installations/{installationId}/alerts`, PATCH `/alerts/{id}/review` | DIFERIDO | Fase 5 |
| Recommendations | GET `/installations/{installationId}/recommendations` | DIFERIDO | Fase 5 |
| Control | POST `/devices/{deviceId}/control-actions`, POST `/devices/{deviceId}/control-schedules`, POST `/devices/{deviceId}/consumption-limits`, GET `/devices/{deviceId}/control-state` | DIFERIDO | Fase 6 |

> Nota: `bills` (POST/GET `/installations/{installationId}/bills`) también permanece DIFERIDO (Fase 4/onboarding UI); no forma parte de los 19 endpoints de Fase 2.

## Veredicto

Contrato y código alineados 1:1 para los 19 endpoints de Fase 2 (verificación manual, sin tooling automático). Cobertura de tests completa (39/39 PASS contra Neon real). Endpoints de fases posteriores correctamente diferidos. **Fase 2 PASS.**
