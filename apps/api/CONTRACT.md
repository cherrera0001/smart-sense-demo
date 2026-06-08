# apps/api — Contrato de módulos (Fase 2)

Convenciones OBLIGATORIAS para todos los módulos. La fundación ya existe; NO la modifiques.

## Estructura por módulo (`src/modules/<name>/`)
- `<name>.schemas.ts` — schemas Zod (request/params/query). Exporta los schemas.
- `<name>.service.ts` — lógica de negocio: funciones puras `(prisma, ...args) => Promise<...>`. Sin Fastify. Lanza errores con `Errors.*` de `../../lib/errors.js`.
- `<name>.routes.ts` — `export async function <name>Routes(app: FastifyInstance): Promise<void>`. Define rutas con **paths completos** (1:1 con openapi.yaml, sin prefix). Handlers: parsean con Zod, llaman al service, devuelven la respuesta saneada.
- `<name>.test.ts` — tests con `app.inject()` (ver helpers).

## Fundación disponible (importar, no recrear)
- `app.prisma` — PrismaClient singleton (decorado).
- `{ preHandler: [app.authenticate] }` en rutas protegidas → exige JWT; setea `req.user = { sub: userId }`.
- `app.signToken(userId)` → JWT firmado.
- `../../lib/errors.js` → `Errors.unauthorized/invalidCredentials/forbidden/crossTenant/notFound/conflict/emailTaken/kitAlreadyClaimed/validation`, y `AppError`.
- `../../lib/access.js` → `getActiveMemberships`, `assertOrgAccess(prisma,userId,orgId,allowed?)`, `assertInstallationAccess(prisma,userId,installationId,allowed?)`, `assertDeviceAccess(prisma,userId,deviceId,allowed?)`, `ROLES.manage|operate|read` (arrays de roles).
- `../../lib/audit.js` → `writeAudit(prisma,{organizationId,userId,action,entityType,entityId,before?,after?,ip?})`.
- `../../lib/password.js` → `hashPassword`, `verifyPassword`.
- Tipos/enums desde `@smartsense/shared` (MembershipRole, InstallationSegment, etc.) si los necesitas.

## Reglas duras
- userId actual = `req.user.sub` (string).
- NUNCA devolver `passwordHash`. Saneá objetos antes de responder.
- Toda lectura/escritura de recurso de tenant pasa por `assert*Access` (no cross-tenant).
- Mutaciones de creación/gestión: roles `ROLES.manage`. Operar: `ROLES.operate`. Lectura: `ROLES.read`.
- Status: 201 en creaciones; 200 en GET/PATCH/acciones; el error-handler convierte los `AppError`.
- Audit en: register, login, create org, create installation, update installation, create device, update device, claim kit, pair device.
- NO implementar telemetry/dashboard/reports/alerts/recommendations/control (Fase 3+).

## Campos Prisma (camelCase del client) — ver packages/db/prisma/schema.prisma
- User: id, email, passwordHash, fullName, phone?, locale, status, lastLoginAt?
- Organization: id, name, legalId?, segmentDefault?, plan, status, isDemo, deletedAt?
- Membership: id, userId, organizationId, role, status, invitedAt?, acceptedAt?
- Installation: id, organizationId, name, segment, address?, timezone, distributorId?, tariffId?, status, deletedAt?
- InstallationProfile: id, installationId(unique), segment, occupants?, heatingSystem?, criticalEquipment?(Json), declaredPowerKw?, operatingHours?(Json), extra?(Json)
- EnergyKit: id, installationId?, qrCode(unique), serial, model?, firmwareVersion?, status(unclaimed|active|transferring|retired), claimedAt?, deletedAt?
- DeviceCategory: id, key(unique), name, icon?, typicalPowerW?
- Device: id, kitId, installationId, categoryId?, name, externalRef, capabilities(Json), state(online|offline|unknown), lastSeenAt?, deletedAt?  (UNIQUE kitId+externalRef)
- DevicePairing: id, kitId, deviceExternalRef, status(paired|recommended|scanning|unpaired|error), deviceId?, detail?(Json)
- AuditLog: id, organizationId, userId?, action, entityType, entityId?, before?(Json), after?(Json), ip?

## Contrato de respuestas clave
- `POST /auth/register` → 201 `{ token, user: { id, email, fullName, locale }, organization: { id, name } }`. Crea user + organization + membership `owner` (status active). Hashea password. email único (409 EMAIL_TAKEN).
- `POST /auth/login` → 200 `{ token, user: {...saneado} }`. Credenciales inválidas → 401 genérico (no revela si el email existe). Audita login. Actualiza lastLoginAt.
- `POST /auth/logout` → 200 `{ ok: true }` (stateless). Audita si hay user.
- `GET /auth/me` (auth) → 200 `{ user: {...}, memberships: [{ organizationId, role, organization: { id, name } }] }`.
- Organizations/Installations/Devices/Onboarding: shapes según openapi.yaml; listas filtradas por memberships activos del usuario; GET/{id} con assert*Access; creates con audit.

## Onboarding (sin IoT real)
- `POST /onboarding/kit/scan` { code|qrCode } → estado del kit (busca por qrCode). Si no existe → 404 NOT_FOUND (no inventar hardware). Si existe → { kit: { id, status, installationId } }.
- `POST /onboarding/kit/claim` { kitId|qrCode, installationId } → asocia kit a installation; si el kit ya está `active` en otra installation → 409 KIT_ALREADY_CLAIMED. Setea status=active, claimedAt. Audita. assertInstallationAccess(manage).
- `POST /onboarding/devices/pair` { kitId, devices: [{ externalRef, name?, categoryKey? }] } → crea/actualiza device_pairings (status paired) y opcionalmente devices. Sin comunicación IoT.
- `GET /onboarding/status?installationId=` → avance: { hasKit, kitStatus, devicesPaired, profileComplete }.

## Tests (usar helpers en tests/helpers)
- `makeTestApp()`, `registerTestUser(app,{orgName?})` → { token, userId, email, organizationId }, `authHeader(token)`.
- Datos únicos por test (randomUUID) → aserciones acotadas al tenant creado. Sin truncado global.
- Cubrir: happy path + 401 sin token + 403 cross-tenant + 422 payload inválido + no passwordHash en respuestas.
