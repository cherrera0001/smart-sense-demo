# Análisis de Brecha Spec ↔ Código — SmartSense

> Auditoría brownfield. Reconcilia el demo real (`E:\Cód\SmartSense\smartsense-brownfield`, rama `chore/brownfield-spec-reconciliation`, base `origin/master` @ `a50edf6`) contra las specs canónicas (`E:\Cód\SmartSense\specs`, 87 FR).
> Fuente de hechos del demo: `docs/audit/_evidence-brief.md` (verificado 2026-06-01) + lectura directa de `lib/types.ts`, `lib/mock-data.ts`, `app/onboarding/page.tsx`, `app/reporte/page.tsx`.
> **El demo es 100% mock estático + localStorage.** No hay backend, DB, ORM, API routes ni auth. Todo "cubierto" significa **cobertura VISUAL/mock**, nunca funcional.

---

## 1. Requerimientos CUBIERTOS visualmente por la demo

> ⚠️ **COBERTURA VISUAL/MOCK, NO FUNCIONAL.** Las pantallas renderizan datos deterministas desde `lib/mock-data.ts`; no hay cálculo backend, ni telemetría, ni persistencia más allá de 3 keys de `localStorage` (`onboardingDone`, `theme`, `showIPhoneFrame`). El "delta vs ayer", la "proyección fin de mes" y los "costos CLP" son constantes hardcodeadas, no derivadas.

| Pantalla demo (ruta) | FR cubiertos visualmente | Naturaleza de la cobertura |
|---|---|---|
| `/dashboard` (+ `/` landing) | **FR-DASH-002** (kWh día), **FR-DASH-003** (CLP día), **FR-DASH-006** (strip de alertas pendientes) | `HeroNumerico` (contador "vivo" animado desde `consumoHoy`), `ProyeccionMes`, `AlertasStrip`, `QuickActions`. kWh/CLP fijos del deck. |
| `/dashboard` (parcial) | **FR-DASH-001** (consumo instantáneo), **FR-DASH-004** (comparación periodo anterior), **FR-DASH-005** (estado de dispositivos) | Solo presentación: el "live" es animación de un número constante; `deltaAyerPct: -6` es literal; estado de kit ("3/4 conectados") hardcodeado en footer del Sidebar. |
| `/desglose` | **FR-BRK-002** (consumo por categoría), **FR-BRK-003** (proporción %), **FR-BRK-004** (ranking), **FR-BRK-005** (total periodo) | `firmaElectrica` = 5 segmentos (Refrigeración 38%, Climatización 24%, Electrónica 14%, Iluminación 12%, Lavado 12%) con dona/barras. % suman 100 por construcción del mock. |
| `/alertas` | **FR-ALRT-001** (alerta anomalía, mock), **FR-REC-001** (recomendación "sugerencia"), **FR-ALRT-005** (marcar leída — solo en memoria) | `Alerta.tipo ∈ anomalia|sugerencia|tip`; `leida` es un bool del mock, no persiste; `ahorroEstimadoClp` literal. |
| `/reporte` | **FR-REP-002** (reporte por semana) | `reporteSemanal` (ahorro semana, huella CO₂, comparativa 2 barras). Único granularity implementado. |
| `/ajustes` | **FR-SET-003** (lista de dispositivos), **FR-SET-004** (muestra tarifa BT-1 CGE) | Solo lectura: lista `enchufes` + `tarifa`. No hay edición persistente. |
| `/onboarding` | **FR-ONB-001** (escaneo QR, mock), **FR-ONB-003/004** (pairing por LEDs), **FR-BILL-004/FR-SET-004** (selección de tarifa) | Wizard de 3 pasos en memoria (`useState`), completar setea `onboardingDone=true` en localStorage. |

**Resumen:** la demo da cobertura visual a **DASH, BRK, ALRT (parcial), REP (1/6), SET (parcial), ONB (parcial)** — los módulos de *visualización de consumo* y *recomendación*. Es exactamente el corazón de la propuesta de valor ("ver tu energía en CLP"), bien resuelto a nivel UX, pero sin ninguna lógica detrás.

---

## 2. Requerimientos NO cubiertos (ni visual ni funcionalmente)

Módulos enteros y FR sin ninguna representación en el demo. Confirmado: no existen rutas `/login`, `/register`, `/control`, `/projections`, `/smart-control`, ni sub-rutas de onboarding.

