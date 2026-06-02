# Reconciliación de Rutas — Demo actual vs Specs objetivo

> Auditoría brownfield SmartSense · 2026-06-01 · Fuentes de verdad: `docs/audit/_evidence-brief.md`, `specs/05-frontend/routes.md`, `specs/04-api/openapi.yaml` (32 paths verificados).
> Alcance: **solo análisis y decisión de mapeo**. No modifica código, no mueve archivos, no implementa.
> Estado base: demo 100% mock estático + localStorage, sin backend/auth/API. 9 rutas en español. Objetivo: 17 rutas alineadas a specs/openapi.

---

## 1. Resumen ejecutivo

- **9 rutas actuales** (demo): `/`, `/onboarding`, `/dashboard`, `/desglose`, `/alertas`, `/reporte`, `/ajustes`, `/demo`, `/offline`.
- **17 rutas objetivo** (specs): `/login`, `/register`, `/onboarding/scan-kit`, `/onboarding/pair-devices`, `/onboarding/installation-type`, `/onboarding/profile/home`, `/onboarding/profile/smb`, `/onboarding/profile/business`, `/onboarding/bill-upload`, `/dashboard`, `/reports`, `/breakdown`, `/control`, `/alerts`, `/projections`, `/smart-control`, `/settings`.
- **Reutilizables con refactor** (lógica/UI rescatable): 5 rutas del shell (`/dashboard`, `/desglose`→`/breakdown`, `/reporte`→`/reports`, `/alertas`→`/alerts`, `/ajustes`→`/settings`) + onboarding (1 ruta de 3 pasos → 5 sub-rutas).
- **Nuevas sin equivalente** (replace/new): `/login`, `/register`, `/control`, `/projections`, `/smart-control`, y las 5 sub-rutas de `/onboarding/*` (más allá del solapamiento parcial con el wizard actual).
- **Infra demo**: `/` (redirect bootstrap, keep), `/demo` (archive bajo `DEMO_MODE`), `/offline` (keep, fallback PWA — no está en las 17 specs pero es requisito NFR PWA).
- **Gap estructural mayor** (del brief): el demo NO modela User/Organization/Membership/Installation/EnergyKit/multi-tenant/control/telemetría real. Esto bloquea `(auth)`, `(onboarding)` enriquecido, `/control`, `/smart-control`, `/projections`.

---

## 2. Tabla principal de reconciliación

> Endpoint del OpenAPI referenciado por `operationId · método path`. Todos verificados contra `specs/04-api/openapi.yaml`.

