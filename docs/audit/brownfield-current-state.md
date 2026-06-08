# Estado actual — Auditoría brownfield SmartSense

> Informe de estado actual del repo demo `smart-sense-demo`, clonado en `E:\Cód\SmartSense\smartsense-brownfield` (rama `chore/brownfield-spec-reconciliation`, base `origin/master` @ `a50edf6`). Todos los hechos provienen del brief de evidencia verificado el 2026-06-01 (`docs/audit/_evidence-brief.md`) y de archivos abiertos directamente del repo. No se incluye nada no verificado.

---

## 1. Stack real detectado

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.14 |
| UI runtime | React / React DOM | 19.2 |
| Lenguaje | TypeScript (strict) | 5.9 |
| Estilos | Tailwind CSS | 3.4 |
| Gráficos | Recharts | 2.15 |
| Iconos | lucide-react | 0.468 |
| Utilidades | date-fns 4, class-variance-authority 0.7, clsx 2.1, tailwind-merge 2.6 | — |
| PWA | next-pwa (`public/sw.js`, `manifest.webmanifest`, fallback `/offline`) | 5.6 |
| E2E (solo screenshots) | Playwright | 1.60 |
| Gestor de paquetes | pnpm (lockfile presente) | 8.12 |

**Lo que NO existe en el stack:** backend, ORM, base de datos, API routes, capa de autenticación. La aplicación es **100% mock estático + localStorage**.

---

## 2. Rutas reales existentes (`app/`)

Todas en **español**, todas estáticas:

| Ruta | Archivo | Propósito observado |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard / landing |
| `/onboarding` | `app/onboarding/` | Flujo de pairing (3 pasos) |
| `/dashboard` | `app/dashboard/` | Dashboard principal |
| `/desglose` | `app/desglose/page.tsx` | Firma eléctrica (pie chart) |
| `/alertas` | `app/alertas/page.tsx` | Alertas (master/detail) |
| `/reporte` | `app/reporte/page.tsx` | Reporte semanal |
| `/ajustes` | `app/ajustes/page.tsx` | Ajustes + estado de dispositivos |
| `/demo` | `app/demo/page.tsx` | Quick nav, reset onboarding, toggle iPhone frame |
| `/offline` | `app/offline/` | Fallback PWA |

**Rutas que NO existen** (esperadas por specs en inglés): `/login`, `/register`, sub-rutas de onboarding, `/reports`, `/breakdown`, `/control`, `/alerts`, `/projections`, `/smart-control`, `/settings`.

Total build: **12 rutas estáticas (○)**.

---

## 3. Componentes existentes (por carpeta)

- **`components/ui/`** (primitivos estilo shadcn, escritos a mano): `badge`, `button`, `card`, `dialog`, `input`, `select`.
- **`components/layout/`**: `BottomNav`, `IPhoneFrame`, `LayoutShell`, `Sidebar`.
- **`components/dashboard/`**: `AlertasStrip`, `HeroNumerico`, `ProyeccionMes`, `QuickActions`.
- **`components/onboarding/`**: `Step1QR`, `Step2PairingLeds`, `Step3Tarifa`.
- **`components/shared/`**: `RayoSvg`.
- **`components/theme/`**: `ThemeToggle`.

**Sidebar** (`components/layout/Sidebar.tsx`): 5 items de navegación — Inicio (`/dashboard`), Desglose, Alertas, Reporte, Ajustes. Marca **"Home Energy"**. Footer con estado de kit hardcodeado (ver §6).

---

## 4. Fuentes de datos actuales

- **`lib/types.ts`** — dominio en español: `Tarifa` (BT-1/BT-1A, clpKwh, comuna, distribuidora), `ConsumoHoy`, `FirmaElectrica`, `Alerta` (anomalia/sugerencia/tip, leida), `ReporteSemanal`, `Enchufe` (online/offline/reconectando), `AppState`.
- **`lib/mock-data.ts`** (187 líneas) — datos deterministas alineados al deck:
  - Tarifa CGE Coquimbo **165 CLP/kWh**.
  - `consumoHoy`: **7.58 kWh / $1.250**; proyección fin de mes **$42.500**; `serieHoraria` 24 pts; `serieMesAcumulada` 35 días.
  - `firmaElectrica`: 5 segmentos — Refrigeración 38%, Climatización 24%, Electrónica 14%, Iluminación 12%, Lavado 12%.
  - 3 alertas; 1 `reporteSemanal`; 4 enchufes.