| Área | FR no cubiertos | Nota |
|---|---|---|
| **Auth / Login / Register** | **FR-AUTH-001..010** (10 FR) | No hay concepto de usuario, sesión, JWT ni RBAC. La app entra directo. |
| **Multi-tenant** | invariante de canon (`organization_id`) + FR-AUTH-001/006/007/008 | No existe Organization, Membership ni scoping. Estado global único. |
| **Instalaciones** | **FR-ONB-006** (segmento), **FR-ONB-008** (crear instalación), **FR-SET-002** | No hay entidad Installation; el demo asume un único "hogar" implícito. |
| **Kits / claim / transferencia** | **FR-ONB-002** (claim), **FR-ONB-005** (creación de Device), **FR-ONB-007** (progreso), **FR-ONB-009**, **FR-ONB-010** (instalador IoT) | El QR del Step1 es decorativo; no resuelve contra ningún `EnergyKit`. |
| **Telemetría real** | **FR-DASH-001** real, **FR-BRK-001** (por device), **FR-BRK-006** (detalle device) | Sin MQTT, sin WebSocket, sin `TelemetryReading`. El "vivo" es cosmético. |
| **Control de dispositivos** | **FR-CTRL-001..009** (9 FR) | No hay toggles de encendido/apagado, ni bitácora, ni `ControlAction`. `enchufes` es solo estado de conexión, no controlable. |
| **Proyecciones (cálculo real)** | **FR-PROJ-001..005** (5 FR) | `proyeccionFinMesClp: 42500` es literal; no hay extrapolación ni comparación contra boleta. |
| **Boleta (upload)** | **FR-BILL-001..008** (8 FR) | No hay carga de archivo, OCR, ni captura de periodo/montos. La tarifa es un literal en `mock-data`. |
| **Perfiles por segmento** | **FR-PROF-001..007** (7 FR) | No existe selección home/smb/business ni captura de ocupantes/turnos/potencia declarada. |
| **Recomendaciones con impacto CLP calculado** | **FR-REC-002** (análisis periódico), **FR-REC-003** (impacto CLP backend), **FR-REC-005** (priorización) | `ahorroEstimadoClp` viene hardcodeado en cada alerta, no calculado. |
| **Notificaciones / Plan / Usuarios** | **FR-SET-005**, **FR-SET-007**, **FR-SET-008** | Sin canales de notificación, sin gestión de plan SaaS, sin invitaciones. |
| **Reportes (otras granularidades + export)** | **FR-REP-001** (día), **FR-REP-003** (mes), **FR-REP-004** (3 meses), **FR-REP-005** (rango), **FR-REP-006** (CSV) | Ver §3. |
| **Alertas avanzadas** | **FR-ALRT-002** (high_device), **FR-ALRT-003** (over_budget), **FR-ALRT-004** (offline), **FR-ALRT-006** (severidad) | El demo usa taxonomía propia (`anomalia/sugerencia/tip`) sin severidad ni device asociado. |

---

## 3. Requerimientos PARCIALMENTE cubiertos

| FR | Spec exige | Demo entrega | Brecha |
|---|---|---|---|
| **FR-ONB-001..007** (onboarding) | Wizard de **5+ sub-rutas** (`scan-kit`, `pair-devices`, `installation-type`, `profile/{segmento}`, `bill-upload`) con stepper persistente y guard por `GET /onboarding/status` | **3 pasos** en una sola ruta `/onboarding` con `useState` local (QR → pairing LEDs → tarifa). Completar setea `onboardingDone` | Falta tipo de instalación, perfil por segmento y boleta. El progreso no es reanudable (vive en memoria, no en backend). |
| **FR-ALRT-005** (revisión de alerta) | Estado persistente `open→reviewed/dismissed` con `reviewed_by`, baja el badge del dashboard | `Alerta.leida: boolean` en mock; marcar como leída **no persiste** entre recargas (no se escribe a localStorage) | Sin estado persistente real ni revisor ni transición auditada. |
| **FR-BRK-002/003** (desglose) | Agrupación dinámica por `DeviceCategory` derivada de agregados reales; toggle device/categoría | `firmaElectrica` con **firma/% fija** del deck; sin toggle device↔categoría, sin recálculo por periodo | La "firma eléctrica" es una foto estática; no responde a selección de periodo ni a datos reales. |
| **FR-REP-001..005** (reportes) | **día / semana / mes / últimos 3 meses** + rango personalizado | Solo **semana** (`reporteSemanal`), con `TimeRangeSelector` ausente | Faltan 4 de 5 granularidades. La huella de carbono CO₂ del demo **no está en ninguna spec REP** (feature extra a decidir si se canoniza). |
| **FR-DASH-001/005** (live + estado kit) | Live por WebSocket (p95 ≤ 2s) y estado derivado de `last_seen_at` | Contador animado de constante; estado "3/4 conectados, 1/4 reconectando" hardcodeado en `Sidebar` | Presentación correcta, cero datos en vivo reales. |
| **FR-DASH-007** (empty state) | Empty state guiado para instalación sin datos | No existe — el mock siempre tiene datos | Habrá que diseñar empty/loading/error/offline (NFR-018) que el demo nunca ejercita. |

