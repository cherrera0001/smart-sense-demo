# Rutas — Next.js App Router (apps/web)

> Deriva de `specs/05-frontend/information-architecture.md`, `specs/01-requirements/functional-requirements.md` y `specs/04-api/openapi.yaml`.
> Convención: rutas en App Router (`app/`), agrupadas por **route groups** que no afectan la URL. Endpoints referenciados por su `operationId` / path del OpenAPI 3.1.
> `Auth`: si requiere access token. `MVP`: incluido en el alcance mínimo (canon §Prioridades).

## 1. Route groups y layouts compartidos

| Route group | Carpeta | Layout | Shell | Propósito |
|---|---|---|---|---|
| `(auth)` | `app/(auth)/` | `app/(auth)/layout.tsx` | Layout minimal centrado (logo + card), sin sidebar | Login, registro, recuperación |
| `(onboarding)` | `app/(onboarding)/` | `app/(onboarding)/layout.tsx` | Layout con **stepper** de progreso (FR-ONB-007), sin sidebar | Wizard lineal de alta |
| `(app)` | `app/(app)/` | `app/(app)/layout.tsx` | Shell con **sidebar lateral (8 módulos)** + header (selector instalación, badge alertas, menú usuario) | Operación diaria autenticada |

Layouts adicionales:
- `app/layout.tsx` (root): providers globales — React Query `QueryClientProvider`, Zustand hydration boundary, Tailwind base, `lang="es-CL"`.
- `app/(app)/[no segment]/layout.tsx`: no se usa segmento dinámico de instalación en la URL; la instalación activa vive en estado (Zustand) y se inyecta en las query keys. Las rutas son estáticas y limpias (`/dashboard`, no `/installations/{id}/dashboard`).

Decisión de diseño (documentada): **la `installationId` NO va en la URL del shell**; se resuelve desde el selector de instalación activa (header) y se compone hacia los endpoints `/installations/{installationId}/...`. Esto mantiene URLs estables y evita drift al cambiar de instalación. Excepción: el detalle de device usa query param (`/breakdown?device={id}`).

## 2. Tabla de rutas

| Ruta | Route group / Layout | Auth | Endpoints consumidos (operationId · método path) | FR asociado | MVP |
|---|---|:--:|---|---|:--:|
| `/login` | `(auth)` | No | `authLogin` · POST `/auth/login` · luego `authMe` · GET `/auth/me` | FR-AUTH-002 | ✔ |
| `/register` | `(auth)` | No | `authRegister` · POST `/auth/register` (crea user+org owner) | FR-AUTH-001 | ✔ |
| `/forgot-password` | `(auth)` | No | (V1) password reset request/confirm | FR-AUTH-005 | ✘ (V1) |
| `/onboarding/scan-kit` | `(onboarding)` | Sí | `scanKit` · POST `/onboarding/kit/scan`; `claimKit` · POST `/onboarding/kit/claim`; (apoyo) `createInstallation` · POST `/installations`; `onboardingStatus` · GET `/onboarding/status` | FR-ONB-001/002 (+008) | ✔ |
| `/onboarding/pair-devices` | `(onboarding)` | Sí | `pairDevice` · POST `/onboarding/devices/pair`; `listDevices` · GET `/installations/{installationId}/devices`; live pairing vía WebSocket | FR-ONB-003/004/005 | ✔ |
| `/onboarding/installation-type` | `(onboarding)` | Sí | `createInstallation` · POST `/installations`; `updateInstallation` · PATCH `/installations/{id}` (set `segment`) | FR-ONB-006/008 | ✔ |
| `/onboarding/profile/home` | `(onboarding)` | Sí | `updateInstallation` · PATCH `/installations/{id}` (perfil `home`) | FR-PROF-001/002 | ✔ |
| `/onboarding/profile/smb` | `(onboarding)` | Sí | `updateInstallation` · PATCH `/installations/{id}` (perfil `smb`) | FR-PROF-001/003 | ✔ |
| `/onboarding/profile/business` | `(onboarding)` | Sí | `updateInstallation` · PATCH `/installations/{id}` (perfil `business`) | FR-PROF-001/004 | ✔ |
| `/onboarding/bill-upload` | `(onboarding)` | Sí | `createBill` · POST `/installations/{installationId}/bills`; `listBills` · GET (estado) | FR-BILL-001..007 | ✔ |
| `/dashboard` | `(app)` | Sí | `getDashboard` · GET `/installations/{installationId}/dashboard`; `listAlerts` (badge); live vía WebSocket | FR-DASH-001..007 | ✔ |
| `/reports` | `(app)` | Sí | `reportDaily` / `reportWeekly` / `reportMonthly` / `reportLastThreeMonths` · GET `/installations/{installationId}/reports/{granularidad}` | FR-REP-001..006 | ✔ (export CSV V2) |
| `/breakdown` | `(app)` | Sí | `getBreakdown` · GET `/installations/{installationId}/breakdown?groupBy=device|category`; (detalle) `rangeTelemetry` · GET `/installations/{installationId}/telemetry/range` | FR-BRK-001..006 | ✔ (detalle V1) |
| `/control` | `(app)` | Sí | `listDevices` · GET `/installations/{installationId}/devices`; `getControlState` · GET `/devices/{deviceId}/control-state`; `createControlAction` · POST `/devices/{deviceId}/control-actions` | FR-CTRL-001/002/003/007/008/009 | ✔ |
| `/alerts` | `(app)` | Sí | `listAlerts` · GET `/installations/{installationId}/alerts`; `reviewAlert` · PATCH `/alerts/{id}/review`; `listRecommendations` · GET `/installations/{installationId}/recommendations` | FR-ALRT-001..006, FR-REC-001..005 | ✔ |
| `/projections` | `(app)` | Sí | (V1) proyección sobre `reportMonthly` + boleta `confirmed` vía `listBills`; el cálculo es backend | FR-PROJ-001..005 | ✘ (V1) |
| `/smart-control` | `(app)` | Sí | `createControlSchedule` · POST `/devices/{deviceId}/control-schedules`; `createConsumptionLimit` · POST `/devices/{deviceId}/consumption-limits`; `listDevices` (selección) | FR-CTRL-004/005/006 | ✘ (V1) |
| `/settings` | `(app)` | Sí | `authMe`; `updateInstallation` · PATCH `/installations/{id}`; `updateDevice` · PATCH `/devices/{id}`; (V1) gestión usuarios/roles; (V2) plan | FR-SET-001..008, FR-AUTH-006/007/008/010 | ✔ (núcleo: perfil, instalación, dispositivos, tarifa, seguridad) |

