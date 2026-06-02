# Requerimientos Funcionales — SmartSense

> Deriva de `specs/_canon.md`, `specs/02-domain/domain-model.md` y `specs/03-data-model/relational-model.md`.
> Convención de IDs: `FR-<MOD>-NNN`. Prioridades: `MVP | V1 | V2`. Segmentos: `home | smb | business`.
> Cada FR mapea a una o más **entidades de dominio** y a una **pantalla de maqueta** (referencia de página) para trazabilidad.
> Roles (RBAC, enum `membership_role`): `owner | admin | operator | viewer`. Rol externo operativo: **instalador IoT** (técnico de terreno, opera sobre kit no reclamado durante onboarding; no es membership permanente).

## Índice de módulos

| Mód | Nombre | FR |
|---|---|---|
| AUTH | Autenticación y usuarios | FR-AUTH-001..010 |
| ONB | Onboarding | FR-ONB-001..010 |
| PROF | Perfil de instalación | FR-PROF-001..007 |
| BILL | Boleta eléctrica | FR-BILL-001..008 |
| DASH | Dashboard | FR-DASH-001..007 |
| REP | Reportes | FR-REP-001..006 |
| BRK | Desglose | FR-BRK-001..006 |
| CTRL | Control | FR-CTRL-001..009 |
| ALRT | Alertas | FR-ALRT-001..006 |
| REC | Recomendaciones | FR-REC-001..005 |
| PROJ | Proyecciones | FR-PROJ-001..005 |
| SET | Ajustes | FR-SET-001..008 |

---

## A. AUTH — Autenticación y usuarios

### FR-AUTH-001 — Registro de usuario
- **Descripción:** Permite crear una cuenta con email y contraseña; crea de forma implícita una `Organization` (tenant) y una `Membership` con rol `owner`.
- **Actor:** Visitante (no autenticado).
- **Precondición:** El email no existe en `users` (único global).
- **Flujo principal:**
  1. El usuario ingresa `email`, `password`, `full_name`.
  2. El sistema valida formato y fortaleza de contraseña.
  3. Crea `User` (`password_hash` Argon2id, `locale='es-CL'`, `status='active'`).
  4. Crea `Organization` (`plan='free'`) y `Membership(role='owner', status='active')`.
  5. Emite evento `user.registered` y `organization.created`; inicia sesión (tokens JWT).
- **Reglas de negocio:** email único global; hash Argon2id; toda cuenta queda asociada a ≥1 organización con un `owner`.
- **Criterios de aceptación:** Con email nuevo → cuenta + org + membership owner creados y sesión activa. Con email existente → error 409 sin revelar enumeración explotable (mensaje genérico).
- **Dependencias:** —
- **Entidades:** User, Organization, Membership. **Pantalla:** Registro (pág. 1). **Prioridad:** MVP.

### FR-AUTH-002 — Inicio de sesión
- **Descripción:** Autenticación con email/contraseña; emite par JWT access + refresh.
- **Actor:** Usuario registrado.
- **Precondición:** Usuario `active` con membership activa.
- **Flujo principal:**
  1. Ingresa credenciales.
  2. Sistema verifica `password_hash`.
  3. Emite access token (corta duración) y refresh token; registra `last_login_at`.
  4. Emite `user.logged_in`.
- **Reglas:** usuario `suspended` no puede iniciar sesión; usuario sin membership activa no opera.
- **Criterios de aceptación:** Credenciales válidas → 200 + tokens. Inválidas → 401 genérico. Tras N intentos fallidos → throttling (ver NFR-seguridad).
- **Dependencias:** FR-AUTH-001.
- **Entidades:** User, Membership. **Pantalla:** Login (pág. 2). **Prioridad:** MVP.

### FR-AUTH-003 — Renovación de sesión (refresh)
- **Descripción:** Renueva el access token usando el refresh token vigente.
- **Actor:** Usuario autenticado (cliente).
- **Precondición:** Refresh token válido y no revocado.
- **Flujo principal:** Cliente envía refresh → sistema valida → emite nuevo access (y rota refresh).
- **Reglas:** rotación de refresh; un refresh revocado/expirado → 401 y cierre de sesión.
- **Criterios de aceptación:** Refresh válido → nuevo access. Refresh revocado → 401.
- **Dependencias:** FR-AUTH-002.
- **Entidades:** User. **Pantalla:** transversal. **Prioridad:** MVP.

### FR-AUTH-004 — Cierre de sesión
- **Descripción:** Invalida el refresh token actual.
- **Actor:** Usuario autenticado.
- **Precondición:** Sesión activa.
- **Flujo principal:** Usuario solicita logout → sistema revoca refresh → limpia sesión cliente.
- **Reglas:** logout no afecta otras sesiones salvo "cerrar todas".
- **Criterios de aceptación:** Tras logout el refresh ya no renueva.
- **Dependencias:** FR-AUTH-002. **Entidades:** User. **Pantalla:** Ajustes/Seguridad (pág. 21). **Prioridad:** MVP.

### FR-AUTH-005 — Recuperación de contraseña
- **Descripción:** Flujo de "olvidé mi contraseña" mediante token de un solo uso por email.
- **Actor:** Usuario registrado.
- **Precondición:** Email asociado a una cuenta (no se revela si existe).
- **Flujo principal:**
  1. Usuario solicita recuperación con su email.
  2. Sistema genera token de un solo uso con expiración corta y lo envía por email (`Notification channel=email`).
  3. Usuario abre el enlace y define nueva contraseña.
  4. Sistema actualiza `password_hash`, revoca sesiones activas, emite `user.password_reset`.
- **Reglas:** respuesta siempre genérica (anti-enumeración); token expira (p. ej. 30 min) y de un solo uso.
- **Criterios de aceptación:** Token válido → contraseña cambiada y sesiones revocadas. Token usado/expirado → error.
- **Dependencias:** FR-AUTH-001. **Entidades:** User, Notification. **Pantalla:** Recuperar contraseña (pág. 2b). **Prioridad:** MVP.

### FR-AUTH-006 — Gestión de roles (RBAC)
- **Descripción:** `owner|admin` pueden cambiar el rol de una membership.
- **Actor:** owner, admin.
- **Precondición:** El actor tiene rol `owner|admin` en la organización.
- **Flujo principal:** Selecciona membership → asigna nuevo rol → sistema valida y persiste → emite `membership.role_changed` → registra `AuditLog`.
- **Reglas:** no se puede degradar/eliminar el último `owner`; `admin` no puede crear/ascender a `owner`.
- **Criterios de aceptación:** Cambio válido → rol actualizado + audit log. Intento de quitar último owner → rechazado.
- **Dependencias:** FR-AUTH-001. **Entidades:** Membership, AuditLog. **Pantalla:** Ajustes/Usuarios (pág. 21c). **Prioridad:** V1.

### FR-AUTH-007 — Invitación de usuarios a la organización
- **Descripción:** `owner|admin` invitan a un usuario por email con un rol.
- **Actor:** owner, admin.
- **Precondición:** Actor con permiso; email objetivo.
- **Flujo principal:** Actor invita (email + rol) → crea `Membership(status='invited')` y `Notification(email)` → invitado acepta → `status='active'`, `accepted_at`.
- **Reglas:** par `(user_id, organization_id)` único; invitación pendiente expira (configurable).
- **Criterios de aceptación:** Invitación enviada → membership `invited`. Aceptación → `active`.
- **Dependencias:** FR-AUTH-006. **Entidades:** Membership, User, Notification. **Pantalla:** Ajustes/Usuarios (pág. 21c). **Prioridad:** V1.

### FR-AUTH-008 — Revocación de acceso
- **Descripción:** `owner|admin` revocan una membership.
- **Actor:** owner, admin.
- **Precondición:** No es el último owner.
- **Flujo principal:** Selecciona membership → revoca → `status='revoked'` → revoca sesiones del usuario en esa org → `AuditLog` + `membership.revoked`.
- **Reglas:** no revocar al último owner; un usuario sin memberships activas no puede operar.
- **Criterios de aceptación:** Revocación → sin acceso a recursos de la org.
- **Dependencias:** FR-AUTH-006. **Entidades:** Membership, AuditLog. **Pantalla:** Ajustes/Usuarios (pág. 21c). **Prioridad:** V1.

