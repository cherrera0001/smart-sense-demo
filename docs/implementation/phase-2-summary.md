# Fase 2 — Resumen de Implementación (API base)

> Fecha: 2026-06-02 · Rama: `feat/phase-2-api-base` · Monorepo `smartsense-brownfield`.
> Levanta la API Fastify con autenticación JWT, RBAC multi-tenant y el flujo de onboarding hasta dispositivos, sobre la base de datos de Fase 1 (Neon real). Estrategia A (Preserve UI) intacta: la demo no consume la API en esta fase.

## Qué se implementó

### Stack
- **Fastify 5** + `@fastify/jwt` + **bcryptjs** (hash de password) + **Zod** (validación) + **Prisma** (`@smartsense/db`) + tipos de `@smartsense/shared`.

### Arquitectura
- **Plugins** decorados en la instancia raíz: `prisma`, `request-id`, `error-handler`, `auth` (JWT).
- **Libs compartidas:**
  - `errors` — errores de dominio tipados (códigos canónicos).
  - `access` — `assertOrgAccess` / `assertInstallationAccess` / `assertDeviceAccess` + `ROLES` (`manage` / `operate` / `read`) para RBAC y tenant-scope.
  - `audit` — `writeAudit` (append-only).
  - `password` — hash/verify con bcryptjs.
- **5 módulos** (cada uno con `routes` / `service` / `schemas` / `test`): `auth`, `organizations`, `installations`, `devices`, `onboarding`.
- `app.ts` **NO** registra telemetry/dashboard/reports/alerts/recommendations/control (Fase 3+).

### 19 endpoints
| Grupo | Endpoints |
|---|---|
| Auth | POST `/auth/register`, POST `/auth/login`, POST `/auth/logout`, GET `/auth/me` |
| Organizations | GET `/organizations`, POST `/organizations`, GET `/organizations/{id}` |
| Installations | GET `/installations`, POST `/installations`, GET `/installations/{id}`, PATCH `/installations/{id}` |
| Devices | GET `/installations/{installationId}/devices`, POST `/devices`, GET `/devices/{id}`, PATCH `/devices/{id}` |
| Onboarding | POST `/onboarding/kit/scan`, POST `/onboarding/kit/claim`, POST `/onboarding/devices/pair`, GET `/onboarding/status` |

### Seguridad
- **JWT**: claim `sub = userId`, expiración **7d**.
- **Password**: bcryptjs (**12 rounds**); `passwordHash` **NUNCA** presente en respuestas.
- **RBAC**: roles `owner` / `admin` / `operator` / `viewer`.
- **No cross-tenant**: `assert*Access` con scoping obligatorio por `organization_id` (acceso ajeno → `CROSS_TENANT_DENIED`).
- **Auditoría append-only** (`writeAudit`) en: register, login, create org, create+update installation, create+update device, claim kit, pair device.
- **Error handler uniforme**: `{ code, message, details, traceId }`.
- **request-id** propagado vía header.

## Qué NO se implementó (Fase 3+)
- Telemetría / ingestión IoT (`/iot/telemetry`, `telemetry/latest|range`) — **Fase 3**.
- Dashboard y reportes — **Fase 3**.
- Desglose (`breakdown`) — **Fase 5**.
- Alertas y recomendaciones — **Fase 5**.
- Control de dispositivos (`control-actions`, `control-schedules`, `consumption-limits`, `control-state`) — **Fase 6**.
- Boletas (`bills`) — Fase 4 (UI de onboarding).
- Conexión real frontend ↔ API (la demo sigue bajo DEMO_MODE).

## Decisiones técnicas
1. **bcryptjs vs Argon2id (desviación documentada):** el canon prefiere **Argon2id**. Se implementó con **bcryptjs** (12 rounds, puro JS, sin dependencias nativas) para simplicidad de build/CI en Windows. El swap a `@node-rs/argon2` es trivial (aislado en la lib `password`). Desviación registrada; no bloqueante.
2. **Plugins decorados en la instancia raíz:** `prisma`, `request-id`, `error-handler` y `auth` se decoran en la raíz de Fastify (disponibles para todos los módulos sin re-registro).
3. **Paths completos sin prefix global / full-path routes:** las rutas se declaran con su path completo (p. ej. `/installations/{installationId}/devices`) en lugar de prefijos por módulo, para mantener paridad 1:1 con el contrato OpenAPI.
4. **DEMO_MODE intacto:** `apps/web` no se tocó visualmente; el scaffold `apps/web/lib/api/client.ts` existe pero no es consumido por la UI (falla si se invoca bajo DEMO_MODE).

