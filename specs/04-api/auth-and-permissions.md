# Auth & Permissions — SmartSense API

> Deriva de `specs/_canon.md` (JWT access+refresh, RBAC multi-tenant, Argon2id), `domain-model.md` (User/Membership) y FR-AUTH-001..010. Errores en `error-model.md`.

## 1. Autenticación (JWT access + refresh)

### Tokens
| Token | Vida | Transporte | Propósito |
|---|---|---|---|
| **access** | corta (15 min) | header `Authorization: Bearer <jwt>` | Autoriza cada request. |
| **refresh** | larga (30 días) | body de `/auth/login` y respuesta `AuthSession`; cliente lo guarda en almacenamiento seguro / cookie httpOnly | Obtener nuevos access tokens. |

> Vidas exactas son configurables (NFR); los valores anteriores son los defaults de referencia.

### Claims del access token
```json
{
  "sub": "<user_id>",      // UUID del usuario
  "org": "<organization_id>", // tenant en contexto
  "role": "owner",          // rol efectivo en esa org (membership_role)
  "iat": 1735000000,
  "exp": 1735000900,
  "jti": "<token_id>"
}
```
- El backend autoriza usando `org` + `role` del token, **validados contra la membership activa** en cada request (el token no es la única fuente de verdad para revocaciones).
- Un usuario con varias organizaciones obtiene un access token por `org` en contexto; cambiar de tenant re-emite el access (o se incluye `organizationId` en la query de `/installations`).

### Token de ingesta IoT
- Las llamadas a `POST /iot/telemetry` usan un token de **kit/bridge** con claim `scope=telemetry:ingest` (no es un usuario, no tiene `role`). Solo puede ingerir telemetría de devices del kit asociado. No accede a datos energéticos del tenant (alineado a FR-ONB-010, instalador IoT).

### Hashing de contraseñas
- `password_hash` con **Argon2id** (canon, FR-AUTH-001). Parámetros mínimos de referencia: `m=19456 KiB`, `t=2`, `p=1` (ajustables por NFR). Nunca se almacena la contraseña en claro ni se loggea.
- Política de fortaleza validada en registro/cambio (FR-AUTH-001/010): mínimo 10 caracteres; el backend rechaza débiles con `VALIDATION_ERROR`.

### Rotación y revocación de refresh
- **Rotación**: cada uso del refresh emite un nuevo refresh y revoca el anterior (rotating refresh tokens, FR-AUTH-003). Reuso de un refresh ya rotado → `REFRESH_REVOKED` (401) y revocación de toda la cadena (detección de robo).
- **Revocación**: `/auth/logout` revoca el refresh actual; `logout` con `all_sessions=true` revoca todos los del usuario. Cambio de contraseña/recuperación (FR-AUTH-005/010) revoca todas las sesiones activas. Revocación de membership (FR-AUTH-008) invalida las sesiones del usuario en esa organización.

## 2. Flujo de tokens

```
register/login ──▶ { access (15m), refresh (30d) }
        │
   access válido ──▶ requests con Bearer
        │
   access expira ──▶ TOKEN_EXPIRED (401)
        │
   cliente usa refresh ──▶ nuevo access + nuevo refresh (rota), viejo refresh revocado
        │
   refresh revocado/expirado ──▶ REFRESH_REVOKED (401) ──▶ re-login
        │
   logout ──▶ revoca refresh (o todos si all_sessions)
```

### Manejo de sesiones
- Sesión = par de tokens asociado a un `jti`/refresh persistido (lista de sesiones activas por usuario).
- "Ver/cerrar sesiones activas" (FR-SET-006) opera sobre esa lista; "cerrar todas" revoca todos los refresh.
- Acciones sensibles de sesión (cambio de contraseña, cierre masivo, cambios de rol, claim de kit) se registran en `audit_logs` (append-only, canon).

## 3. Autorización RBAC

### Roles (enum `membership_role`)
`owner > admin > operator > viewer`. El rol es **por organización** (vive en `memberships`), no global. Rol externo operativo: **instalador IoT** (acceso acotado de terreno durante onboarding, sin membership permanente; no ve datos energéticos del tenant — FR-ONB-010).

### Invariantes de control (canon)
- Control remoto (`turn_on`/`turn_off`/`set_limit`, programación y límites) requiere **`operator | admin | owner`**.
- Toda `control_action` y todo claim/transfer de kit queda **auditado** en `audit_logs`.
- Un `viewer` que intenta controlar → `403 CONTROL_NOT_PERMITTED`, sin comando enviado, intento auditado (FR-CTRL-009).

### Matriz rol × recurso × acción

Leyenda: ✔ permitido · ✘ denegado (403). Todo además acotado al propio tenant (no cross-tenant).