### FR-AUTH-009 — Matriz de permisos por rol
- **Descripción:** Define las capacidades por rol (autorización efectiva en cada endpoint/pantalla).
- **Actor:** Sistema (motor de autorización).
- **Precondición:** Membership activa con rol.
- **Reglas de negocio (matriz):**

  | Capacidad | viewer | operator | admin | owner |
  |---|:--:|:--:|:--:|:--:|
  | Ver dashboard/reportes/desglose | ✔ | ✔ | ✔ | ✔ |
  | Ejecutar control (on/off/límite) | ✘ | ✔ | ✔ | ✔ |
  | Programar horarios / límites | ✘ | ✔ | ✔ | ✔ |
  | Cargar/confirmar boleta | ✘ | ✔ | ✔ | ✔ |
  | Editar perfil de instalación | ✘ | ✘ | ✔ | ✔ |
  | Gestionar usuarios/roles | ✘ | ✘ | ✔ | ✔ |
  | Gestionar plan / facturación SaaS | ✘ | ✘ | ✘ | ✔ |
  | Reclamar/transferir kit | ✘ | ✘ | ✔ | ✔ |

  (✘ = sin acceso). El control remoto requiere `operator|admin|owner` (invariante de canon).
- **Criterios de aceptación:** Toda acción sin permiso retorna 403 y no muta estado. Acceso fuera del propio tenant → 403/404 (NFR de aislamiento).
- **Dependencias:** FR-AUTH-002. **Entidades:** Membership. **Pantalla:** transversal. **Prioridad:** MVP.

### FR-AUTH-010 — Cambio de contraseña autenticado
- **Descripción:** Usuario autenticado cambia su contraseña.
- **Actor:** Cualquier usuario autenticado.
- **Precondición:** Sesión válida; conoce contraseña actual.
- **Flujo principal:** Ingresa contraseña actual + nueva → sistema verifica actual → actualiza `password_hash` → opción de revocar otras sesiones.
- **Reglas:** valida fortaleza; requiere contraseña actual correcta.
- **Criterios de aceptación:** Actual correcta → contraseña cambiada; incorrecta → 400/401.
- **Dependencias:** FR-AUTH-002. **Entidades:** User. **Pantalla:** Ajustes/Seguridad (pág. 21d). **Prioridad:** MVP.

---

## B. ONB — Onboarding

### FR-ONB-001 — Escaneo del QR del kit
- **Descripción:** El usuario (o instalador) escanea el QR del kit para identificarlo.
- **Actor:** owner/admin (autoservicio) o instalador IoT.
- **Precondición:** Existe un `EnergyKit` con `qr_code` en estado `unclaimed`.
- **Flujo principal:**
  1. Abre el escáner QR en la app.
  2. Captura el código y lo resuelve contra `energy_kits.qr_code`.
  3. Muestra `serial`, `model`, `firmware_version` y estado del kit.
  4. Emite `kit.scanned`.
- **Reglas:** QR único; un kit `retired` no se puede escanear para claim; QR inexistente → error claro.
- **Criterios de aceptación:** QR válido `unclaimed` → datos del kit + opción de reclamar. QR inválido → mensaje de error.
- **Dependencias:** —. **Entidades:** EnergyKit. **Pantalla:** Escaneo QR (pág. 3a). **Prioridad:** MVP.

### FR-ONB-002 — Claim (asociación de kit a cuenta/instalación)
- **Descripción:** Asocia un kit escaneado a una instalación de la organización del usuario.
- **Actor:** owner, admin.
- **Precondición:** Kit `unclaimed`; existe (o se crea) una `Installation` destino.
- **Flujo principal:**
  1. Usuario confirma reclamar el kit.
  2. Sistema valida que el kit no esté `active` en otra instalación.
  3. Asigna `installation_id`, `status='active'`, `claimed_at`.
  4. Emite `kit.claimed`; registra `AuditLog`.
- **Reglas:** un kit no puede estar `active` en dos instalaciones simultáneamente; claim requiere `admin|owner`.
- **Criterios de aceptación:** Kit `unclaimed` → queda `active` ligado a la instalación + audit log. Kit ya `active` en otra instalación → rechazado.
- **Dependencias:** FR-ONB-001, FR-ONB-008. **Entidades:** EnergyKit, Installation, AuditLog. **Pantalla:** Confirmar kit (pág. 3b). **Prioridad:** MVP.

### FR-ONB-003 — Detección/escaneo de dispositivos del kit
- **Descripción:** Tras el claim, el kit reporta los dispositivos detectados (estado `scanning`).
- **Actor:** Sistema (iot-bridge) + usuario que observa.
- **Precondición:** Kit `active`.
- **Flujo principal:**
  1. El kit publica dispositivos descubiertos vía MQTT → iot-bridge.
  2. Por cada `device_external_ref` se crea/actualiza un `DevicePairing(status='scanning')`.
  3. La UI muestra el progreso en vivo (WebSocket).
  4. Emite `pairing.started`.
- **Reglas:** cada pairing referencia un `kit_id` válido; sin claim no hay scanning.
- **Criterios de aceptación:** Al iniciar, los dispositivos aparecen en estado `scanning` en tiempo casi real.
- **Dependencias:** FR-ONB-002. **Entidades:** DevicePairing, EnergyKit. **Pantalla:** Emparejamiento (pág. 3c). **Prioridad:** MVP.

### FR-ONB-004 — Estados de emparejamiento (paired / recommended / scanning)
- **Descripción:** Gestiona la transición de estados de `DevicePairing` durante el onboarding.
- **Actor:** Sistema + usuario.
- **Precondición:** Existen pairings en proceso.
- **Flujo principal:**
  1. `scanning` → detectado; `recommended` → sugerido para emparejar; `paired` → confirmado y vinculado a un `Device`.
  2. El usuario acepta los `recommended`; el sistema crea el `Device` correspondiente y pasa a `paired`.
  3. Estados de error → `error`; sin uso → `unpaired`.
  4. Emite `pairing.completed` / `pairing.failed`.
- **Reglas de negocio:** enum `pairing_status` ∈ `paired|recommended|scanning|unpaired|error`; un pairing `paired` debe tener `device_id`.
- **Criterios de aceptación:** Aceptar un `recommended` → `paired` + `Device` creado. Fallo → `error` con detalle.
- **Dependencias:** FR-ONB-003. **Entidades:** DevicePairing, Device. **Pantalla:** Emparejamiento (pág. 3). **Prioridad:** MVP.

### FR-ONB-005 — Confirmación/creación de dispositivos emparejados
- **Descripción:** Crea registros `Device` definitivos a partir de los pairings aceptados, con nombre y categoría.
- **Actor:** owner, admin.
- **Precondición:** Pairing en `recommended` o `paired`.
- **Flujo principal:**
  1. Usuario nombra el dispositivo y asigna `DeviceCategory`.
  2. Sistema crea `Device(kit_id, installation_id, external_ref, capabilities, state='unknown')`.
  3. Emite `device.paired`.
- **Reglas:** `UNIQUE(kit_id, external_ref)`; `installation_id` denormalizado desde el kit.
- **Criterios de aceptación:** Confirmación → `Device` persistido y listo para recibir telemetría.
- **Dependencias:** FR-ONB-004. **Entidades:** Device, DeviceCategory. **Pantalla:** Emparejamiento/Nombrar (pág. 4). **Prioridad:** MVP.

### FR-ONB-006 — Selección del tipo de instalación (segmento)
- **Descripción:** El usuario elige el segmento de la instalación: `home|smb|business`.
- **Actor:** owner, admin.
- **Precondición:** En flujo de onboarding (kit reclamado o por reclamar).
- **Flujo principal:** Usuario selecciona segmento → determina qué `InstallationProfile` aplica → continúa al perfil (módulo PROF).
- **Reglas:** enum `installation_segment`; el segmento condiciona el shape de `installation_profiles.extra`.
- **Criterios de aceptación:** Selección persistida en `installations.segment`; el flujo de perfil se adapta al segmento.
- **Dependencias:** FR-ONB-008. **Entidades:** Installation. **Pantalla:** Tipo de instalación (pág. 5). **Prioridad:** MVP.

### FR-ONB-007 — Estado de progreso del onboarding
- **Descripción:** Indica el avance del onboarding (kit → dispositivos → perfil → boleta) y permite retomarlo.
- **Actor:** owner, admin.
- **Precondición:** Onboarding iniciado.
- **Flujo principal:** UI muestra pasos completados/pendientes; el usuario puede reanudar donde quedó.
- **Reglas:** el onboarding se considera completo cuando hay kit `active`, ≥1 device `paired` y `InstallationProfile` con datos mínimos.
- **Criterios de aceptación:** Salir y volver → retoma el último paso; al completar → acceso al dashboard.
- **Dependencias:** FR-ONB-002..006. **Entidades:** Installation, EnergyKit, Device, InstallationProfile. **Pantalla:** Onboarding (transversal). **Prioridad:** V1.

### FR-ONB-008 — Creación de la instalación
- **Descripción:** Crea la `Installation` destino (sitio físico) dentro de la organización.
- **Actor:** owner, admin.
- **Precondición:** Organización existente.
- **Flujo principal:** Usuario ingresa `name`, `address?`, `timezone` (default `America/Santiago`) → sistema crea `Installation(status='active')` → emite `installation.created`.
- **Reglas:** pertenece a exactamente una organización.
- **Criterios de aceptación:** Instalación creada y disponible para claim de kit.
- **Dependencias:** FR-AUTH-001. **Entidades:** Installation, Organization. **Pantalla:** Nueva instalación (pág. 5b). **Prioridad:** MVP.