| Ruta objetivo | Ruta actual equivalente | Existe | Componente/página actual | Datos actuales (mock) | Datos requeridos por API (endpoint openapi) | Decisión | Razón | Prioridad | Impacto |
|---|---|:--:|---|---|---|---|---|:--:|---|
| `/login` | — | No | — | — | `authLogin` · POST `/auth/login` → `authMe` · GET `/auth/me` | **replace (new)** | El demo no tiene auth ni sesión; entrada por bootstrap de `onboardingDone` en localStorage | MVP | Alto: requiere `(auth)` route group, layout minimal, middleware de sesión, React Query mutations, Zustand auth store |
| `/register` | — | No | — | — | `authRegister` · POST `/auth/register` (crea user+org owner) | **replace (new)** | Sin modelo User/Organization en demo | MVP | Alto: alta de tenant (org owner), validación perímetro, vincula con onboarding posterior |
| `/onboarding/scan-kit` | `/onboarding` (paso 1) | Parcial | `app/onboarding/page.tsx` → `components/onboarding/Step1QR.tsx` | `onboardingDone` (localStorage); QR simulado | `scanKit` · POST `/onboarding/kit/scan`; `claimKit` · POST `/onboarding/kit/claim`; `createInstallation` · POST `/installations`; `onboardingStatus` · GET `/onboarding/status` | **refactor/expand** | Step1QR es reutilizable como UI base; falta claim real de kit + creación de instalación + guard por `onboarding/status` | MVP | Medio: extraer paso 1 a sub-ruta propia bajo `(onboarding)` con stepper FR-ONB-007 |
| `/onboarding/pair-devices` | `/onboarding` (paso 2) | Parcial | `app/onboarding/page.tsx` → `components/onboarding/Step2PairingLeds.tsx` | 4 enchufes mock (online/offline/reconectando); estado de LEDs simulado | `pairDevice` · POST `/onboarding/devices/pair`; `listDevices` · GET `/installations/{installationId}/devices`; live pairing vía WebSocket | **refactor/expand** | UI de pairing por LEDs rescatable; requiere pairing real + WebSocket live (NFR-022). Warning lint conocido en `Step2PairingLeds.tsx:35` (exhaustive-deps) | MVP | Medio-alto: live pairing es el primer punto que exige WebSocket en frontend |
| `/onboarding/installation-type` | — | No | — | — | `createInstallation` · POST `/installations`; `updateInstallation` · PATCH `/installations/{id}` (set `segment`) | **replace (new)** | Demo no modela Installation ni `segment` (home/smb/business) | MVP | Medio: bifurca el wizard hacia el perfil correcto por segmento |
| `/onboarding/profile/home` | — | No | — | — | `updateInstallation` · PATCH `/installations/{id}` (perfil `home`) | **replace (new)** | Sin perfilado por segmento en demo | MVP | Medio: formulario de perfil residencial (FR-PROF-001/002) |
| `/onboarding/profile/smb` | — | No | — | — | `updateInstallation` · PATCH `/installations/{id}` (perfil `smb`) | **replace (new)** | Sin perfilado por segmento en demo | MVP | Medio: formulario perfil PyME (FR-PROF-001/003) |
| `/onboarding/profile/business` | — | No | — | — | `updateInstallation` · PATCH `/installations/{id}` (perfil `business`) | **replace (new)** | Sin perfilado por segmento en demo | MVP | Medio: formulario perfil empresa (FR-PROF-001/004) |
| `/onboarding/bill-upload` | `/onboarding` (paso 3, parcial) | Parcial | `components/onboarding/Step3Tarifa.tsx` | `Tarifa` mock (CGE Coquimbo 165 CLP/kWh, BT-1/BT-1A, comuna, distribuidora) | `createBill` · POST `/installations/{installationId}/bills`; `listBills` · GET (estado) | **refactor/expand** | Step3Tarifa captura tarifa manualmente; el objetivo es subir boleta y derivar tarifa (FR-BILL-001..007). La tarifa manual puede sobrevivir como fallback | MVP | Medio: cambia de captura manual a upload + procesamiento async (estado de boleta) |
| `/dashboard` | `/dashboard` | Sí | `app/dashboard/page.tsx` (+ `HeroNumerico`, `ProyeccionMes`, `AlertasStrip`, `QuickActions`) | `consumoHoy` (7.58kWh/$1250, contador vivo), proyección $42.500, `alertas` (strip) | `getDashboard` · GET `/installations/{installationId}/dashboard`; `listAlerts` (badge); live vía WebSocket | **refactor (quitar mock)** | Página y composición visuales rescatables; sustituir imports directos de `@/lib/mock-data` (3 sitios: HeroNumerico, ProyeccionMes, AlertasStrip) por React Query + WebSocket | MVP | Alto: ruta más vista; el contador vivo pasa de mock a telemetría real (WebSocket) |
| `/reports` | `/reporte` | Sí (renombrar) | `app/reporte/page.tsx` | `reporteSemanal` mock | `reportDaily`/`reportWeekly`/`reportMonthly`/`reportLastThreeMonths` · GET `/installations/{installationId}/reports/{granularidad}` | **refactor (quitar mock + renombrar)** | UI de reporte semanal reutilizable; expandir a 4 granularidades y quitar mock (`app/reporte/page.tsx`) | MVP (export CSV V2) | Medio: añade selector de granularidad; export CSV difiere a V2 |
| `/breakdown` | `/desglose` | Sí (renombrar) | `app/desglose/page.tsx` | `firmaElectrica` (5 segmentos: Refrigeración 38%, Climatización 24%, Electrónica 14%, Iluminación 12%, Lavado 12%) | `getBreakdown` · GET `/installations/{installationId}/breakdown?groupBy=device\|category`; (detalle) `rangeTelemetry` · GET `/installations/{installationId}/telemetry/range` | **refactor (quitar mock + renombrar)** | Pie chart por firma reutilizable; mapear a `groupBy=category\|device` + detalle por `?device=` (param ya previsto en specs) | MVP (detalle V1) | Medio: cambia firma estática por desglose real por categoría/dispositivo |
| `/control` | — | No | — | — | `listDevices` · GET `/installations/{installationId}/devices`; `getControlState` · GET `/devices/{deviceId}/control-state`; `createControlAction` · POST `/devices/{deviceId}/control-actions` | **replace (new)** | Demo no tiene control de dispositivos (solo estado de conexión read-only en Ajustes) | MVP | Alto: introduce acciones de control con RBAC (operator/admin/owner; viewer deshabilitado, 403 backend) |
| `/alerts` | `/alertas` | Sí (renombrar) | `app/alertas/page.tsx` | `alertas` mock (3: anomalia/sugerencia/tip, flag `leida`) | `listAlerts` · GET `/installations/{installationId}/alerts`; `reviewAlert` · PATCH `/alerts/{id}/review`; `listRecommendations` · GET `/installations/{installationId}/recommendations` | **refactor (quitar mock + renombrar)** | Vista master/detail reutilizable; separar Alert de Recommendation (sugerencia/tip → recommendations) y persistir `leida` vía `reviewAlert` | MVP | Medio: el "marcar leída" pasa de localStorage/mock a PATCH real (uno de los flujos E2E del gate) |
| `/projections` | — | No | — | (proyección $42.500 vive embebida en dashboard mock) | (V1) proyección sobre `reportMonthly` + boleta `confirmed` vía `listBills`; cálculo en backend | **replace (new)** | No existe ruta dedicada; la proyección actual es un número mock en el dashboard | V1 | Medio: requiere boleta confirmada + reporte mensual como insumos |
| `/smart-control` | — | No | — | — | `createControlSchedule` · POST `/devices/{deviceId}/control-schedules`; `createConsumptionLimit` · POST `/devices/{deviceId}/consumption-limits`; `listDevices` | **replace (new)** | Sin programación/límites en demo | V1 | Medio-alto: schedules + límites de consumo con RBAC |
| `/settings` | `/ajustes` | Sí (renombrar) | `app/ajustes/page.tsx` | `enchufes` (4) + `tarifa` mock | `authMe`; `updateInstallation` · PATCH `/installations/{id}`; `updateDevice` · PATCH `/devices/{id}`; (V1) usuarios/roles; (V2) plan | **refactor (quitar mock + renombrar)** | Vista de ajustes/estado de dispositivos reutilizable; secciones por rol; quitar mock (`app/ajustes/page.tsx`) | MVP (núcleo: perfil, instalación, dispositivos, tarifa, seguridad) | Medio: introduce secciones por tabs/ancla y gestión real de instalación/dispositivos |
| — (sin objetivo, infra) | `/` | Sí | `app/page.tsx` | bootstrap por `onboardingDone` (localStorage) | n/a (redirect) | **keep (adaptar)** | Redirect raíz útil; adaptar a sesión/onboarding-status en vez de localStorage | MVP | Bajo: lógica de redirect debe consultar `authMe`/`onboardingStatus` |
| — (sin objetivo) | `/demo` | Sí | `app/demo/page.tsx` | quick-nav + toggle iPhone frame + reset onboarding | n/a | **archive (DEMO_MODE)** | Herramienta de defensa/dev; sacar de producción tras `DEMO_MODE` flag, no eliminar (sirve para QA) | — (fuera de prod) | Bajo: ocultar tras feature flag; evita exponer navegación interna en prod |
| — (no en las 17, requisito PWA) | `/offline` | Sí | `app/offline/page.tsx` | n/a | n/a | **keep (PWA)** | Fallback del service worker (`next-pwa`, `public/sw.js`); requisito PWA (no es ruta de producto pero es NFR) | MVP | Bajo: mantener; no requiere backend |

