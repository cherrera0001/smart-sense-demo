# Estrategia de Estado — Frontend SmartSense

> Deriva de `specs/05-frontend/{screens,components,routes}.md`, `specs/_canon.md`, `specs/01-requirements/non-functional-requirements.md` (NFR-018 resiliencia, NFR-022 live p95 ≤ 2s) y `specs/04-api/openapi.yaml`.
> Stack: **React Query** para server state (datos remotos) · **Zustand** para UI state (estado de cliente efímero/persistente). Nada de cálculo de costos en cliente (canon: CLP siempre backend).

## 1. Principio de separación

| Tipo de estado | Herramienta | Ejemplos |
|---|---|---|
| **Server state** (proviene de la API, cacheable, sincronizable) | React Query | telemetría/dashboard, reportes, desglose, devices, alertas, recomendaciones, boletas, control-state, perfil/instalación |
| **UI state** (vive solo en cliente) | Zustand | sesión/tokens en memoria, **instalación activa**, paso del wizard de onboarding, filtros de rango/agrupación, estado de conectividad, toggles de UI |

Regla: si el dato puede provenir del servidor y debe invalidarse/refetcharse, es **server state** (React Query). Si describe cómo se ve la UI o qué seleccionó el usuario, es **UI state** (Zustand).

## 2. React Query — server state

### 2.1 Configuración base
- `QueryClient` global en `app/layout.tsx`.
- Defaults: `retry: 2` (excepto 4xx no reintentables: 401/403/404/409/422 → `retry: false`), `refetchOnWindowFocus: true` para listas frescas, `gcTime` (cacheTime) 5 min.
- Errores 401 → handler global: intenta `refresh` (FR-AUTH-003); si falla → purga estado y redirige a `/login`.
- Offline (NFR-018): `networkMode: 'offlineFirst'` → sirve caché stale y muestra `OfflineBanner`; las mutaciones se bloquean (no se encolan ciegamente salvo control con optimistic, ver §6).

### 2.2 Convención de query keys (scoped por instalación)
Toda key de recurso de instalación lleva la `installationId` activa para aislamiento multi-tenant y para invalidación al cambiar de instalación:

```
['installations']                                   // listado del tenant
['installation', installationId]
['dashboard', installationId]
['telemetry','latest', installationId]
['telemetry','range', installationId, {from,to}]
['reports', installationId, granularity, {from,to}]
['breakdown', installationId, {groupBy, from, to}]
['devices', installationId, {state?}]
['device', deviceId]
['control-state', deviceId]
['control-actions', deviceId]                        // bitácora
['alerts', installationId, {status,severity,type}]
['recommendations', installationId]
['bills', installationId, {status?}]
['projections', installationId, {month}]
['onboarding-status', installationId]
['me']                                               // user + memberships
```

La `installationId` proviene de Zustand (`activeInstallationId`); al cambiarla, las keys cambian y React Query refetchea solo lo visible.

### 2.3 staleTime por tipo de dato

| Query | staleTime | Refetch / live | FR / endpoint |
|---|---|---|---|
| `me` | 15 min | on demand | `authMe` |
| `installations` / `installation` | 5 min | tras PATCH | `listInstallations`/`getInstallation` |
| `onboarding-status` | 0 (siempre fresco) | tras cada paso | `onboardingStatus` |
| `dashboard` | 30 s base | **WebSocket** patch en vivo (NFR-022) | `getDashboard` |
| `telemetry/latest` | 15 s | WebSocket | `latestTelemetry` |
| `telemetry/range` | 5 min | manual | `rangeTelemetry` |
| `reports/*` | 5 min | manual | `report*` |
| `breakdown` | 2 min | manual | `getBreakdown` |
| `devices` | 1 min | WebSocket (estado) + invalidación post-control | `listDevices` |
| `control-state` | 10 s | WebSocket `control.resolved` | `getControlState` |
| `control-actions` (bitácora) | 30 s | invalidación post-acción | historial |
| `alerts` | 30 s | WebSocket `alert.raised` | `listAlerts` |
| `recommendations` | 2 min | tras nueva alerta | `listRecommendations` |
| `bills` | 5 min | tras crear/confirmar | `listBills` |
| `projections` | 5 min | manual | derivado backend |

### 2.4 Live vía WebSocket (NFR-022)
- Un único cliente WebSocket por instalación activa (suscrito a eventos del tenant: `telemetry`, `device.state`, `control.resolved`, `alert.raised`).
- El handler **no** crea un store paralelo: aplica `queryClient.setQueryData` sobre las keys afectadas (`dashboard`, `telemetry/latest`, `control-state`, `devices`, `alerts`), manteniendo React Query como única fuente de verdad y respetando p95 ≤ 2s.
- Pérdida de conexión WebSocket → `connectivity.live=false` en Zustand → `OfflineBanner`/marca "sin datos en vivo" en `ConsumptionGauge` (los snapshots cacheados siguen visibles, NFR-018).

## 3. Zustand — UI state

Stores pequeños y enfocados (SOLID, evitar god-store):

### 3.1 `authStore`
- `accessToken` (en memoria), `status: 'authenticated'|'anonymous'`, `user` mínima.
- Persistencia: **access token solo en memoria**; refresh manejado vía cookie httpOnly/secure por el backend (secrets nunca en frontend, canon). No persistir tokens en `localStorage`.