### FR-ONB-009 — Transferencia de kit entre instalaciones
- **Descripción:** Mueve un kit `active` de una instalación a otra de forma controlada.
- **Actor:** owner, admin.
- **Precondición:** Kit `active` en una instalación de la org.
- **Flujo principal:** Inicia transferencia → `status='transferring'` → re-asigna `installation_id` → vuelve a `active` → `kit.transferred` + `AuditLog`.
- **Reglas:** durante `transferring` el kit no acepta claim de terceros; no puede quedar `active` en dos sitios.
- **Criterios de aceptación:** Transferencia → kit ligado a nueva instalación; telemetría posterior se asocia al nuevo `installation_id`.
- **Dependencias:** FR-ONB-002. **Entidades:** EnergyKit, Installation, AuditLog. **Pantalla:** Ajustes/Dispositivos (pág. 21b). **Prioridad:** V2.

### FR-ONB-010 — Provisión de kit por instalador IoT
- **Descripción:** El instalador IoT realiza el alta física y emparejamiento sin ser membership permanente; deja el kit listo para que el `owner` lo reclame.
- **Actor:** Instalador IoT (acceso acotado de terreno).
- **Precondición:** Kit físico con QR; orden de instalación.
- **Flujo principal:** Instalador escanea QR (FR-ONB-001) → verifica conectividad y dispositivos (FR-ONB-003/004) → marca el kit como listo para claim.
- **Reglas:** el instalador no accede a datos energéticos del tenant; sus acciones quedan en `AuditLog`.
- **Criterios de aceptación:** Kit queda detectado y emparejado, en `unclaimed` o pre-asociado, sin exponer datos del tenant al instalador.
- **Dependencias:** FR-ONB-001, FR-ONB-003. **Entidades:** EnergyKit, DevicePairing, AuditLog. **Pantalla:** Escaneo/Emparejamiento (págs. 3–4). **Prioridad:** V1.

---

## C. PROF — Perfil de instalación

### FR-PROF-001 — Crear/editar perfil base de la instalación
- **Descripción:** Captura los atributos comunes del perfil según el segmento.
- **Actor:** owner, admin.
- **Precondición:** Instalación creada con `segment` definido.
- **Flujo principal:** Usuario completa `occupants?`, `heating_system?`, `declared_power_kw?`, `operating_hours?`, `critical_equipment?` → sistema persiste en `installation_profiles` (1↔1 con `Installation`) → emite `profile.updated`.
- **Reglas:** `occupants >= 0`, `declared_power_kw >= 0`; relación 1↔1 con la instalación.
- **Criterios de aceptación:** Datos válidos → perfil creado/actualizado. Valores negativos → rechazados.
- **Dependencias:** FR-ONB-006. **Entidades:** InstallationProfile, Installation. **Pantalla:** Perfil de instalación (págs. 5–7). **Prioridad:** MVP.

### FR-PROF-002 — Perfil segmento `home`
- **Descripción:** Datos de vivienda: nº de personas, tipo/sistema de calefacción, horarios de operación del hogar.
- **Actor:** owner, admin.
- **Precondición:** `segment='home'`.
- **Flujo principal:** Usuario ingresa datos de vivienda → se guarda en columnas comunes + `extra` (shape de `home`).
- **Reglas:** `extra` valida contra `segment='home'`.
- **Criterios de aceptación:** Perfil `home` guardado con nº personas y calefacción.
- **Dependencias:** FR-PROF-001. **Entidades:** InstallationProfile. **Pantalla:** Perfil hogar (pág. 6). **Prioridad:** MVP.

### FR-PROF-003 — Perfil segmento `smb`
- **Descripción:** Datos del local: horario comercial, equipos críticos, potencia/capacidad declarada.
- **Actor:** owner, admin.
- **Precondición:** `segment='smb'`.
- **Flujo principal:** Usuario ingresa horario de operación, equipos críticos (jsonb) y potencia declarada → persiste en columnas + `extra` (shape `smb`).
- **Reglas:** `extra` valida contra `segment='smb'`.
- **Criterios de aceptación:** Perfil `smb` guardado con horarios y equipos críticos.
- **Dependencias:** FR-PROF-001. **Entidades:** InstallationProfile. **Pantalla:** Perfil PyME (pág. 6b). **Prioridad:** MVP.

### FR-PROF-004 — Perfil segmento `business`
- **Descripción:** Datos de planta/empresa: turnos/horarios de operación, equipos críticos, potencia/capacidad declarada (kW).
- **Actor:** owner, admin.
- **Precondición:** `segment='business'`.
- **Flujo principal:** Usuario ingresa turnos, equipos críticos, `declared_power_kw` → persiste en columnas + `extra` (shape `business`).
- **Reglas:** `extra` valida contra `segment='business'`.
- **Criterios de aceptación:** Perfil `business` guardado con potencia declarada y turnos.
- **Dependencias:** FR-PROF-001. **Entidades:** InstallationProfile. **Pantalla:** Perfil empresa (pág. 7). **Prioridad:** MVP.

### FR-PROF-005 — Equipos críticos
- **Descripción:** Registro estructurado de equipos críticos (no apagables / prioritarios) usados por control y alertas.
- **Actor:** owner, admin.
- **Precondición:** Perfil existente.
- **Flujo principal:** Usuario lista equipos críticos (`critical_equipment` jsonb: nombre, potencia estimada, criticidad) → persiste.
- **Reglas:** los equipos marcados críticos no se proponen para apagado automático por límite (`action_on_exceed='turn_off'`).
- **Criterios de aceptación:** Equipo marcado crítico no puede apagarse por acción automática de límite.
- **Dependencias:** FR-PROF-001. **Entidades:** InstallationProfile. **Pantalla:** Equipos críticos (pág. 7b). **Prioridad:** V1.

### FR-PROF-006 — Horarios de operación
- **Descripción:** Define ventanas horarias de operación que contextualizan alertas y proyecciones.
- **Actor:** owner, admin.
- **Precondición:** Perfil existente.
- **Flujo principal:** Usuario define `operating_hours` (jsonb por día/turno) → persiste.
- **Reglas:** horarios coherentes (inicio < fin por bloque).
- **Criterios de aceptación:** Consumo fuera de horario declarado puede elevar la severidad de una alerta de anomalía.
- **Dependencias:** FR-PROF-001. **Entidades:** InstallationProfile. **Pantalla:** Horarios (pág. 7c). **Prioridad:** V1.

### FR-PROF-007 — Potencia/capacidad declarada
- **Descripción:** Registra la potencia contratada/declarada (`declared_power_kw`) usada para detectar cercanía a la capacidad y riesgo de demanda.
- **Actor:** owner, admin.
- **Precondición:** Perfil existente.
- **Flujo principal:** Usuario ingresa `declared_power_kw` → persiste.
- **Reglas:** `>= 0`; usada por alertas de demanda y proyecciones de sobreconsumo.
- **Criterios de aceptación:** Si la potencia instantánea agregada se acerca a la declarada → se puede generar alerta de demanda.
- **Dependencias:** FR-PROF-001. **Entidades:** InstallationProfile. **Pantalla:** Perfil (págs. 5–7). **Prioridad:** V1.

---

## D. BILL — Boleta eléctrica

### FR-BILL-001 — Cargar imagen/PDF de boleta
- **Descripción:** Sube el archivo de la boleta (imagen o PDF) y lo almacena de forma segura.
- **Actor:** operator, admin, owner.
- **Precondición:** Instalación existente.
- **Flujo principal:**
  1. Usuario sube imagen/PDF.
  2. Sistema valida tipo/tamaño, almacena el archivo y guarda `file_url`.
  3. Crea `ElectricityBill(status='uploaded')`; emite `bill.uploaded`.
- **Reglas:** se conserva el archivo original (referencia segura, acceso scoped al tenant).
- **Criterios de aceptación:** Archivo válido → boleta `uploaded` con `file_url`. Tipo no permitido → rechazado.
- **Dependencias:** FR-ONB-008. **Entidades:** ElectricityBill, Installation. **Pantalla:** Boleta/Cargar (pág. 8). **Prioridad:** MVP.

### FR-BILL-002 — Extracción manual inicial de datos
- **Descripción:** El usuario ingresa manualmente los datos de la boleta (extracción manual en MVP).
- **Actor:** operator, admin, owner.
- **Precondición:** Boleta en `uploaded`.
- **Flujo principal:** Usuario ingresa periodo, consumo, montos, cargos, vencimiento → sistema valida y guarda → `status='parsed'`.
- **Reglas:** `consumption_kwh >= 0`, `total_clp >= 0`, `period_end >= period_start`.
- **Criterios de aceptación:** Datos válidos → `parsed`. Periodo inválido → rechazado.
- **Dependencias:** FR-BILL-001. **Entidades:** ElectricityBill. **Pantalla:** Boleta/Datos (pág. 8b). **Prioridad:** MVP.