---

## 3. Mapeos clave (resumen accionable)

| Demo | Objetivo | Acción |
|---|---|---|
| `/dashboard` | `/dashboard` | **refactor**: quitar mock (HeroNumerico, ProyeccionMes, AlertasStrip → React Query + WebSocket) |
| `/desglose` | `/breakdown` | **refactor + renombrar**: firma eléctrica → `groupBy=category\|device` |
| `/reporte` | `/reports` | **refactor + renombrar**: 1 vista → 4 granularidades |
| `/alertas` | `/alerts` | **refactor + renombrar**: separar Alert/Recommendation; `reviewAlert` real |
| `/ajustes` | `/settings` | **refactor + renombrar**: secciones por rol; `updateInstallation`/`updateDevice` |
| `/onboarding` (1 ruta, 3 pasos in-memory `useState`) | `/onboarding/{scan-kit, pair-devices, installation-type, profile/*, bill-upload}` (5+ sub-rutas) | **refactor/expand**: explotar el wizard a route group `(onboarding)` con stepper FR-ONB-007; pasos 1–3 actuales mapean parcialmente a scan-kit/pair-devices/bill-upload; installation-type y profile/* son nuevos |
| `/demo` | — | **archive** tras `DEMO_MODE` flag |
| `/offline` | — | **keep** (fallback PWA) |
| — | `/login`, `/register`, `/control`, `/projections`, `/smart-control` | **replace/new**: sin equivalente en demo |

**Onboarding — nota de mapeo parcial:** el wizard actual maneja los 3 pasos con `useState` (in-memory, no rutas), y solo `markComplete()` persiste en localStorage. La expansión a 5+ sub-rutas implica navegación real por URL, persistencia de progreso server-side (`onboardingStatus`) y guard de redirección al paso pendiente (specs §4).

---

## 4. Decisión de idioma de rutas (registrada con justificación)

**Recomendación: UI en español, rutas canónicas en inglés** (alineadas a specs + openapi), con **redirects 308 temporales** desde las rutas españolas actuales durante la transición.

### 4.1 Decisión
- **URLs canónicas en inglés**: `/dashboard`, `/breakdown`, `/reports`, `/alerts`, `/settings`, `/control`, `/projections`, `/smart-control`, `/onboarding/*`, `/login`, `/register` — exactamente como en `specs/05-frontend/routes.md`.
- **Toda la UI visible permanece en español** (es-CL): labels de sidebar/header, textos, contenido. El idioma de la URL es independiente del idioma de presentación.
- **Redirects 308 (Permanent Redirect, preserva método/cuerpo)** desde las rutas españolas legacy a las canónicas, durante la ventana de transición:
  - `/desglose` → `/breakdown`
  - `/reporte` → `/reports`
  - `/alertas` → `/alerts`
  - `/ajustes` → `/settings`
  - (`/dashboard` ya coincide; `/onboarding` raíz → `/onboarding/scan-kit`)
- Implementación recomendada: `redirects()` en `next.config.js` con `permanent: true` (emite 308) o `middleware.ts`. Mantener los redirects **temporalmente** (sugerido: hasta cerrar el primer release estable post-migración), luego retirar.

### 4.2 Justificación
1. **Fuente de verdad única**: openapi y specs ya usan inglés en paths/`operationId`. Rutas en inglés evitan un mapping español↔inglés frágil entre frontend y contrato API (menos drift, menos bugs de routing).
2. **Convención de industria**: paths en inglés son el estándar de facto en SaaS; facilita onboarding de devs, integraciones y herramientas (analytics, RUM, tests E2E que referencian rutas).
3. **No rompe deploy ni enlaces**: con 308 temporales, los enlaces existentes (bookmarks, deep-links del demo en Vercel `smartsense.c4a.cl`, capturas/QA) siguen funcionando y transfieren equity SEO al destino canónico. El 308 (vs 301/302) preserva método y cuerpo en navegaciones no-GET, evitando romper POSTs.
4. **Separación presentación/ruteo**: la UX en español se conserva 100% vía i18n de contenido; el usuario final no ve las URLs como barrera (en una PWA mobile-first las URLs son casi invisibles).

### 4.3 Trade-off vs mantener español
| Criterio | Rutas en inglés (recomendado) | Rutas en español (alternativa) |
|---|---|---|
| Alineación con openapi/specs | Directa, sin mapping | Requiere capa de traducción ruta↔endpoint |
| Riesgo de drift frontend/API | Bajo | Alto (dos vocabularios) |
| Coste de migración | Renombrar 4 carpetas + 4 redirects 308 | Cero (status quo) |
| Localización percibida por usuario CL | Neutral (URL no traducida, UI sí) | Levemente más "local" en la barra de direcciones |
| Mantenibilidad a futuro (i18n multi-idioma) | Alta (URL estable, contenido traducible) | Baja (URLs atadas a un idioma) |
| SEO / enlaces existentes | Preservado vía 308 | Preservado (no cambian) |

**Conclusión**: el único beneficio real del español en rutas es estético/percepción local en la barra de direcciones — marginal en una PWA mobile-first donde la URL casi no se ve. El coste (drift permanente con el contrato API y peor mantenibilidad) supera ese beneficio. La migración a inglés es barata (4 renombres + 4 redirects 308) y los redirects temporales eliminan el riesgo de romper enlaces/deploy durante la transición.

---

## 5. Conteo y priorización

| Decisión | Rutas | Detalle |
|---|---|---|
| **keep** | 2 | `/` (adaptar redirect), `/offline` (PWA) |
| **refactor (quitar mock + renombrar)** | 5 | `/dashboard`, `/breakdown`, `/reports`, `/alerts`, `/settings` |
| **refactor/expand** | 3 sub-rutas | `/onboarding/scan-kit`, `/onboarding/pair-devices`, `/onboarding/bill-upload` (desde el wizard actual) |
| **replace (new)** | 9 | `/login`, `/register`, `/onboarding/installation-type`, `/onboarding/profile/{home,smb,business}`, `/control`, `/projections`, `/smart-control` |
| **archive** | 1 | `/demo` (tras `DEMO_MODE`) |

**Prioridad MVP** (specs ✔): `/login`, `/register`, onboarding (scan-kit, pair-devices, installation-type, profile/*, bill-upload), `/dashboard`, `/reports`, `/breakdown`, `/control`, `/alerts`, `/settings`.
**Prioridad V1** (specs ✘ V1): `/projections`, `/smart-control`, `/forgot-password` (este último ni siquiera está entre las 17 objetivo del enunciado; vive en specs como V1).
**V2**: export CSV en `/reports`, plan/billing en `/settings`.

---

## 6. Supuestos y notas de verificación

- Endpoints y `operationId` citados están **verificados** contra `specs/04-api/openapi.yaml` (32 paths; coinciden con `routes.md`).
- Componentes y acoplamiento a mock (7 sitios) tomados del `_evidence-brief.md` (líneas 36–44) y confirmados por lectura directa de `app/page.tsx`, `app/onboarding/page.tsx`, `app/demo/page.tsx`.
- `/offline` no figura entre las 17 rutas objetivo del enunciado ni en la tabla de specs §2, pero es **requisito PWA** (fallback `next-pwa`); se mantiene fuera del recuento de las 17 como infraestructura.
- El enunciado lista 17 rutas objetivo; `specs/05-frontend/routes.md` incluye además `/forgot-password` (V1) no contemplada en esas 17 — se documenta como V1 fuera de alcance MVP.
- **UNKNOWN / no verificado**: el grado exacto de reutilización visual de cada componente al migrar a React Query + WebSocket no se midió (no se ejecutó refactor); las decisiones refactor vs replace asumen que la *capa de presentación* es rescatable y que el cambio se concentra en *capa de datos*. Si el rediseño visual fuese mayor, algunos "refactor" podrían escalar a "replace".