## 3. Estructura `app/` (referencia)

```
app/
├── layout.tsx                         # providers (React Query, Zustand, Tailwind)
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx       # V1
├── (onboarding)/
│   ├── layout.tsx                     # stepper FR-ONB-007
│   └── onboarding/
│       ├── scan-kit/page.tsx
│       ├── pair-devices/page.tsx
│       ├── installation-type/page.tsx
│       ├── profile/
│       │   ├── home/page.tsx
│       │   ├── smb/page.tsx
│       │   └── business/page.tsx
│       └── bill-upload/page.tsx
└── (app)/
    ├── layout.tsx                     # sidebar 8 módulos + header
    ├── dashboard/page.tsx
    ├── reports/page.tsx
    ├── breakdown/page.tsx             # detalle device via ?device=
    ├── control/page.tsx
    ├── alerts/page.tsx
    ├── projections/page.tsx           # V1
    ├── smart-control/page.tsx         # V1
    └── settings/page.tsx              # secciones por #ancla / tabs
```

## 4. Reglas de protección de rutas

- `(auth)`: públicas. Si hay sesión válida → redirigir a `/dashboard` (o al paso de onboarding pendiente).
- `(onboarding)` y `(app)`: requieren access token. Middleware (`middleware.ts`) valida presencia de sesión; el guard fino de onboarding usa `GET /onboarding/status`.
- Entrada a `(app)` con onboarding incompleto → redirige al paso pendiente del wizard.
- Acciones de control en `/control` y `/smart-control` requieren rol `operator|admin|owner` (FR-AUTH-009); para `viewer` se renderizan deshabilitadas y el backend devuelve 403 (FR-CTRL-009).
- Secciones de `/settings` (usuarios, instalación, tarifa, plan) se muestran según rol; el backend revalida (403/404 cross-tenant).

## 5. Rendering (SSR/CSR)

- `(auth)`: server components para el shell estático; formularios como client components (mutaciones React Query).
- `(onboarding)` y `(app)`: client components dominantes por el alto componente interactivo y live (WebSocket). Datos iniciales pueden prefetcharse en server component (React Query hydration) cuando la `installationId` ya es conocida; el dashboard en vivo siempre hidrata en cliente para suscribir el WebSocket (NFR-022).