### FR-BILL-003 — Distribuidora y número de cliente
- **Descripción:** Asocia la boleta a una `Distributor` y registra `client_number`.
- **Actor:** operator, admin, owner.
- **Precondición:** Boleta en `uploaded|parsed`.
- **Flujo principal:** Usuario selecciona distribuidora del catálogo e ingresa nº cliente → persiste `distributor_id`, `client_number`.
- **Reglas:** distribuidora del catálogo global.
- **Criterios de aceptación:** Boleta queda asociada a la distribuidora seleccionada.
- **Dependencias:** FR-BILL-002. **Entidades:** ElectricityBill, Distributor. **Pantalla:** Boleta/Datos (pág. 8b). **Prioridad:** MVP.

### FR-BILL-004 — Tarifa de la boleta
- **Descripción:** Asocia/selecciona la `Tariff` aplicable para el cálculo de costos en backend.
- **Actor:** operator, admin, owner.
- **Precondición:** Distribuidora seleccionada.
- **Flujo principal:** Usuario selecciona/crea tarifa (código, `energy_price_clp_kwh`, `fixed_charge_clp?`, `demand_charge_clp_kw?`) → persiste `tariff_id`.
- **Reglas:** todo cálculo monetario requiere tarifa o boleta base (canon).
- **Criterios de aceptación:** Con tarifa asociada, el sistema puede estimar costos CLP en dashboard/reportes.
- **Dependencias:** FR-BILL-003. **Entidades:** ElectricityBill, Tariff. **Pantalla:** Boleta/Tarifa (pág. 8c). **Prioridad:** MVP.

### FR-BILL-005 — Periodo de facturación y consumo
- **Descripción:** Registra `period_start`, `period_end`, `consumption_kwh`.
- **Actor:** operator, admin, owner.
- **Precondición:** Boleta en captura.
- **Flujo principal:** Usuario ingresa periodo y consumo en kWh → persiste.
- **Reglas:** `period_end >= period_start`; `consumption_kwh >= 0`.
- **Criterios de aceptación:** Periodo coherente y consumo no negativo guardados.
- **Dependencias:** FR-BILL-002. **Entidades:** ElectricityBill. **Pantalla:** Boleta/Datos (pág. 8b). **Prioridad:** MVP.

### FR-BILL-006 — Montos y cargos
- **Descripción:** Registra `total_clp`, `fixed_charge_clp?`, `variable_charge_clp?`, `due_date?`.
- **Actor:** operator, admin, owner.
- **Precondición:** Boleta en captura.
- **Flujo principal:** Usuario ingresa monto total, cargos fijos/variables y fecha de vencimiento → persiste (CLP enteros).
- **Reglas:** montos `>= 0`; dinero en CLP entero.
- **Criterios de aceptación:** Montos guardados; el vencimiento puede disparar notificación.
- **Dependencias:** FR-BILL-005. **Entidades:** ElectricityBill. **Pantalla:** Boleta/Datos (pág. 8b). **Prioridad:** MVP.

### FR-BILL-007 — Confirmación de la boleta
- **Descripción:** El usuario confirma que los datos son correctos → `status='confirmed'`.
- **Actor:** operator, admin, owner.
- **Precondición:** Boleta en `parsed` con datos mínimos.
- **Flujo principal:** Usuario revisa y confirma → `status='confirmed'`; emite `bill.confirmed`; queda disponible para comparación/proyección.
- **Reglas:** solo una boleta `confirmed` define la base activa por periodo.
- **Criterios de aceptación:** Confirmación → boleta usable como base de comparación (PROJ) y tarifa de cálculo.
- **Dependencias:** FR-BILL-002..006. **Entidades:** ElectricityBill. **Pantalla:** Boleta/Confirmar (pág. 8d). **Prioridad:** MVP.

### FR-BILL-008 — Extracción asistida (OCR) de boleta
- **Descripción:** Pre-rellena los campos desde el archivo mediante OCR/parsing, guardando `raw_extraction`.
- **Actor:** Sistema (asistido) + usuario revisor.
- **Precondición:** Boleta `uploaded`.
- **Flujo principal:** Sistema procesa el archivo → propone campos en `raw_extraction` → usuario revisa/corrige → confirma (FR-BILL-007).
- **Reglas:** la extracción es propuesta; el usuario siempre confirma (no se inventan datos).
- **Criterios de aceptación:** Campos propuestos visibles y editables; confirmación produce `confirmed`.
- **Dependencias:** FR-BILL-001. **Entidades:** ElectricityBill. **Pantalla:** Boleta/Cargar (pág. 8). **Prioridad:** V1.

---

## E. DASH — Dashboard

### FR-DASH-001 — Consumo instantáneo (W/kW)
- **Descripción:** Muestra la potencia activa actual de la instalación en vivo.
- **Actor:** Todos los roles (≥ viewer).
- **Precondición:** Kit `active` con dispositivos enviando telemetría.
- **Flujo principal:** El backend agrega `active_power_w` de los devices online y lo emite por WebSocket → la UI muestra W/kW en vivo.
- **Reglas:** solo datos del propio tenant; potencia derivada de telemetría con `device_id` válido.
- **Criterios de aceptación:** Con telemetría reciente → valor en vivo actualizado. Sin telemetría → estado "sin datos en vivo".
- **Dependencias:** FR-ONB-005, ingesta (NFR). **Entidades:** TelemetryReading, Device, Installation. **Pantalla:** Dashboard (pág. 9). **Prioridad:** MVP.

### FR-DASH-002 — Consumo del día (kWh)
- **Descripción:** Energía acumulada del día en curso.
- **Actor:** viewer+.
- **Precondición:** Existen agregados/lecturas del día.
- **Flujo principal:** Backend suma `energy_kwh` del bucket `day` actual (`energy_aggregates`) → UI muestra kWh del día.
- **Reglas:** consumo no negativo; agregados idempotentes por bucket.
- **Criterios de aceptación:** kWh del día coincide con la suma de agregados del día.
- **Dependencias:** FR-DASH-001. **Entidades:** EnergyAggregate. **Pantalla:** Dashboard (pág. 9). **Prioridad:** MVP.

### FR-DASH-003 — Costo estimado del día (CLP)
- **Descripción:** Estimación monetaria del consumo del día en CLP (cálculo en backend).
- **Actor:** viewer+.
- **Precondición:** Tarifa o boleta base disponible.
- **Flujo principal:** Backend aplica tarifa al `energy_kwh` del día → `cost_clp` → UI muestra CLP.
- **Reglas:** costos siempre en backend; sin tarifa/boleta no se muestra CLP (se indica "tarifa pendiente").
- **Criterios de aceptación:** Con tarifa → CLP estimado. Sin tarifa → mensaje "configura tarifa/boleta" sin inventar valor.
- **Dependencias:** FR-BILL-004, FR-DASH-002. **Entidades:** EnergyAggregate, Tariff, ElectricityBill. **Pantalla:** Dashboard (pág. 9). **Prioridad:** MVP.

### FR-DASH-004 — Comparación con periodo anterior
- **Descripción:** Muestra variación (%) del consumo/costo respecto al periodo anterior equivalente.
- **Actor:** viewer+.
- **Precondición:** Existen agregados del periodo anterior.
- **Flujo principal:** Backend compara bucket actual vs anterior → entrega delta y % → UI lo muestra (↑/↓).
- **Reglas:** si no hay periodo anterior suficiente → omite el comparativo (no inventa).
- **Criterios de aceptación:** Con datos previos → muestra % de variación. Sin datos → oculta/omite el comparativo.
- **Dependencias:** FR-DASH-002. **Entidades:** EnergyAggregate. **Pantalla:** Dashboard (pág. 9). **Prioridad:** V1.

### FR-DASH-005 — Estado del kit y dispositivos
- **Descripción:** Indica el estado de conexión del kit y los devices (`online|offline|unknown`).
- **Actor:** viewer+.
- **Precondición:** Kit reclamado.
- **Flujo principal:** Backend deriva estado de `Device.state`/`last_seen_at` → UI muestra resumen (conectado/offline).
- **Reglas:** `offline` si no hay telemetría dentro del umbral; estado por tenant.
- **Criterios de aceptación:** Device sin telemetría reciente → `offline` reflejado en dashboard.
- **Dependencias:** FR-ONB-005. **Entidades:** Device, EnergyKit. **Pantalla:** Dashboard (pág. 9). **Prioridad:** MVP.

