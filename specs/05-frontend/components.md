# Catálogo de Componentes — Frontend SmartSense

> Deriva de `specs/05-frontend/screens.md`, `routes.md` y `specs/04-api/openapi.yaml`.
> Stack: Next.js App Router + TypeScript + Tailwind + React Query + Zustand; gráficos **Recharts**.
> Convenciones: componentes de presentación reciben datos por props (tontos); los conectados consumen hooks de React Query/Zustand. Texto en `es-CL`. Dinero CLP formateado con `Intl.NumberFormat('es-CL')`; nunca se calcula CLP en cliente (canon).

## 1. Métricas y visualización energética

### ConsumptionGauge
- **Propósito:** mostrar la potencia activa en vivo (W/kW) como medidor.
- **Props:** `value: number | null`, `unit: 'W'|'kW'`, `hasLiveData: boolean`, `loading?: boolean`.
- **Estado:** stateless; valor desde React Query/WebSocket del dashboard.
- **Dónde se usa:** `/dashboard`.
- **Dependencias:** Recharts (RadialBar) o gauge custom. `value=null` → "sin datos en vivo".

### CostCard
- **Propósito:** tarjeta de costo estimado (CLP) del día/periodo.
- **Props:** `costClp: number | null`, `tariffConfigured: boolean`, `period: 'day'|'month'`, `loading?: boolean`.
- **Estado:** stateless.
- **Dónde se usa:** `/dashboard`, `/projections`.
- **Dependencias:** `Intl.NumberFormat`. `costClp=null`/`!tariffConfigured` → CTA "configura tarifa/boleta" (no inventa valor).

### ComparisonBadge
- **Propósito:** mostrar variación % (↑/↓) vs periodo anterior o boleta previa.
- **Props:** `deltaPct: number | null`, `direction: 'up'|'down'|'flat'`, `label?: string`.
- **Estado:** stateless.
- **Dónde se usa:** `/dashboard` (FR-DASH-004), `/projections` (FR-PROJ-003).
- **Dependencias:** —. `deltaPct=null` → no renderiza (omite comparación).

### MetricToggle / SegmentedControl
- **Propósito:** alternar métrica (kWh/CLP) o agrupación (device/categoría).
- **Props:** `options: {value,label}[]`, `value`, `onChange`.
- **Estado:** controlado por el padre; selección reflejada en filtros UI (Zustand).
- **Dónde se usa:** `/reports`, `/breakdown`.

## 2. Gráficos (Recharts)

### ReportChart
- **Propósito:** serie temporal de consumo/costo por bucket.
- **Props:** `data: {bucketStart, energyKwh, costClp|null}[]`, `metric: 'kwh'|'clp'`, `granularity`, `loading?`.
- **Dónde se usa:** `/reports` (FR-REP-001..005).
- **Dependencias:** Recharts (LineChart/BarChart, XAxis tiempo, Tooltip es-CL).

### DeviceBreakdownChart
- **Propósito:** proporción por dispositivo/categoría (dona/barras).
- **Props:** `items: {label, energyKwh, costClp|null, pct}[]`, `mode: 'donut'|'bar'`, `total`.
- **Dónde se usa:** `/breakdown` (FR-BRK-001..005).
- **Dependencias:** Recharts (PieChart/BarChart). `total=0` → delega a `EmptyState`.

### ProjectionChart
- **Propósito:** consumo real vs proyectado al cierre de mes.
- **Props:** `actual: Point[]`, `projected: Point[]`, `confidence?: 'low'|'med'|'high'`, `metric`.
- **Dónde se usa:** `/projections` (FR-PROJ-001/002).
- **Dependencias:** Recharts (ComposedChart: línea real + área/línea proyectada punteada).

## 3. Dispositivos y control

### DeviceCard
- **Propósito:** tarjeta de dispositivo con estado y acceso a control/detalle.
- **Props:** `device: {id, name, category, state}`, `pairingStatus?`, `children?` (slot toggle).
- **Estado:** stateless; estado de conexión desde React Query.
- **Dónde se usa:** `/onboarding/pair-devices`, `/control`, `/breakdown`.
- **Dependencias:** `KitStatusIndicator`/`PairingStatusBadge`, `SeverityBadge` reuse.