---

## 4. Componentes actuales → spec → servicio backend

| Componente / archivo demo | FR / pantalla spec destino | Servicio/endpoint backend (OpenAPI) |
|---|---|---|
| `components/dashboard/HeroNumerico.tsx` (← `consumoHoy`) | FR-DASH-001/002/003 · `/dashboard` | `getDashboard` GET `/installations/{id}/dashboard` + WebSocket live |
| `components/dashboard/ProyeccionMes.tsx` (← `consumoHoy`) | FR-PROJ-001/002 · `/projections` (V1) | proyección derivada de `reportMonthly` + boleta `confirmed` |
| `components/dashboard/AlertasStrip.tsx` (← `alertas`) | FR-DASH-006 · `/dashboard` | `listAlerts` GET `/installations/{id}/alerts?status=open` |
| `components/dashboard/QuickActions.tsx` | navegación · transversal | — (routing cliente) |
| `app/desglose/page.tsx` (← `firmaElectrica`) | FR-BRK-001..005 · `/breakdown` | `getBreakdown` GET `/installations/{id}/breakdown?groupBy=device\|category` |
| `app/alertas/page.tsx` (← `alertas`) | FR-ALRT-001/005 + FR-REC-001/004 · `/alerts` | `listAlerts`, `reviewAlert` PATCH `/alerts/{id}/review`, `listRecommendations` |
| `app/reporte/page.tsx` (← `reporteSemanal`) | FR-REP-002 · `/reports` | `reportWeekly` GET `/installations/{id}/reports/week` |
| `app/ajustes/page.tsx` (← `enchufes`, `tarifa`) | FR-SET-003/004 · `/settings` | `updateDevice` PATCH `/devices/{id}`, `updateInstallation` (tarifa) |
| `components/onboarding/Step1QR.tsx` | FR-ONB-001 · `/onboarding/scan-kit` | `scanKit` POST `/onboarding/kit/scan` |
| `components/onboarding/Step2PairingLeds.tsx` | FR-ONB-003/004/005 · `/onboarding/pair-devices` | `pairDevice` POST `/onboarding/devices/pair` + WebSocket pairing |
| `components/onboarding/Step3Tarifa.tsx` | FR-BILL-004 / FR-SET-004 · `/onboarding/bill-upload` o `installation-type` | `createBill` / `updateInstallation` (tariff) |
| `components/layout/{Sidebar,BottomNav,LayoutShell,IPhoneFrame}.tsx` | shell `(app)` · routes.md §1 | — (sidebar debe pasar de **5 a 8 módulos**) |
| `components/ui/*` (badge, button, card, dialog, input, select) | base de `components.md` | — (design system reutilizable, KEEP) |
| `lib/format.ts` (`formatCLP`, `formatKwh`, `formatDelta`, `formatHora`) | transversal (render de dinero/energía) | — (cliente; backend entrega valores ya calculados) |

---

## 5. Specs que deben AJUSTARSE por aprendizaje del código

El demo tiene activos de producto y UX que las specs deben absorber explícitamente:

1. **"Firma Eléctrica" como nombre de producto del desglose.** `FirmaElectrica` (demo) es un excelente naming de cara al usuario para el agrupado por `DeviceCategory` (FR-BRK-002). Recomendación: canonizar "Firma Eléctrica" como la etiqueta de UI del módulo BRK en `screens.md`/`components.md`, manteniendo `DeviceCategory`/`device_categories` como entidad técnica.
2. **`formatCLP` / `formatKwh` como estándar de formato.** `lib/format.ts` es production-grade (Intl `es-CL`, coma decimal). Debe incorporarse a `packages/shared` como utilidad canónica de presentación. KEEP.
3. **Paleta y design system del demo.** El brief menciona "Midnight Voltage"; el código real usa `--brand-primary: #FF8A00` (naranja) con gradientes por severidad y variables CSS theme-aware (dark/light, WCAG AA). **Verificar el nombre exacto de la paleta** (el código no lo nombra "Midnight Voltage"), pero los tokens CSS y los `components/ui/*` son activos a estandarizar en el frontend objetivo.
4. **Onboarding por LEDs de pairing como patrón UX a preservar.** `Step2PairingLeds` modela el descubrimiento de enchufes con feedback de LED — patrón concreto y bueno para `FR-ONB-003/004` (`/onboarding/pair-devices`). Preservarlo al migrar al wizard de 5 pasos.
5. **Tarifa BT-1 / BT-1A chilena concreta en seeds.** El demo fija `BT-1`, `165 CLP/kWh`, distribuidora CGE, comuna Coquimbo. Es un dato real y útil: reflejarlo en los seeds de `tariffs`/`distributors` (`packages/db`) como caso base de Chile. Confirma el shape mínimo de `Tariff` (código + `energy_price_clp_kwh`).
6. **Huella de carbono (CO₂).** El demo muestra `huellaCarbonoKg` en el reporte. **No existe en las specs REP.** Decidir si se canoniza como métrica derivada (kWh × factor de emisión SEN) o se descarta. Es un gancho comercial atractivo.
7. **`QuickActions` y BottomNav móvil.** El demo es mobile-first con `IPhoneFrame`; las specs asumen sidebar desktop de 8 módulos. Conviene que `routes.md` documente la navegación móvil (BottomNav) como first-class, no solo el sidebar.

---

## 6. Código que CONTRADICE las specs

| Contradicción | Demo (real) | Canon / spec | Acción |
|---|---|---|---|
| **Dominio en español acoplado en `types.ts`** | `Tarifa`, `ConsumoHoy`, `FirmaElectrica`, `Alerta`, `Enchufe`, `ReporteSemanal` con campos en español (`clpKwh`, `comuna`, `leida`) | Entidades canon en inglés `snake_case` (`Tariff`, `Device`, `Alert`, `EnergyAggregate`...) con enums canónicos (`alert_status: open\|reviewed\|dismissed`) | Reemplazar tipos del frontend por los generados del OpenAPI; UI en español, dominio en inglés. |
| **Costos calculados en frontend/mock** | `consumoHoy.clp`, `firmaElectrica[].clpDia`, `ahorroEstimadoClp` literales en `mock-data.ts` | Invariante de canon: **el cálculo de costos vive siempre en backend**; frontend solo renderiza | Eliminar todo cálculo/literal monetario del cliente; consumir valores ya calculados de la API. |
| **`localStorage` como fuente de estado** | `onboardingDone`, `theme`, `showIPhoneFrame`; hook `useLocalStorage<T>`; estado de alertas en memoria | React Query (server state) + Zustand (UI/instalación activa); estado de dominio en backend | localStorage solo para preferencias UI (theme/frame OK); migrar onboarding/alertas a backend. |
| **Rutas en español** | `/desglose`, `/alertas`, `/reporte`, `/ajustes`, `/onboarding` | Rutas en inglés: `/breakdown`, `/alerts`, `/reports`, `/settings`, `/onboarding/{sub}` | Renombrar rutas (rompe URLs públicas de `smartsense.c4a.cl` — coordinar redirects). |
| **Ausencia de `organization_id` / multi-tenant** | Estado global único, sin tenant, sin scoping | Toda entidad de dominio con `organization_id`; ninguna query cross-tenant | Bloqueante para MVP usable: introducir Organization/Membership antes de exponer datos. |
| **Taxonomía de alertas divergente** | `tipo: anomalia\|sugerencia\|tip`, sin `severity`, sin `device_id` | `alert_type: anomaly\|high_device\|over_budget\|offline` + `alert_severity` + `recommendation_source` | "sugerencia/tip" son **Recommendation**, no Alert. Separar las dos entidades en el modelo del frontend. |
| **Sidebar de 5 ítems** | Inicio, Desglose, Alertas, Reporte, Ajustes; marca "Home Energy" | Shell `(app)` con **8 módulos** (incluye Control, Proyecciones, Smart-Control) | Ampliar navegación; reconciliar marca ("Home Energy" vs "SmartSense / Home Energy" del canon). |

---

## 7. Specs demasiado ambiciosas o mal calibradas para la realidad del demo

Crítica honesta en ambas direcciones: las specs están bien estructuradas (87 FR trazables), pero algunas piezas son sobre-ingeniería para un equipo que hoy tiene **un mock sin backend**.