### FR-DASH-006 — Alertas pendientes en dashboard
- **Descripción:** Muestra el conteo/resumen de alertas `open` de la instalación.
- **Actor:** viewer+.
- **Precondición:** —.
- **Flujo principal:** Backend cuenta `alerts.status='open'` por instalación → UI muestra badge/resumen y enlace al detalle.
- **Reglas:** solo alertas del tenant.
- **Criterios de aceptación:** Alertas `open` reflejadas en el contador; al revisar, el contador baja.
- **Dependencias:** FR-ALRT-001. **Entidades:** Alert. **Pantalla:** Dashboard (pág. 9). **Prioridad:** MVP.

### FR-DASH-007 — Empty state del dashboard
- **Descripción:** El dashboard renderiza correctamente sin datos históricos suficientes, guiando al usuario.
- **Actor:** viewer+.
- **Precondición:** Instalación recién creada / sin telemetría.
- **Flujo principal:** Si no hay agregados/lecturas → UI muestra estado vacío con CTA (cargar boleta, esperar datos) en lugar de error.
- **Reglas:** la UI debe renderizar aun sin datos históricos (NFR de resiliencia UI).
- **Criterios de aceptación:** Instalación sin datos → dashboard usable con mensaje de "aún sin datos", sin pantalla rota.
- **Dependencias:** FR-DASH-001..006. **Entidades:** —. **Pantalla:** Dashboard vacío (pág. 9b). **Prioridad:** MVP.

---

## F. REP — Reportes

### FR-REP-001 — Reporte por día
- **Descripción:** Consumo (kWh) y costo estimado (CLP) por día.
- **Actor:** viewer+.
- **Precondición:** Agregados `day` disponibles.
- **Flujo principal:** Usuario selecciona "día" → backend devuelve serie de buckets `day` → UI grafica (Recharts).
- **Reglas:** datos del tenant; costo solo si hay tarifa/boleta.
- **Criterios de aceptación:** Serie diaria con kWh y CLP renderizada para el rango.
- **Dependencias:** FR-DASH-002, FR-DASH-003. **Entidades:** EnergyAggregate. **Pantalla:** Reportes (pág. 10). **Prioridad:** MVP.

### FR-REP-002 — Reporte por semana
- **Descripción:** Consumo y costo agregados por semana.
- **Actor:** viewer+. **Precondición:** Agregados `week`.
- **Flujo principal:** Selecciona "semana" → backend devuelve buckets `week` → UI grafica.
- **Reglas:** ídem REP-001.
- **Criterios de aceptación:** Serie semanal renderizada.
- **Dependencias:** FR-REP-001. **Entidades:** EnergyAggregate. **Pantalla:** Reportes (pág. 10). **Prioridad:** MVP.

### FR-REP-003 — Reporte por mes
- **Descripción:** Consumo y costo agregados por mes.
- **Actor:** viewer+. **Precondición:** Agregados `month`.
- **Flujo principal:** Selecciona "mes" → backend devuelve buckets `month` → UI grafica.
- **Reglas:** ídem REP-001.
- **Criterios de aceptación:** Serie mensual renderizada.
- **Dependencias:** FR-REP-001. **Entidades:** EnergyAggregate. **Pantalla:** Reportes (pág. 10). **Prioridad:** MVP.

### FR-REP-004 — Reporte últimos 3 meses
- **Descripción:** Tendencia de los últimos 3 meses (kWh y CLP).
- **Actor:** viewer+. **Precondición:** ≥1 bucket `month`.
- **Flujo principal:** Selecciona "últimos 3 meses" → backend devuelve hasta 3 buckets `month` → UI grafica tendencia.
- **Reglas:** si hay menos de 3 meses, muestra los disponibles (no inventa).
- **Criterios de aceptación:** Tendencia de hasta 3 meses con los datos existentes.
- **Dependencias:** FR-REP-003. **Entidades:** EnergyAggregate. **Pantalla:** Reportes (pág. 10b). **Prioridad:** MVP.

### FR-REP-005 — Selección de rango personalizado
- **Descripción:** Permite elegir un rango arbitrario de fechas y la granularidad.
- **Actor:** viewer+. **Precondición:** Agregados en el rango.
- **Flujo principal:** Usuario elige rango/granularidad → backend valida y devuelve serie → UI grafica.
- **Reglas:** rango válido (inicio ≤ fin); granularidad ∈ `hour|day|week|month`.
- **Criterios de aceptación:** Rango válido → serie correcta; rango inválido → validación.
- **Dependencias:** FR-REP-001. **Entidades:** EnergyAggregate. **Pantalla:** Reportes (pág. 10). **Prioridad:** V1.

### FR-REP-006 — Exportación de reportes (CSV)
- **Descripción:** Exporta la serie del reporte a CSV.
- **Actor:** viewer+. **Precondición:** Reporte con datos.
- **Flujo principal:** Usuario solicita exportar → backend genera CSV scoped al tenant → descarga.
- **Reglas:** exportación solo de datos del propio tenant.
- **Criterios de aceptación:** CSV descargable con las filas del rango mostrado.
- **Dependencias:** FR-REP-001. **Entidades:** EnergyAggregate. **Pantalla:** Reportes (pág. 10c). **Prioridad:** V2.

---

## G. BRK — Desglose

### FR-BRK-001 — Consumo por dispositivo
- **Descripción:** Energía por cada `Device` en el periodo.
- **Actor:** viewer+. **Precondición:** Agregados por `device_id`.
- **Flujo principal:** Usuario elige periodo → backend devuelve `energy_kwh`/`cost_clp` por device → UI lista.
- **Reglas:** datos del tenant; device debe pertenecer a la instalación.
- **Criterios de aceptación:** Lista de dispositivos con su kWh en el periodo.
- **Dependencias:** FR-ONB-005. **Entidades:** EnergyAggregate, Device. **Pantalla:** Desglose (pág. 11). **Prioridad:** MVP.

### FR-BRK-002 — Consumo por categoría
- **Descripción:** Energía agrupada por `DeviceCategory` (climatización, refrigeración, etc.).
- **Actor:** viewer+. **Precondición:** Agregados por `category_id`.
- **Flujo principal:** Backend agrupa por categoría → UI muestra por categoría.
- **Reglas:** categoría del catálogo global.
- **Criterios de aceptación:** Consumo por categoría renderizado.
- **Dependencias:** FR-BRK-001. **Entidades:** EnergyAggregate, DeviceCategory. **Pantalla:** Desglose (pág. 11). **Prioridad:** MVP.

### FR-BRK-003 — Proporción porcentual
- **Descripción:** Muestra el % que representa cada dispositivo/categoría sobre el total del periodo.
- **Actor:** viewer+. **Precondición:** Total del periodo > 0.
- **Flujo principal:** Backend calcula % = consumo_item / total → UI muestra (dona/barras).
- **Reglas:** suma de % ≈ 100 (±redondeo); si total=0 → omite.
- **Criterios de aceptación:** Proporciones coherentes que suman ~100%.
- **Dependencias:** FR-BRK-001, FR-BRK-002. **Entidades:** EnergyAggregate. **Pantalla:** Desglose (pág. 11b). **Prioridad:** MVP.

### FR-BRK-004 — Ranking de consumo
- **Descripción:** Ordena dispositivos/categorías de mayor a menor consumo.
- **Actor:** viewer+. **Precondición:** ≥1 item con consumo.
- **Flujo principal:** Backend ordena descendente → UI muestra top N.
- **Reglas:** orden estable por kWh.
- **Criterios de aceptación:** El dispositivo de mayor consumo aparece primero.
- **Dependencias:** FR-BRK-001. **Entidades:** EnergyAggregate, Device. **Pantalla:** Desglose (pág. 11b). **Prioridad:** MVP.

### FR-BRK-005 — Total por periodo
- **Descripción:** Suma total de energía y costo del periodo de desglose.
- **Actor:** viewer+. **Precondición:** Agregados en el periodo.
- **Flujo principal:** Backend suma todos los items → UI muestra total kWh / CLP.
- **Reglas:** el total debe igualar la suma de los items mostrados.
- **Criterios de aceptación:** Total = suma de items (consistencia).
- **Dependencias:** FR-BRK-001. **Entidades:** EnergyAggregate. **Pantalla:** Desglose (pág. 11). **Prioridad:** MVP.

### FR-BRK-006 — Detalle de un dispositivo
- **Descripción:** Vista detallada de un device (serie temporal, picos, estado).
- **Actor:** viewer+. **Precondición:** Device con telemetría/agregados.
- **Flujo principal:** Usuario selecciona un device del desglose → backend devuelve su serie y picos → UI grafica.
- **Reglas:** datos del tenant.
- **Criterios de aceptación:** Detalle del device con su consumo y pico de potencia.
- **Dependencias:** FR-BRK-001. **Entidades:** EnergyAggregate, Device, TelemetryReading. **Pantalla:** Desglose/Detalle (pág. 11c). **Prioridad:** V1.

---