### ControlToggle
- **Propósito:** interruptor on/off de un device con feedback optimista y estado `pending`.
- **Props:** `deviceId`, `state: 'on'|'off'|'unknown'`, `disabled` (rol/offline), `onToggle`.
- **Estado:** **optimistic update** (ver `state-management.md`); muestra `pending` hasta `control.resolved`; rollback en `failed`.
- **Dónde se usa:** `/control` (FR-CTRL-001/002/003/008/009).
- **Dependencias:** React Query mutation; `ConfirmDialog` al apagar; deshabilitado para `viewer` (FR-AUTH-009).

### ScheduleEditor
- **Propósito:** editar reglas de programación horaria (`rule` jsonb: días/horarios + acción) y horarios de operación de perfil.
- **Props:** `value: ScheduleRule`, `onChange`, `mode: 'control'|'operating-hours'`.
- **Estado:** form local; validación de solapamientos e inicio<fin.
- **Dónde se usa:** `/smart-control` (FR-CTRL-004), perfiles smb/business (FR-PROF-006).
- **Dependencias:** —.

### ConsumptionLimitForm
- **Propósito:** definir un `ConsumptionLimit` por device.
- **Props:** `deviceId`, `value: {limitKwh?, limitPowerW?, window, preAlertPct?, actionOnExceed}`, `isCritical: boolean`, `onSubmit`.
- **Estado:** form local.
- **Dónde se usa:** `/smart-control` (FR-CTRL-005/006).
- **Dependencias:** límites positivos; `preAlertPct` 1..100; bloquea `turn_off` si `isCritical` (FR-PROF-005).

### CriticalEquipmentList
- **Propósito:** listar/editar equipos críticos (`critical_equipment` jsonb).
- **Props:** `value`, `onChange`.
- **Dónde se usa:** perfiles smb/business (FR-PROF-005).

### KitStatusIndicator / PairingStatusBadge
- **Propósito:** mostrar estado del kit/device (`online|offline|unknown`) y `pairing_status`.
- **Props:** `status`, `lastSeenAt?`.
- **Dónde se usa:** `/dashboard`, `/onboarding/*`, `/control`, `/settings`.

### ControlActionLog
- **Propósito:** bitácora de `control_actions` (quién/qué/cuándo/resultado).
- **Props:** `actions: ControlAction[]`, `loading?`.
- **Dónde se usa:** `/control` (FR-CTRL-007). Append-only, solo lectura.

## 4. Alertas y recomendaciones

### AlertList / AlertItem
- **Propósito:** lista priorizada de alertas; ítem con severidad, tipo, contexto y acciones.
- **Props (List):** `alerts: Alert[]`, `loading?`. **Props (Item):** `alert`, `canReview: boolean`, `onReview`.
- **Estado:** orden por severidad (critical→info) y estado.
- **Dónde se usa:** `/alerts` (FR-ALRT-001..006); resumen en `/dashboard`.
- **Dependencias:** `SeverityBadge`, `ReviewActions`.

### SeverityBadge
- **Propósito:** chip de severidad `info|warning|critical`.
- **Props:** `severity`.

### RecommendationCard
- **Propósito:** tarjeta de recomendación con impacto estimado y acciones aplicar/descartar.
- **Props:** `recommendation: {title, description, priority, estimatedSavingClp?, status}`, `canAct`, `onApply`, `onDismiss`.
- **Dónde se usa:** `/alerts` (FR-REC-001..005). `estimatedSavingClp=null` → oculta CLP (no inventa).

### AlertSummaryCard
- **Propósito:** resumen/contador de alertas `open` con enlace a `/alerts`.
- **Props:** `openCount`, `topSeverity`.
- **Dónde se usa:** `/dashboard` (FR-DASH-006).

## 5. Selección de tiempo y filtros

### TimeRangeSelector
- **Propósito:** elegir granularidad (`day|week|month|last-three-months`) y rango personalizado (V1).
- **Props:** `value`, `onChange`, `allowCustom?`.
- **Estado:** sincroniza filtro en Zustand (UI state).
- **Dónde se usa:** `/reports`, `/breakdown`.
- **Dependencias:** validación `from<=to`.

### AlertFilters
- **Propósito:** filtros de alertas (`status|severity|type`).
- **Props:** `value`, `onChange`.
- **Dónde se usa:** `/alerts`.

## 6. Onboarding y captura

### QRScanner
- **Propósito:** capturar el QR del kit (cámara) con entrada manual de respaldo.
- **Props:** `onScan(code)`, `onError`, `allowManual`.
- **Estado:** maneja permisos de cámara; degradación a input manual.
- **Dónde se usa:** `/onboarding/scan-kit` (FR-ONB-001).
- **Dependencias:** librería de cámara/QR del cliente.