- **`lib/format.ts`** — `formatCLP` (Intl es-CL), `formatKwh` (coma decimal), `formatDelta`, `formatHora`. Production-grade, candidato a **conservar** en migración.
- **`lib/utils.ts`** — helper `cn` (clsx + tailwind-merge).
- **`lib/context/ThemeContext.tsx`** — theme + localStorage `theme`.
- **`lib/hooks/`** — `useLocalStorage<T>` (genérico), `useOnboarding` (localStorage `onboardingDone`), `usePeriodo` (estado local `'hoy' | 'semana' | 'mes'`, sin persistencia ni fetch).

No hay ninguna capa de red. Todos los datos son módulos importados estáticamente en build.

---

## 5. Uso de localStorage (keys)

| Key | Origen | Uso |
|---|---|---|
| `onboardingDone` | `useOnboarding` + e2e | Marca onboarding completado |
| `theme` | `ThemeContext` | Tema claro/oscuro |
| `showIPhoneFrame` | `app/demo` + e2e | Toggle frame de iPhone para demos |

Hook genérico `useLocalStorage<T>` disponible para más persistencia.

---

## 6. Uso de mocks (archivos que importan `@/lib/mock-data`)

Acoplamiento **superficial y localizado** — 7 sitios:

| # | Archivo | Importa |
|---|---|---|
| 1 | `app/ajustes/page.tsx` | `enchufes`, `tarifa` |
| 2 | `app/alertas/page.tsx` | `alertas` |
| 3 | `app/desglose/page.tsx` | `firmaElectrica` |
| 4 | `app/reporte/page.tsx` | `reporteSemanal` |
| 5 | `components/dashboard/AlertasStrip.tsx` | `alertas` |
| 6 | `components/dashboard/HeroNumerico.tsx` | `consumoHoy` (contador vivo) |
| 7 | `components/dashboard/ProyeccionMes.tsx` | `consumoHoy` |

**Total: 7 puntos de acoplamiento.** Esto facilita la migración: reemplazar `import { x } from '@/lib/mock-data'` por hooks de datos (React Query) en estos 7 sitios.

---

## 7. Constantes hardcodeadas (no provienen de datos)

- **Sidebar footer** (`components/layout/Sidebar.tsx`): estado de kit fijo — `"3/4 conectados"` (punto `bg-success`) y `"1/4 reconectando"` (punto `bg-warning animate-pulse`). No deriva de los 4 enchufes del mock; está escrito a mano en el JSX.
- **Contador vivo del Hero** (`components/dashboard/HeroNumerico.tsx`): constante `TECHO_CLP_LIVE = 1450`. Un `setInterval` cada 5 s incrementa el costo en `8 + random(0..7)` CLP hasta tope 1.450, partiendo de `consumoHoy.clp`. Es un efecto cosmético, no telemetría real.
- Badge `"Demo"` fijo en el header del Hero.

Estas constantes son las que más engañan en una demo: simulan "tiempo real" y "estado de kit" sin fuente de datos.

---

## 8. Scripts disponibles (`package.json`)

| Script | Comando |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `verify-deck` | `node scripts/verify-deck.mjs` |
| `screenshots` | `playwright test e2e/screenshots.spec.ts` |
| `screenshots:install` | `playwright install chromium` |

**No existe** script `test` ni `typecheck`.

---

## 9. Pruebas existentes

- Único archivo E2E: `e2e/screenshots.spec.ts`. Su propósito es **capturar screenshots**, no validar comportamiento (sin assertions funcionales relevantes).
- **No hay tests unitarios, de integración ni E2E funcionales.**
- `pnpm test` no existe como script.

Cobertura funcional automatizada efectiva: **0%**.

---

## 10. Documentación existente (`docs/`)

Estructura curada con índice (`_INDEX.md`, `README.md`):