## H. CTRL — Control

### FR-CTRL-001 — Encender dispositivo
- **Descripción:** Ejecuta `turn_on` sobre un device con capacidad `switch`.
- **Actor:** operator, admin, owner.
- **Precondición:** Device con `capabilities.switch=true`; permiso de control.
- **Flujo principal:**
  1. Usuario solicita encender.
  2. Sistema verifica permiso y crea `ControlAction(type='turn_on', status='pending')`.
  3. Envía comando vía iot-bridge/MQTT; registra `AuditLog`.
  4. Al recibir confirmación → `status='success'`, `resolved_at`; emite `control.resolved`.
- **Reglas:** requiere `operator|admin|owner`; toda acción auditada; sin permiso → `rejected`.
- **Criterios de aceptación:** Con permiso → device encendido y acción `success`. Sin permiso → 403 + `ControlAction(status='rejected')` o no creada, y `AuditLog`.
- **Dependencias:** FR-AUTH-009, FR-ONB-005. **Entidades:** ControlAction, Device, AuditLog. **Pantalla:** Control (pág. 17). **Prioridad:** MVP.

### FR-CTRL-002 — Apagar dispositivo
- **Descripción:** Ejecuta `turn_off` sobre un device con `switch`.
- **Actor:** operator, admin, owner. **Precondición:** Device `switch`; permiso.
- **Flujo principal:** Igual a FR-CTRL-001 con `type='turn_off'`.
- **Reglas:** no apagar equipos marcados críticos por acción automática (FR-PROF-005); acción manual permitida con confirmación.
- **Criterios de aceptación:** Con permiso → device apagado y acción `success`.
- **Dependencias:** FR-CTRL-001. **Entidades:** ControlAction, Device, AuditLog. **Pantalla:** Control (pág. 17). **Prioridad:** MVP.

### FR-CTRL-003 — Estado de control del dispositivo
- **Descripción:** Muestra el estado actual (on/off/desconocido) y la última acción.
- **Actor:** viewer+ (ver), operator+ (actuar). **Precondición:** Device con capacidad de control.
- **Flujo principal:** Backend deriva estado de telemetría/última acción → UI lo muestra.
- **Reglas:** estado `unknown` si offline.
- **Criterios de aceptación:** Estado refleja la última acción confirmada / telemetría.
- **Dependencias:** FR-CTRL-001. **Entidades:** Device, ControlAction. **Pantalla:** Control (pág. 17). **Prioridad:** MVP.

### FR-CTRL-004 — Programación horaria
- **Descripción:** Define encendido/apagado programado (`ControlSchedule`).
- **Actor:** operator, admin, owner. **Precondición:** Device `switch`; permiso.
- **Flujo principal:** Usuario define regla (`rule` jsonb: horarios/días, `action`) → sistema valida solapamientos → crea `ControlSchedule(enabled=true, created_by)`.
- **Reglas:** requiere permiso de control; valida solapamientos lógicos; ejecuta acciones que se auditan.
- **Criterios de aceptación:** Programación válida → al cumplirse la regla se genera una `ControlAction` auditada.
- **Dependencias:** FR-CTRL-001. **Entidades:** ControlSchedule, ControlAction, AuditLog. **Pantalla:** Programación (págs. 18–19). **Prioridad:** V1.

### FR-CTRL-005 — Límite de consumo
- **Descripción:** Define un `ConsumptionLimit` (kWh o W) por ventana con pre-alerta y acción al exceder.
- **Actor:** operator, admin, owner. **Precondición:** Device; permiso.
- **Flujo principal:** Usuario define `limit_kwh?`/`limit_power_w?`, `window` (`day|month`), `pre_alert_pct?`, `action_on_exceed` (`alert|turn_off`) → persiste.
- **Reglas:** límites positivos; `pre_alert_pct` 1..100; al exceder genera `Alert` y/o `ControlAction`.
- **Criterios de aceptación:** Al superar el límite → alerta y, si `turn_off`, apagado auditado (salvo equipo crítico).
- **Dependencias:** FR-CTRL-001, FR-ALRT-001. **Entidades:** ConsumptionLimit, Alert, ControlAction. **Pantalla:** Límites (pág. 19b). **Prioridad:** V1.

### FR-CTRL-006 — Alerta previa de límite (pre-alerta)
- **Descripción:** Notifica al acercarse al límite (`pre_alert_pct`) antes de superarlo.
- **Actor:** Sistema. **Precondición:** `ConsumptionLimit` con `pre_alert_pct`.
- **Flujo principal:** Backend evalúa consumo de la ventana → al alcanzar el % → genera `Alert(type='over_budget', severity='warning')` y `Notification`.
- **Reglas:** una pre-alerta por umbral/ventana (evitar spam).
- **Criterios de aceptación:** Al alcanzar el % de pre-alerta → alerta `warning` generada una vez por ventana.
- **Dependencias:** FR-CTRL-005. **Entidades:** ConsumptionLimit, Alert, Notification. **Pantalla:** Límites (pág. 19b). **Prioridad:** V1.

### FR-CTRL-007 — Registro/bitácora de acciones de control
- **Descripción:** Historial auditable de todas las `ControlAction`.
- **Actor:** admin, owner (ver). **Precondición:** Acciones existentes.
- **Flujo principal:** Backend lista `control_actions` + `audit_logs` asociados → UI muestra quién, qué, cuándo y resultado.
- **Reglas:** append-only en `audit_logs`; cada acción de control auditada (invariante de canon).
- **Criterios de aceptación:** Toda acción ejecutada aparece en la bitácora con actor, tipo, estado y timestamps.
- **Dependencias:** FR-CTRL-001. **Entidades:** ControlAction, AuditLog. **Pantalla:** Control/Historial (pág. 17b). **Prioridad:** MVP.

### FR-CTRL-008 — Resolución asíncrona de la acción
- **Descripción:** Actualiza el resultado de una `ControlAction` cuando el device confirma (o falla/timeout).
- **Actor:** Sistema (iot-bridge). **Precondición:** Acción `pending`.
- **Flujo principal:** iot-bridge recibe ACK/NACK o expira timeout → actualiza `status` (`success|failed`), `result`, `resolved_at`; emite `control.resolved`.
- **Reglas:** timeout configurable → `failed`; idempotente ante ACK duplicado.
- **Criterios de aceptación:** ACK → `success`; sin ACK en timeout → `failed` con detalle.
- **Dependencias:** FR-CTRL-001. **Entidades:** ControlAction. **Pantalla:** Control (pág. 17). **Prioridad:** MVP.

### FR-CTRL-009 — Rechazo de control sin permiso
- **Descripción:** Bloquea toda acción de control de un `viewer` (o sin permiso) y la registra.
- **Actor:** viewer (intento). **Precondición:** Rol sin permiso de control.
- **Flujo principal:** viewer intenta control → sistema rechaza con 403 → registra intento en `AuditLog`; no se envía comando al device.
- **Reglas:** control requiere `operator|admin|owner` (invariante de canon).
- **Criterios de aceptación:** viewer → 403, sin comando enviado, intento auditado.
- **Dependencias:** FR-AUTH-009. **Entidades:** ControlAction, AuditLog. **Pantalla:** Control (pág. 17). **Prioridad:** MVP.

---

## I. ALRT — Alertas

### FR-ALRT-001 — Generación de alerta por consumo anómalo
- **Descripción:** Detecta consumo anómalo respecto al patrón histórico/horario y genera `Alert(type='anomaly')`.
- **Actor:** Sistema. **Precondición:** Suficiente historial/telemetría.
- **Flujo principal:** Backend evalúa lecturas/agregados vs baseline → si anómalo → crea `Alert(type='anomaly', severity, status='open')` con `context` → `Notification`; emite `alert.raised`.
- **Reglas:** toda alerta tiene severidad y estado; del tenant.
- **Criterios de aceptación:** Patrón anómalo → alerta `open` con contexto.
- **Dependencias:** FR-DASH-001. **Entidades:** Alert, Notification, TelemetryReading. **Pantalla:** Alertas (pág. 20). **Prioridad:** MVP.

### FR-ALRT-002 — Alerta por dispositivo elevado
- **Descripción:** Detecta un device con consumo/potencia anormalmente alto → `Alert(type='high_device')`.
- **Actor:** Sistema. **Precondición:** Telemetría por device.
- **Flujo principal:** Backend identifica device fuera de su rango típico → crea alerta `high_device` con `device_id` y `estimated_impact_clp?`.
- **Reglas:** impacto CLP solo si hay tarifa/boleta (no inventar).
- **Criterios de aceptación:** Device elevado → alerta con device asociado e impacto si hay tarifa.
- **Dependencias:** FR-ALRT-001. **Entidades:** Alert, Device. **Pantalla:** Alertas (pág. 20). **Prioridad:** MVP.