### SegmentSelector
- **Propósito:** elegir segmento `home|smb|business` (tarjetas).
- **Props:** `value`, `onChange`.
- **Dónde se usa:** `/onboarding/installation-type` (FR-ONB-006).

### BillUploader
- **Propósito:** subir imagen/PDF de boleta con validación de tipo/tamaño.
- **Props:** `onUpload(file)`, `accept`, `maxSizeMb`, `status`.
- **Dónde se usa:** `/onboarding/bill-upload` (FR-BILL-001).
- **Dependencias:** preview; bloqueado offline.

### ProfileFormHome / ProfileFormSmb / ProfileFormBusiness
- **Propósito:** formularios de perfil por segmento.
- **Props:** `value`, `onSubmit`.
- **Dónde se usa:** `/onboarding/profile/*` y `/settings` (FR-PROF-001..004).

### OnboardingStepper
- **Propósito:** barra de progreso del wizard (kit→devices→perfil→boleta) con reanudación.
- **Props:** `steps`, `current`, `completed[]`.
- **Dónde se usa:** layout `(onboarding)` (FR-ONB-007).

### DistributorSelect / TariffForm / TariffDistributorForm
- **Propósito:** seleccionar distribuidora del catálogo y tarifa.
- **Props:** `distributors`, `value`, `onChange` (Tariff: `code`, `energyPriceClpKwh`, `fixedChargeClp?`, `demandChargeClpKw?`).
- **Dónde se usa:** `/onboarding/bill-upload`, `/settings` (FR-BILL-003/004, FR-SET-004).

### BillDataForm
- **Propósito:** captura/edición manual de datos de boleta (periodo, consumo, montos, vencimiento).
- **Props:** `value`, `onChange`, `rawExtraction?` (OCR V1, editable).
- **Dónde se usa:** `/onboarding/bill-upload` (FR-BILL-002/005/006).

## 7. Ajustes y auth

### SettingsTabs, ProfileForm, InstallationForm, DeviceSettingsList, SecurityPanel, PasswordChangeForm, SessionsList, UsersTable (V1), PlanPanel (V2)
- **Propósito:** secciones de `/settings` (FR-SET-001..008, FR-AUTH-006/007/008/010).
- **Props:** datos de la sección + handlers; visibilidad/edición según rol (RBAC).
- **Dónde se usa:** `/settings`.
- **Dependencias:** `ConfirmDialog` (revocar usuario, cerrar sesiones); validación de fortaleza de contraseña.

### AuthCard, TextField, NumberField, PasswordField, Select, TimezoneSelect, SubmitButton, ConfirmDialog
- **Propósito:** primitivos de formulario y diálogos reutilizables.
- **Dónde se usa:** transversal (auth, onboarding, settings).
- **Dependencias:** Tailwind; accesibilidad (labels, focus).

## 8. Estados y shell

### EmptyState
- **Propósito:** estado vacío con icono, mensaje y CTA. Núcleo de la resiliencia UI (NFR-018, FR-DASH-007).
- **Props:** `title`, `description`, `cta?: {label, onClick}`, `icon?`.
- **Dónde se usa:** todas las pantallas de datos.

### ErrorState
- **Propósito:** estado de error con reintento; distingue 401/403/5xx.
- **Props:** `kind: 'unauthorized'|'forbidden'|'server'|'network'`, `onRetry?`.
- **Dónde se usa:** transversal.

### OfflineBanner
- **Propósito:** banner persistente de sin conexión; señala data stale y bloquea mutaciones.
- **Props:** `online: boolean`.
- **Estado:** suscrito a estado de conexión (Zustand `connectivity`).
- **Dónde se usa:** layout `(app)` y `(onboarding)`.
- **Dependencias:** estado de WebSocket/navegador.

### AppSidebar
- **Propósito:** navegación lateral con los 8 módulos; resalta ruta activa; oculta/atenúa según rol.
- **Props:** `activeRoute`, `role`, `openAlertsCount`.
- **Dónde se usa:** layout `(app)`.

### InstallationSwitcher
- **Propósito:** selector de instalación activa (header) cuando hay varias.
- **Props:** `installations`, `activeId`, `onChange`.
- **Estado:** escribe la instalación activa en Zustand → invalida/recompone query keys (ver `state-management.md`).
- **Dónde se usa:** header de `(app)` (FR-SET-002, multi-tenant).

### Skeleton
- **Propósito:** placeholders de carga (cards, charts, listas).
- **Props:** `variant`, `count?`.
- **Dónde se usa:** transversal en estado loading.