**Probablemente sobre-dimensionado para MVP (diferir):**
1. **TimescaleDB / hypertable desde día 1.** Para validar la propuesta de valor con 5–10 usuarios beta (Gate 3 del CLAUDE.md del demo), PostgreSQL plano con una tabla `telemetry_readings` indexada por `(device_id, source_timestamp)` basta. TimescaleDB es la respuesta correcta a escala, prematura en MVP. **Diferir a V1** cuando el volumen lo justifique.
2. **Telemetría MQTT real + iot-bridge + WebSocket en MVP.** Es el camino crítico de mayor riesgo (hardware + firmware + broker EMQX). Para el MVP usable, considerar **ingesta por HTTP POST batch** desde el kit (o incluso simulador de telemetría) y polling/refetch en vez de WebSocket. MQTT/WebSocket → V1. El demo lo "finge" hoy; el riesgo es asumir que el live real es trivial.
3. **RBAC de 4 roles + matriz de 8 capacidades (FR-AUTH-009) en MVP.** Para beta basta `owner` (todo) + opcionalmente `viewer`. `operator`/`admin` y la matriz completa pueden esperar a que exista control de dispositivos real. La spec lo marca MVP; recomiendo reducir a 2 roles en MVP.
4. **Instalador IoT como actor (FR-ONB-010), transferencia de kit (FR-ONB-009).** Casos de campo valiosos pero no en la ruta crítica de validación. Ya marcados V1/V2 — correcto, mantener fuera de MVP.
5. **OCR de boleta (FR-BILL-008).** Ya marcado V1. Correcto: la extracción manual (FR-BILL-002) es suficiente y elimina dependencia de un parser frágil.
6. **Control real de dispositivos (FR-CTRL-001..009) marcado MVP.** Apagar/encender hardware de forma confiable y auditada es alto riesgo. Si el hardware del kit no garantiza actuación confiable, **degradar CTRL a V1** y dejar el MVP en monitoreo + alertas (que es donde el demo ya demuestra valor).

**Bien calibrado / no tocar:**
- Costos en backend, anti-enumeración en auth, idempotencia de telemetría por `event_hash`, "no inventar CLP sin tarifa" — invariantes correctos y baratos de respetar desde el inicio.
- Estados UI (loading/empty/error/offline, NFR-018) — el demo no los tiene y los va a necesitar; bien que estén especificados.

**Posible sub-especificación:**
- El demo trae **huella de carbono** y un **selector de tema dark/light WCAG AA** que las specs no mencionan. No es ambición de más; es producto real ya construido que la spec ignora (ver §5.6 y §5.3).

---

## 8. Decisiones pendientes (para Cristóbal)

1. **Alcance del MVP de telemetría:** ¿MQTT/EMQX real desde el MVP, o ingesta HTTP batch + simulador para validar valor antes de invertir en el camino IoT completo?
2. **TimescaleDB:** ¿se adopta desde día 1 o se difiere a V1 con PostgreSQL plano + índices? (Impacta infra y costo).
3. **Control de dispositivos en MVP:** ¿el hardware del kit garantiza actuación on/off confiable y auditada? Si no, ¿degradamos CTRL a V1 y MVP = solo monitoreo + alertas?
4. **RBAC en MVP:** ¿2 roles (`owner`/`viewer`) o la matriz completa de 4 desde el inicio?
5. **Renombrado de rutas español → inglés:** `smartsense.c4a.cl` ya está en producción. ¿Se rompen las URLs públicas con redirects 301, o se mantiene español en el frontend y solo el backend/OpenAPI usa inglés?
6. **Marca:** ¿"SmartSense", "Home Energy", o "SmartSense / Home Energy"? El demo y el canon difieren.
7. **Huella de carbono CO₂:** ¿se canoniza como métrica REP/dashboard (con factor de emisión SEN) o se descarta del demo?
8. **Estrategia de migración del demo:** ¿se evoluciona el repo actual `smartsense-brownfield` hacia el monorepo `apps/web` (reutilizando `components/ui`, `lib/format`, design system), o se arranca `apps/web` limpio y se portan solo los activos? (El acoplamiento al mock es superficial: solo 7 sitios importan `@/lib/mock-data`).
9. **Paleta:** confirmar el nombre/tokens definitivos del design system (el brief dice "Midnight Voltage" pero el código usa `--brand-primary: #FF8A00`). ¿Cuál es la fuente de verdad?
10. **Boleta en onboarding:** ¿obligatoria u omitible? (`screens.md` la marca omitible con "tarifa pendiente"; el demo la resuelve como paso de tarifa simple). Definir el flujo mínimo.
11. **Limpieza de docs públicos:** `README`/`CLAUDE.md` exponen `prj_pgEpK6iqMMcvAYen38xR0Nb9QjgF`, dominio y la práctica de almacenamiento de tokens. Riesgo bajo, pero ¿se purgan antes de hacer público el repo?