### FR-ALRT-003 — Alerta de sobreconsumo (over_budget)
- **Descripción:** Genera alerta al superar un presupuesto/límite o proyección de boleta.
- **Actor:** Sistema. **Precondición:** Límite o boleta base / proyección.
- **Flujo principal:** Backend compara consumo acumulado vs presupuesto/proyección → si excede → `Alert(type='over_budget')` con `estimated_impact_clp`.
- **Reglas:** ligada a `ConsumptionLimit` (CTRL-005/006) o a proyección (PROJ).
- **Criterios de aceptación:** Superar el presupuesto → alerta `over_budget` con impacto estimado.
- **Dependencias:** FR-CTRL-005, FR-PROJ-004. **Entidades:** Alert, ConsumptionLimit. **Pantalla:** Alertas (pág. 20). **Prioridad:** V1.

### FR-ALRT-004 — Alerta de dispositivo offline
- **Descripción:** Genera `Alert(type='offline')` cuando un device/kit deja de reportar.
- **Actor:** Sistema. **Precondición:** Device antes online.
- **Flujo principal:** Backend detecta ausencia de telemetría > umbral → `Device.state='offline'` → `Alert(type='offline', severity='warning')`.
- **Reglas:** umbral configurable; una alerta por episodio offline.
- **Criterios de aceptación:** Sin telemetría > umbral → device `offline` + alerta.
- **Dependencias:** FR-DASH-005. **Entidades:** Alert, Device. **Pantalla:** Alertas (pág. 20). **Prioridad:** V1.

### FR-ALRT-005 — Revisión de alerta (estado revisado/no revisado)
- **Descripción:** El usuario marca una alerta como `reviewed` o `dismissed`.
- **Actor:** operator, admin, owner. **Precondición:** Alerta `open`.
- **Flujo principal:** Usuario revisa → `status='reviewed'` (o `dismissed`), `reviewed_by`, `reviewed_at`; emite `alert.reviewed`/`alert.dismissed`.
- **Reglas:** transición desde `open`; el revisor queda registrado.
- **Criterios de aceptación:** Revisar → estado y revisor persistidos; baja el contador del dashboard.
- **Dependencias:** FR-ALRT-001, FR-DASH-006. **Entidades:** Alert, User. **Pantalla:** Alertas (pág. 20). **Prioridad:** MVP.

### FR-ALRT-006 — Severidad y priorización de alertas
- **Descripción:** Clasifica alertas por severidad (`info|warning|critical`) y las prioriza en la UI.
- **Actor:** Sistema + usuario (ver). **Precondición:** Alertas existentes.
- **Flujo principal:** Backend asigna severidad según reglas (p. ej. fuera de horario declarado → mayor severidad) → UI ordena por severidad y estado.
- **Reglas:** severidad obligatoria; coherente con `context`.
- **Criterios de aceptación:** Las `critical` aparecen primero; severidad consistente con el motivo.
- **Dependencias:** FR-ALRT-001, FR-PROF-006. **Entidades:** Alert. **Pantalla:** Alertas (pág. 20). **Prioridad:** V1.

---

## J. REC — Recomendaciones

### FR-REC-001 — Recomendación derivada de alerta
- **Descripción:** Genera una `Recommendation(source='alert')` asociada a una alerta.
- **Actor:** Sistema. **Precondición:** Alerta generada.
- **Flujo principal:** Tras una alerta relevante → backend crea recomendación con `title`, `description`, `alert_id`, `estimated_saving_clp?`; emite `recommendation.created`.
- **Reglas:** sin tarifa/boleta no se calcula impacto CLP (se omite el campo, no se inventa — canon).
- **Criterios de aceptación:** Alerta relevante → recomendación ligada; CLP solo si hay base tarifaria.
- **Dependencias:** FR-ALRT-001. **Entidades:** Recommendation, Alert. **Pantalla:** Recomendaciones (pág. 20). **Prioridad:** MVP.

### FR-REC-002 — Recomendación de análisis periódico
- **Descripción:** Genera recomendaciones de ahorro a partir de análisis periódico de consumo (`source='periodic_analysis'`).
- **Actor:** Sistema. **Precondición:** Historial suficiente.
- **Flujo principal:** Job periódico analiza patrones → crea recomendaciones con impacto estimado si hay tarifa.
- **Reglas:** no duplicar recomendaciones equivalentes activas.
- **Criterios de aceptación:** Análisis periódico → recomendaciones nuevas relevantes sin duplicados.
- **Dependencias:** FR-BRK-001. **Entidades:** Recommendation. **Pantalla:** Recomendaciones (pág. 20). **Prioridad:** V1.

### FR-REC-003 — Impacto estimado en CLP
- **Descripción:** Calcula el ahorro estimado (`estimated_saving_clp`) de aplicar la recomendación.
- **Actor:** Sistema. **Precondición:** Tarifa/boleta base disponible.
- **Flujo principal:** Backend estima ahorro = Δconsumo × precio energía → `estimated_saving_clp`.
- **Reglas:** cálculo en backend; sin tarifa → sin CLP.
- **Criterios de aceptación:** Con tarifa → ahorro CLP estimado; sin tarifa → recomendación sin CLP.
- **Dependencias:** FR-REC-001, FR-BILL-004. **Entidades:** Recommendation, Tariff. **Pantalla:** Recomendaciones (pág. 20). **Prioridad:** V1.

### FR-REC-004 — Estado de la recomendación (new/applied/dismissed)
- **Descripción:** El usuario marca la recomendación como aplicada o descartada.
- **Actor:** operator, admin, owner. **Precondición:** Recomendación `new`.
- **Flujo principal:** Usuario aplica/descarta → `status='applied'|'dismissed'`; emite `recommendation.applied`.
- **Reglas:** transición desde `new`.
- **Criterios de aceptación:** Aplicar/descartar → estado persistido y removida de pendientes.
- **Dependencias:** FR-REC-001. **Entidades:** Recommendation. **Pantalla:** Recomendaciones (pág. 20). **Prioridad:** MVP.

### FR-REC-005 — Priorización de recomendaciones
- **Descripción:** Ordena recomendaciones por `priority` e impacto estimado.
- **Actor:** Sistema + usuario (ver). **Precondición:** ≥1 recomendación.
- **Flujo principal:** Backend ordena por `priority` (y ahorro CLP) → UI muestra primero las de mayor impacto.
- **Reglas:** `priority` entero; orden estable.
- **Criterios de aceptación:** La recomendación de mayor ahorro/prioridad aparece primero.
- **Dependencias:** FR-REC-001, FR-REC-003. **Entidades:** Recommendation. **Pantalla:** Recomendaciones (pág. 20). **Prioridad:** V1.

---

## K. PROJ — Proyecciones

### FR-PROJ-001 — Consumo proyectado del mes
- **Descripción:** Proyecta el consumo (kWh) al cierre del mes a partir del consumo acumulado y patrón.
- **Actor:** viewer+. **Precondición:** Agregados del mes en curso.
- **Flujo principal:** Backend extrapola consumo acumulado del mes → kWh proyectado → UI lo muestra.
- **Reglas:** método de proyección documentado; si datos insuficientes → indica baja confianza.
- **Criterios de aceptación:** Con datos del mes → kWh proyectado al cierre.
- **Dependencias:** FR-DASH-002. **Entidades:** EnergyAggregate. **Pantalla:** Proyecciones (pág. 12). **Prioridad:** V1.

### FR-PROJ-002 — Costo proyectado del mes (CLP)
- **Descripción:** Proyecta el costo (CLP) al cierre del mes aplicando la tarifa.
- **Actor:** viewer+. **Precondición:** Proyección de consumo + tarifa/boleta.
- **Flujo principal:** Backend aplica tarifa al consumo proyectado → CLP proyectado.
- **Reglas:** cálculo en backend; sin tarifa → sin CLP.
- **Criterios de aceptación:** Con tarifa → CLP proyectado; sin tarifa → solo kWh.
- **Dependencias:** FR-PROJ-001, FR-BILL-004. **Entidades:** EnergyAggregate, Tariff. **Pantalla:** Proyecciones (pág. 12). **Prioridad:** V1.

### FR-PROJ-003 — Comparación contra boleta anterior
- **Descripción:** Compara la proyección del mes contra la boleta anterior `confirmed`.
- **Actor:** viewer+. **Precondición:** ≥1 boleta `confirmed`.
- **Flujo principal:** Backend compara CLP/kWh proyectados vs boleta anterior → muestra variación (↑/↓ y %).
- **Reglas:** usa boleta `confirmed`; si no hay boleta → omite comparación.
- **Criterios de aceptación:** Con boleta previa → comparación con %; sin boleta → solo proyección.
- **Dependencias:** FR-PROJ-002, FR-BILL-007. **Entidades:** ElectricityBill, EnergyAggregate. **Pantalla:** Proyecciones (pág. 12b). **Prioridad:** V1.