| Grupo / acción | viewer | operator | admin | owner | FR |
|---|:--:|:--:|:--:|:--:|---|
| **Auth** — login/logout/me (sobre sí mismo) | ✔ | ✔ | ✔ | ✔ | FR-AUTH-002/004 |
| **Organizations** — ver | ✔ | ✔ | ✔ | ✔ | FR-AUTH-009 |
| Organizations — crear | ✔¹ | ✔¹ | ✔¹ | ✔¹ | FR-AUTH-001 |
| Organizations — cambiar plan SaaS | ✘ | ✘ | ✘ | ✔ | FR-SET-008 |
| **Installations** — listar/ver | ✔ | ✔ | ✔ | ✔ | FR-SET-002 |
| Installations — crear | ✘ | ✘ | ✔ | ✔ | FR-ONB-008 |
| Installations — editar/PATCH (tarifa, estado) | ✘ | ✘ | ✔ | ✔ | FR-SET-002/004 |
| **Onboarding** — escanear kit | ✘ | ✘ | ✔ | ✔ | FR-ONB-001 |
| Onboarding — claim kit | ✘ | ✘ | ✔ | ✔ | FR-ONB-002 |
| Onboarding — emparejar/crear device | ✘ | ✘ | ✔ | ✔ | FR-ONB-004/005 |
| Onboarding — ver status | ✔ | ✔ | ✔ | ✔ | FR-ONB-007 |
| **Devices** — listar/ver | ✔ | ✔ | ✔ | ✔ | FR-ONB-005 |
| Devices — crear | ✘ | ✘ | ✔ | ✔ | FR-ONB-005 |
| Devices — editar (nombre/categoría) | ✘ | ✘ | ✔ | ✔ | FR-SET-003 |
| **Telemetry** — ingesta `/iot/telemetry` | scope `telemetry:ingest` (token de kit) | — | — | — | FR-DASH-001 |
| Telemetry — leer latest/range | ✔ | ✔ | ✔ | ✔ | FR-DASH-001, FR-BRK-006 |
| **Dashboard** — ver | ✔ | ✔ | ✔ | ✔ | FR-DASH-001..007 |
| **Reports** — ver (daily/weekly/monthly/3m) | ✔ | ✔ | ✔ | ✔ | FR-REP-001..004 |
| **Breakdown** — ver | ✔ | ✔ | ✔ | ✔ | FR-BRK-001..005 |
| **Bills** — listar/ver | ✔ | ✔ | ✔ | ✔ | FR-BILL-007 |
| Bills — crear/cargar/confirmar | ✘ | ✔ | ✔ | ✔ | FR-BILL-001..007 |
| **Alerts** — listar/ver | ✔ | ✔ | ✔ | ✔ | FR-ALRT-001..006 |
| Alerts — revisar/descartar | ✘ | ✔ | ✔ | ✔ | FR-ALRT-005 |
| **Recommendations** — listar/ver | ✔ | ✔ | ✔ | ✔ | FR-REC-001..005 |
| Recommendations — aplicar/descartar | ✘ | ✔ | ✔ | ✔ | FR-REC-004 |
| **Control** — acción on/off/límite | ✘ | ✔ | ✔ | ✔ | FR-CTRL-001/002 |
| Control — programar horarios | ✘ | ✔ | ✔ | ✔ | FR-CTRL-004 |
| Control — definir límites de consumo | ✘ | ✔ | ✔ | ✔ | FR-CTRL-005 |
| Control — ver estado | ✔ | ✔ | ✔ | ✔ | FR-CTRL-003 |
| **Usuarios/roles** — invitar/cambiar rol/revocar | ✘ | ✘ | ✔ | ✔ | FR-AUTH-006/007/008 |
| Perfil de instalación — editar | ✘ | ✘ | ✔ | ✔ | FR-PROF-001 |

¹ Cualquier usuario autenticado puede crear una organización; queda como `owner` de la nueva organización (no implica permisos sobre otras).

## 4. Reglas de multi-tenant (scoping)

- **Aislamiento estricto**: toda query se filtra por el `organization_id` del contexto (claim `org` + membership activa verificada). Ninguna respuesta expone datos de otro tenant (invariante de canon).
- **Scoping de installation**: una `Installation` pertenece a exactamente una `Organization`. Sub-recursos (`devices`, telemetría, reportes, desglose, boletas, alertas, recomendaciones, control) se resuelven dentro de esa instalación y heredan su tenant.
- **Resolución de pertenencia**: para `devices/{id}`, `alerts/{id}`, `control-*` etc., el backend valida que el recurso pertenezca a una instalación de la organización del actor antes de autorizar.
- **Cross-tenant**: intento sobre recurso de otra organización → `404 RESOURCE_NOT_FOUND` (cuando confirmar existencia filtraría info) o `403 CROSS_TENANT_DENIED` (recurso referenciable, operación no permitida). Ver `error-model.md`.
- **Telemetría**: solo se acepta si el `device_external_ref`/kit resuelve a un device de un kit `active`; el `installation_id`/`organization_id` se derivan del kit, nunca del cliente (canon).

## 5. Reglas de gestión de membership (FR-AUTH-006/007/008)

- **Quién invita**: `admin | owner` invitan por email con un rol (`Membership status=invited`); el invitado acepta → `active`. Par `(user_id, organization_id)` único.
- **Cambio de rol**: `owner | admin` cambian roles. `admin` **no** puede crear ni ascender a `owner`. Toda mutación → `audit_logs`.
- **Protección del último owner**: no se puede degradar ni revocar al último `owner` → `409 LAST_OWNER_PROTECTED`.
- **Revocación**: `admin | owner` revocan una membership (`status=revoked`) → se revocan las sesiones del usuario en esa organización; un usuario sin memberships activas no puede operar (`403 NO_ACTIVE_MEMBERSHIP`).

## 6. Defensa en profundidad

- El frontend oculta/deshabilita acciones según rol (UX), pero **la autorización es siempre server-side**; nunca se confía en el cliente.
- Secrets nunca en frontend (canon). El token de ingesta IoT no se expone a usuarios finales.
- Rate limiting y throttling de auth (FR-AUTH-002) mitigan fuerza bruta; respuestas de auth genéricas evitan enumeración de cuentas.