## Reglas RBAC y tenant-scope
- **RBAC** (`ROLES`): `manage` (owner/admin) para escritura sensible (crear org, crear/editar installation y device, claim/pair); `operate` para acciones operativas; `read` (viewer+) para lectura. `viewer` que intenta escribir → **403**.
- **Tenant-scope:** todo recurso se resuelve dentro del `organization_id` del actor vía `assertOrgAccess` / `assertInstallationAccess` / `assertDeviceAccess`. Acceso a recurso de otro tenant → **403 CROSS_TENANT_DENIED**. Sin fugas entre organizaciones.

## Tests
- **39/39 PASS contra Neon real** (`pnpm --filter @smartsense/api test`).
- Desglose: auth **6**, organizations **4**, installations **8**, devices **13**, onboarding **8**.
- Cubren: happy path, **401** sin token, **403** cross-tenant (`CROSS_TENANT_DENIED`), **403** RBAC (viewer), **409** (`EMAIL_TAKEN`, `KIT_ALREADY_CLAIMED`, duplicado `(kitId, externalRef)`), **422** payload inválido, y ausencia de `passwordHash` en respuestas.

## Estado de seguridad
- Passwords hasheadas (bcryptjs 12 rounds), nunca expuestas.
- JWT firmado; expiración 7d (ver riesgo abierto sobre access ≤15min + refresh).
- RBAC y tenant-scope verificados por tests (403 cross-tenant y viewer).
- Auditoría append-only en acciones sensibles.
- Error handler no filtra detalles internos; traza correlacionable vía `traceId`/request-id.

## Riesgos abiertos
1. **Argon2id pendiente:** desviación bcryptjs vs canon. Swap trivial a `@node-rs/argon2`, aislado en lib `password`. Resolver en Fase 7 (hardening) o antes.
2. **JWT 7d sin refresh rotado:** el canon pide access ≤15min + refresh rotado (FR-AUTH-010, NFR-002). La implementación actual usa un único JWT a 7d. Pendiente para Fase 7 / endurecimiento de auth.
3. **Sin throttling de auth aún:** rate limiting anti-fuerza-bruta (FR-AUTH-002, NFR-004) queda para Fase 7.
4. **Contract-first verificado manualmente:** la alineación OpenAPI ↔ código se cotejó a mano (sin tooling automático). Considerar validación OpenAPI en CI.
5. Warning preexistente `react-hooks/exhaustive-deps` en `Step2PairingLeds.tsx:35` (deuda demo, no bloqueante).

## Comandos para reproducir
```bash
pnpm install
pnpm -r typecheck            # 5 paquetes
pnpm build:api               # emit
pnpm build:web               # demo (12 rutas, DEMO_MODE)
pnpm -r lint                 # 1 warning preexistente (Step2PairingLeds.tsx:35)

# Tests de API contra Neon real (DATABASE_URL en packages/db/.env, gitignored):
set -a; . packages/db/.env; set +a
pnpm --filter @smartsense/api test   # 39/39 PASS
```

## Validación monorepo (verde)
- `typecheck -r` (5 paquetes) ✅
- `build:api` ✅ (emit) · `build:web` ✅ (12 rutas, demo intacta bajo DEMO_MODE)
- `lint` ✅ (1 warning preexistente `Step2PairingLeds.tsx:35`)
- `verify:phase1:external` sigue verde.

## Siguiente fase
**Fase 3 — IoT y telemetría:** ingestión idempotente (`POST /iot/telemetry` con `event_hash` UNIQUE + `Idempotency-Key`), `telemetry/latest|range`, agregaciones (rollup hour/day/week/month), costeo (BillingService/TariffService) y reportes básicos. Dependencias: Fase 1 (hypertable/tabla telemetría) + Fase 2 (devices/installations). **AUTORIZABLE.**