### FR-PROJ-004 — Riesgo de sobreconsumo
- **Descripción:** Indica el riesgo de superar la boleta anterior o un presupuesto, con nivel de riesgo.
- **Actor:** viewer+. **Precondición:** Proyección + base (boleta/límite).
- **Flujo principal:** Backend evalúa proyección vs base → nivel de riesgo (bajo/medio/alto) → puede disparar `Alert(type='over_budget')` (FR-ALRT-003).
- **Reglas:** umbrales de riesgo documentados.
- **Criterios de aceptación:** Proyección que supera la base → riesgo alto y alerta opcional.
- **Dependencias:** FR-PROJ-003, FR-ALRT-003. **Entidades:** EnergyAggregate, ElectricityBill, Alert. **Pantalla:** Proyecciones (pág. 12b). **Prioridad:** V1.

### FR-PROJ-005 — Proyección por dispositivo/categoría
- **Descripción:** Proyecta el consumo de los principales dispositivos/categorías al cierre del mes.
- **Actor:** viewer+. **Precondición:** Agregados por device/categoría.
- **Flujo principal:** Backend extrapola por device/categoría → UI muestra proyección desglosada.
- **Reglas:** consistente con la proyección total (FR-PROJ-001).
- **Criterios de aceptación:** Suma de proyecciones por item ≈ proyección total.
- **Dependencias:** FR-PROJ-001, FR-BRK-001. **Entidades:** EnergyAggregate, Device, DeviceCategory. **Pantalla:** Proyecciones (pág. 12c). **Prioridad:** V2.

---

## L. SET — Ajustes

### FR-SET-001 — Ajustes de perfil de usuario
- **Descripción:** Editar `full_name`, `phone`, `locale`.
- **Actor:** Cualquier usuario autenticado (sobre sí mismo). **Precondición:** Sesión.
- **Flujo principal:** Usuario edita sus datos → sistema valida y persiste.
- **Reglas:** un usuario solo edita su propio perfil (salvo gestión por admin/owner).
- **Criterios de aceptación:** Cambios guardados y reflejados.
- **Dependencias:** FR-AUTH-002. **Entidades:** User. **Pantalla:** Ajustes/Perfil (pág. 21). **Prioridad:** MVP.

### FR-SET-002 — Ajustes de instalación
- **Descripción:** Editar datos de la `Installation` (nombre, dirección, zona horaria, estado).
- **Actor:** admin, owner. **Precondición:** Instalación existente.
- **Flujo principal:** Usuario edita → persiste; cambios sensibles → `AuditLog`.
- **Reglas:** requiere `admin|owner`.
- **Criterios de aceptación:** Cambios guardados; activar/inactivar instalación respetado.
- **Dependencias:** FR-ONB-008. **Entidades:** Installation, AuditLog. **Pantalla:** Ajustes/Instalación (pág. 21a). **Prioridad:** MVP.

### FR-SET-003 — Ajustes de dispositivos
- **Descripción:** Renombrar, categorizar, habilitar/retirar dispositivos y kits.
- **Actor:** admin, owner. **Precondición:** Devices/kits existentes.
- **Flujo principal:** Usuario edita device (nombre/categoría) o retira kit → persiste; retiro → `AuditLog`.
- **Reglas:** retirar kit → `status='retired'` (soft) sin borrar telemetría histórica.
- **Criterios de aceptación:** Cambios de dispositivo guardados; kit retirado deja de aceptar telemetría nueva.
- **Dependencias:** FR-ONB-005. **Entidades:** Device, EnergyKit, DeviceCategory, AuditLog. **Pantalla:** Ajustes/Dispositivos (pág. 21b). **Prioridad:** MVP.

### FR-SET-004 — Ajustes de tarifa/distribuidora
- **Descripción:** Asociar/editar la `Tariff` y `Distributor` de la instalación.
- **Actor:** admin, owner. **Precondición:** Catálogo de distribuidoras/tarifas.
- **Flujo principal:** Usuario selecciona distribuidora y tarifa para la instalación → persiste `distributor_id`, `tariff_id`.
- **Reglas:** afecta el cálculo de costos en backend; cambio queda registrado (`installation.tariff_assigned`).
- **Criterios de aceptación:** Tras asignar tarifa, los costos CLP del dashboard usan la nueva tarifa.
- **Dependencias:** FR-BILL-004. **Entidades:** Installation, Tariff, Distributor. **Pantalla:** Ajustes/Tarifa (pág. 21e). **Prioridad:** MVP.

### FR-SET-005 — Ajustes de notificaciones
- **Descripción:** Configurar canales y preferencias de notificación (`in_app|email|push`).
- **Actor:** Cualquier usuario autenticado. **Precondición:** Sesión.
- **Flujo principal:** Usuario activa/desactiva canales y tipos de evento → persiste preferencias.
- **Reglas:** preferencias por usuario; alertas críticas pueden forzar al menos un canal.
- **Criterios de aceptación:** Las notificaciones respetan los canales habilitados.
- **Dependencias:** FR-AUTH-002. **Entidades:** Notification, User. **Pantalla:** Ajustes/Notificaciones (pág. 21f). **Prioridad:** V1.

### FR-SET-006 — Ajustes de seguridad
- **Descripción:** Cambio de contraseña, ver sesiones activas, cerrar sesiones, (futuro) MFA.
- **Actor:** Cualquier usuario autenticado. **Precondición:** Sesión.
- **Flujo principal:** Usuario cambia contraseña (FR-AUTH-010), revisa/cierra sesiones.
- **Reglas:** acciones sensibles → `AuditLog`.
- **Criterios de aceptación:** Cerrar todas las sesiones invalida los refresh tokens.
- **Dependencias:** FR-AUTH-010. **Entidades:** User, AuditLog. **Pantalla:** Ajustes/Seguridad (pág. 21d). **Prioridad:** MVP.

### FR-SET-007 — Gestión de usuarios y roles (acceso)
- **Descripción:** Punto de entrada a invitar/gestionar usuarios y roles desde Ajustes.
- **Actor:** admin, owner. **Precondición:** Permiso de gestión.
- **Flujo principal:** Usuario accede a la gestión (FR-AUTH-006/007/008).
- **Reglas:** requiere `admin|owner`.
- **Criterios de aceptación:** Acceso visible solo para admin/owner.
- **Dependencias:** FR-AUTH-006. **Entidades:** Membership, User. **Pantalla:** Ajustes/Usuarios (pág. 21c). **Prioridad:** V1.

### FR-SET-008 — Gestión de plan SaaS
- **Descripción:** Ver/cambiar el `plan` de la organización (`free|pro|enterprise`).
- **Actor:** owner. **Precondición:** Ser owner.
- **Flujo principal:** Owner ve el plan actual y solicita cambio → emite `organization.plan_changed`; cambio auditado.
- **Reglas:** solo `owner`; cambios de plan auditados.
- **Criterios de aceptación:** Solo el owner puede cambiar el plan; el cambio queda registrado.
- **Dependencias:** FR-AUTH-001. **Entidades:** Organization, AuditLog. **Pantalla:** Ajustes/Plan (pág. 21g). **Prioridad:** V2.

---

## Matriz de trazabilidad (FR → entidad → pantalla)

| FR | Entidad principal | Pantalla |
|---|---|---|
| FR-AUTH-001..010 | User, Organization, Membership | Registro/Login/Ajustes (págs. 1–2, 21) |
| FR-ONB-001..010 | EnergyKit, DevicePairing, Device, Installation | Escaneo/Emparejamiento/Tipo (págs. 3–5) |
| FR-PROF-001..007 | InstallationProfile, Installation | Perfil (págs. 5–7) |
| FR-BILL-001..008 | ElectricityBill, Distributor, Tariff | Boleta (pág. 8) |
| FR-DASH-001..007 | TelemetryReading, EnergyAggregate, Device, Alert | Dashboard (pág. 9) |
| FR-REP-001..006 | EnergyAggregate | Reportes (pág. 10) |
| FR-BRK-001..006 | EnergyAggregate, Device, DeviceCategory | Desglose (pág. 11) |
| FR-CTRL-001..009 | ControlAction, ControlSchedule, ConsumptionLimit, AuditLog | Control/Programación (págs. 17–19) |
| FR-ALRT-001..006 | Alert, Notification | Alertas (pág. 20) |
| FR-REC-001..005 | Recommendation | Recomendaciones (pág. 20) |
| FR-PROJ-001..005 | EnergyAggregate, ElectricityBill | Proyecciones (pág. 12) |
| FR-SET-001..008 | User, Installation, Device, Tariff, Organization | Ajustes (pág. 21) |

**Total FR: 87** (AUTH 10, ONB 10, PROF 7, BILL 8, DASH 7, REP 6, BRK 6, CTRL 9, ALRT 6, REC 5, PROJ 5, SET 8).