### 3.2 `tenantStore` (instalación/tenant activo)
- `activeOrganizationId`, `activeInstallationId`, `activeSegment` (`home|smb|business`).
- `setActiveInstallation(id)` → actualiza estado; las query keys dependientes recomponen y refetchean. Persistido en `localStorage` (no sensible) para recordar la última instalación.
- Maneja multi-tenant: el `InstallationSwitcher` (header) escribe aquí; ninguna query usa una `installationId` ajena al tenant (aislamiento canon).

### 3.3 `onboardingStore` (wizard)
- `currentStep`, `completedSteps[]`, datos parciales del wizard (`kit`, `pairedDevices`, `segment`, `profileDraft`, `billDraft`).
- Persistido para permitir reanudar (FR-ONB-007); se reconcilia contra `onboarding-status` (server) al entrar: el server es autoridad sobre qué pasos están realmente completos.
- Se limpia al completar el onboarding.

### 3.4 `filtersStore` (UI de reportes/desglose/alertas)
- `reportRange {granularity, from, to}`, `breakdownGroupBy`, `alertFilters {status,severity,type}`, `metricToggle`.
- No persistido (efímero por sesión de navegación). Alimenta las query keys de `reports`/`breakdown`/`alerts`.

### 3.5 `connectivityStore`
- `online` (navegador), `live` (WebSocket). Alimenta `OfflineBanner` y la degradación de live.

## 4. Manejo de tenant / instalación activa

1. Tras login, `me` provee orgs/memberships; `installations` lista instalaciones del tenant.
2. Si hay una sola instalación → se fija como activa automáticamente; si hay varias → `InstallationSwitcher`.
3. `activeInstallationId` (Zustand) se inyecta en todas las query keys de recursos de instalación.
4. Cambio de instalación → `tenantStore.setActiveInstallation` → las queries con la key antigua quedan inactivas y se montan las nuevas; opcionalmente `queryClient.removeQueries({ predicate })` para liberar caché de la instalación previa.
5. El backend revalida tenant en cada request (403/404 cross-tenant); el cliente nunca asume acceso por tener la id en caché.

## 5. Invalidación tras acciones de control

Tras una mutación de control/escritura se invalidan las keys afectadas (o se aplican patches por WebSocket):

| Mutación | operationId | Invalida / patch |
|---|---|---|
| Encender/apagar | `createControlAction` | optimistic en `control-state`/`devices`; al `control.resolved` (WS) confirma; invalida `control-actions` (bitácora) y `dashboard` |
| Crear horario | `createControlSchedule` | invalida lista de schedules del device |
| Crear límite | `createConsumptionLimit` | invalida límites del device; puede generar futura `alert` (no invalidar alerts hasta evento) |
| Revisar alerta | `reviewAlert` | invalida `alerts` y `dashboard` (badge `open` baja, FR-DASH-006) |
| Aplicar/descartar recomendación | (REC) | invalida `recommendations` |
| Confirmar boleta | `createBill`/confirm | invalida `bills`, `dashboard` y `reports`/`projections` (habilita CLP) |
| Editar instalación/tarifa | `updateInstallation` | invalida `installation`, `dashboard`, `reports`, `projections` (recalcula CLP backend) |
| Renombrar/categorizar device | `updateDevice` | invalida `devices`, `breakdown` |

## 6. Optimistic updates en control (FR-CTRL-001/002/008)

`ControlToggle` usa el patrón optimistic de React Query:

1. `onMutate`: snapshot de `['control-state', deviceId]`; set optimista a `pending` con el estado objetivo (on/off).
2. POST `createControlAction` → backend responde **202** (`ControlAction status=pending`, resuelve async).
3. Confirmación real llega por **WebSocket** `control.resolved`:
   - `success` → `setQueryData` estado final; invalida bitácora.
   - `failed`/timeout → **rollback** al snapshot + `ErrorState`/toast con detalle.
4. `onError` (red/403): rollback inmediato; `viewer` (403) → toggle deshabilitado, intento auditado en backend (FR-CTRL-009).
5. Idempotencia: la mutación envía `Idempotency-Key` (UUID) para reintentos seguros (`POST /devices/{deviceId}/control-actions`, OpenAPI §9).

Solo el control usa optimistic; el resto de escrituras (boletas, perfil, ajustes) usan flujo pesimista (esperar 2xx → invalidar) por no requerir feedback sub-segundo.

## 7. Manejo offline (NFR-018)

- **Lecturas:** React Query sirve la última caché (stale) y `OfflineBanner` lo señaliza; las pantallas renderizan con empty/stale state, nunca rotas.
- **Live:** WebSocket caído → `connectivity.live=false`; gauges/valores en vivo se marcan "sin conexión en vivo" mostrando el último snapshot.
- **Escrituras:** bloqueadas mientras `online=false` (botones deshabilitados). El control NO se encola en background para evitar acciones físicas tardías inseguras sobre dispositivos; al recuperar conexión el usuario re-ejecuta explícitamente.
- **Onboarding:** escaneo QR funciona local; claim/pair requieren red (se difiere con mensaje claro).

## 8. Resumen de decisiones

- Fuente única de verdad de datos remotos: **React Query**; WebSocket parchea su caché, no crea estado paralelo.
- Tenant/instalación activa en **Zustand**, inyectado en todas las query keys → aislamiento multi-tenant y refetch limpio al cambiar.
- CLP y proyecciones nunca se calculan en cliente; el frontend solo renderiza y muestra "tarifa pendiente" cuando `tariff_configured=false`.
- Optimistic updates acotados a control, con rollback por evento real y `Idempotency-Key`.
- Resiliencia (NFR-018): empty/error/offline cubiertos por `EmptyState`/`ErrorState`/`OfflineBanner` en todas las pantallas.