- **`00-Gobierno/`** — `EXECUTION_PLAN`, `BACKLOG_MVP_BACKEND`, `BACKLOG_QUICK_WINS`, `DEFINITION_OF_DONE`, `DOCUMENTO_CURATOR`, `README_EJECUCION`.
- **`10-Producto/`**
- **`20-Tecnologia/`** — deployment, dns-cloudflare, troubleshooting.
- **`30-Operaciones/`** — checklists, reportes audit/redesign/ux (2026-04-28).
- **`40-Clientes/`** — defensa-smartsense, handoff.
- **`90-Archivo/`** — fases completadas, versiones.
- Raíz del repo: `AUDIT_DOCUMENTAL.md`, `PENDIENTES.md`, `ORQUESTACION_MCP_SKILLS.md`, `CLAUDE.md`.

El `CLAUDE.md` del demo declara un plan "Demo→MVP en 4 semanas" con gates y un workflow backend-first. Coincide en espíritu con el enfoque spec-driven; pendiente reconciliar con `specs/` nuevas.

---

## 11. Estado de accesibilidad

Evidencia en código y README:

- **Focus visible:** anillos `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:outline-none` aplicados en navegación de Sidebar (logo y cada item).
- **Contraste WCAG AA (dark theme):** el README declara que todos los colores de severidad cumplen 4.5:1 (sección "Contraste WCAG AA").
- **Touch targets:** README declara `min-h-[44px]` en todos los botones (criterio WCAG).

No hay auditoría automatizada de accesibilidad (axe, Lighthouse en CI) en el repo. Las afirmaciones de contraste provienen de la documentación, no de una herramienta versionada.

---

## 12. Estado responsive / mobile

- Diseño **mobile-first**: viewport principal **380px** (README §responsive y CLAUDE.md punto 4).
- Desktop: sidebar de 240px + **frame de iPhone opcional** (toggle en `/demo`, persistido en localStorage `showIPhoneFrame`).
- `HeroNumerico` usa escalado responsive (`text-4xl sm:text-6xl`, `p-4 sm:p-8`).
- README declara fix de alturas de chart responsive para 360–430px.

---

## 13. Deuda técnica

- **Sin tests funcionales** (solo screenshots) → cualquier refactor es ciego.
- **Lint deprecado:** `next lint` será removido en Next 16; falta migrar a ESLint CLI / flat config.
- **1 warning de lint:** `components/onboarding/Step2PairingLeds.tsx:35` — `react-hooks/exhaustive-deps` (dependencia `enchufes`).
- **Constantes hardcodeadas** que simulan estado real (Sidebar 3/4, contador vivo del Hero) — confunden demo con producto.
- **Artefactos temporales en la raíz**: `capture-audit.mjs`, `capture-final.mjs`, `capture-screenshots.js`, `capture-screenshots.mjs`, `screenshot-eval.mjs`, `validate-production.mjs`, `validate-redesign.sh`, `validate-uniformity.sh`, `dev-server.log`, `journey-report.json`, `onboarding-report.json`, más `screenshots/` (~40 PNG), `artifacts/` (2 PNG), `test-results/`. Duplicación: `capture-screenshots` existe en raíz **y** en `scripts/`.
- **No hay script `typecheck`** pese a que `tsc --noEmit` pasa limpio.
- **Higiene de docs:** README/CLAUDE.md exponen públicamente el Vercel Project ID `prj_pgEpK6iqMMcvAYen38xR0Nb9QjgF`, el dominio `smartsense.c4a.cl` y la práctica de almacenar tokens en `.env.local` (con placeholders `ghp_…`, `vcp_…`, `cfut_…`). Los IDs no son secretos (riesgo BAJO), pero conviene limpiar la doc pública.

---

## 14. Riesgos para migrar a backend real

- **Modelo de dominio sin identidad ni tenant:** los tipos en español no contemplan `User`, `Organization`, `Membership`, `Installation`, `EnergyKit`, `Device`, `Telemetry`. Una migración 1:1 de tipos no basta.
- **Datos deterministas embebidos:** los componentes asumen presencia inmediata y síncrona de datos (import estático). El backend introduce estados de carga, error y vacío que hoy no se manejan.
- **Contador "vivo" falso:** `HeroNumerico` simula tiempo real con `setInterval`; al conectar telemetría real (WebSocket/MQTT) habrá que reemplazar la lógica, no envolverla.
- **Sin auth:** no existe flujo de login/registro ni gestión de sesión; todas las rutas son públicas y estáticas.
- **Sin manejo de errores de red ni offline real de datos:** el fallback PWA `/offline` es de shell, no de datos.
- **Naming en español vs specs en inglés:** divergencia de rutas y entidades que requiere mapeo explícito (ver §16).
- **Ausencia de tests:** sin red de seguridad, el riesgo de regresión durante la migración es alto.

---

## 15. Brechas frente a specs generadas (`E:\Cód\SmartSense\specs`)

Specs objetivo: `_canon.md`; 87 FR; 45 NFR; 21 tablas; OpenAPI 32 paths / 68 schemas; 17 rutas frontend objetivo; 17 servicios backend; roadmap F0–F7; matriz de trazabilidad 45 filas. Stack objetivo: Fastify + Prisma + PostgreSQL/TimescaleDB; Next App Router + React Query + Zustand + Recharts; MQTT + WebSocket; monorepo pnpm.

| Dimensión | Demo actual | Spec objetivo | Brecha |
|---|---|---|---|
| Rutas frontend | 9 (español, estáticas) | 17 (en inglés) | ~8 rutas faltantes + renombrado |
| Servicios backend | 0 | 17 | 17 faltantes |
| Endpoints API | 0 | 32 paths / 68 schemas | 100% |
| Tablas de datos | 0 (solo tipos TS) | 21 | 21 faltantes |
| FR cubiertos | núcleo de visualización demo | 87 FR | mayoría sin implementar |
| Tiempo real | `setInterval` simulado | MQTT + WebSocket | 100% |
| Estado cliente | useState local + localStorage | React Query + Zustand | parcial |

---

## 16. Brechas frente al MER / modelo relacional

El demo **no modela** ninguna de las entidades centrales del modelo relacional objetivo:

- **Faltan por completo:** `User`, `Organization`, `Membership`, `Installation`, `EnergyKit`, `Device`, `Telemetry`, y todo el concepto **multi-tenant**.
- **Mapeo demo → entidades spec:**
  - `Tarifa` → `Tariff` + `Distributor`
  - `ConsumoHoy` → `EnergyAggregate` / `TelemetryReading` (dashboard)
  - `FirmaElectrica` → breakdown por `DeviceCategory`
  - `Alerta` (tipo) → `Alert` + `Recommendation` (sugerencia/tip)
  - `Enchufe` → `Device`
  - `ReporteSemanal` → `reports` / `EnergyAggregate`
  - `onboardingDone` (localStorage) → `Onboarding` / `DevicePairing`
- **Onboarding:** demo = 3 pasos (QR → pairing → tarifa); spec más rico (scan-kit, pair-devices, installation-type, profile por segmento, bill-upload).

El demo es esencialmente una **vista de presentación** sin capa de identidad, propiedad de datos ni aislamiento entre clientes.

---

## 17. Brecha frente a API real

- **Cero APIs.** No hay API routes de Next, ni cliente HTTP, ni contrato OpenAPI consumido. Todos los datos son módulos importados en build.
- Spec objetivo: OpenAPI con 32 paths / 68 schemas. Brecha de implementación: **100%**.

---

## 18. Brecha frente a IoT real

- **Cero MQTT, cero telemetría real.** El único "tiempo real" es el `setInterval` cosmético de `HeroNumerico` y la animación `animate-pulse` del estado de kit hardcodeado en Sidebar.
- Spec objetivo: ingesta MQTT + WebSocket + TimescaleDB para series temporales. Brecha: **100%**.

---

## Resumen ejecutivo

SmartSense demo es un **mockup de presentación de alta fidelidad UI**, mobile-first, PWA, con formato CLP production-grade y acoplamiento a mock **superficial (7 sitios)**. Compila y pasa lint/tsc limpios. Sin embargo: **0 backend, 0 API, 0 DB, 0 auth, 0 IoT real, 0 tests funcionales**. La distancia frente a las specs es total en las capas de datos, API e IoT, y completa en el modelo multi-tenant. La buena noticia para la migración: el acoplamiento a datos es localizado y los helpers de formato y la UI son reutilizables.
