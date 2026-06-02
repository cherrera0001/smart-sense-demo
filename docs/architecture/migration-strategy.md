# Estrategia de Migración — SmartSense (brownfield → spec-driven)

> Documento de arquitectura de transición. Deriva de `docs/audit/_evidence-brief.md`, `specs/_canon.md`, `specs/06-backend/backend-architecture.md` y `specs/05-frontend/routes.md`.
> Estado del repo base: `smart-sense-demo` (rama `chore/brownfield-spec-reconciliation`, base `origin/master @ a50edf6`). Hechos verificados el 2026-06-01.
> **Decisión tomada por el arquitecto:** **Estrategia A — Preserve UI, add backend gradually**, con reorganización controlada del app shell hacia la estructura objetivo (elementos de **B-lite**). Este documento la refleja y la justifica con la evidencia; no la reabre.

---

## 1. Punto de partida (evidencia)

| Dimensión | Hecho verificado |
|---|---|
| Stack | Next.js 15.5.14 (App Router), React 19.2, TS 5.9 strict, Tailwind 3.4, Recharts 2.15, lucide-react, date-fns, cva/clsx/tailwind-merge |
| PWA | `next-pwa` operativo (`public/sw.js`, `manifest.webmanifest`, fallback `/offline`) |
| Build | `pnpm build` **PASS** — 12 rutas estáticas. `tsc --noEmit` **PASS** (0 errores). `next lint` **PASS** (1 warning menor exhaustive-deps) |
| Tests | **No existen** (sin script `test`, sin unit/integration). Solo Playwright para screenshots |
| Backend | **Inexistente.** Sin ORM, sin DB, sin API routes, sin auth. 100% mock estático + localStorage |
| Acoplamiento a mock | **7 sitios** con import directo de `@/lib/mock-data` — superficial y localizado |
| Rutas | En **español** (`/dashboard`, `/desglose`, `/alertas`, `/reporte`, `/ajustes`, `/onboarding`, `/demo`, `/offline`, `/`). El canon objetivo usa rutas en inglés con route groups |
| Estado | localStorage como fuente de estado (`onboardingDone`, `theme`, `showIPhoneFrame`) + hook genérico `useLocalStorage<T>` |
| Componentes | 19 componentes de demo (6 `ui/`, 4 `layout/`, 4 `dashboard/`, 3 `onboarding/`, 1 `shared/`, 1 `theme/`) |
| `lib/format.ts` | `formatCLP`/`formatKwh`/`formatDelta`/`formatHora` — **production-grade, KEEP** |

**Lectura de la evidencia:** el activo es de alta calidad (build verde, TS strict limpio, design system coherente, PWA desplegable), el acoplamiento al mock es mínimo y aislado, y el dominio modelado es un subconjunto pobre del canon (no modela User/Organization/Installation/multi-tenant/telemetría real). El costo de migración está dominado por *renombrado de rutas + introducción de capa de datos*, no por reescritura de UI.

---

## 2. Las tres opciones evaluadas

### Opción A — Preserve UI, add backend gradually  ✅ ELEGIDA (con toque B-lite)

Conservar la UI y el design system actuales. Extraer el mock detrás de una **capa de acceso a datos** (`lib/api` + `lib/fixtures`) conmutada por un flag `DEMO_MODE`. Reemplazar localStorage como fuente de estado por **Zustand** (estado UI/onboarding) y **React Query** (estado de servidor). Introducir el backend Fastify por módulo, detrás del contrato OpenAPI ya existente. El "toque B-lite": **una reorganización controlada del app shell** hacia la estructura objetivo (route groups, rutas en inglés con redirects desde español), hecha de forma incremental sin reescribir componentes.

- **Pros:** preserva todo el valor de UI/PWA/demo; aprovecha build verde como red de seguridad; acoplamiento a mock se neutraliza en 7 puntos; migración rápida e incremental; la demo nunca se rompe; excelente para pitch/defensa (artefacto vivo desplegado); conectar API real es directo porque la UI ya consume datos vía capa intermedia.
- **Cons:** arrastra deuda menor del demo (dominio pobre, rutas español, sin tests) que debe saldarse en paralelo; requiere disciplina para que el mock no se filtre a lógica productiva; coexistencia mock/API añade una capa de indirección temporal.

### Opción B — Rebuild shell, salvage components

Reescribir el app shell (layouts, routing, providers, estado) desde cero según el canon, **rescatando** los componentes de presentación de alta calidad (`ui/`, gráficos, tarjetas de dashboard).

- **Pros:** shell limpio alineado al canon desde el día 1; sin deuda heredada de routing/estado.
- **Cons:** descarta trabajo de integración ya funcional; ventana donde la demo queda rota o degradada; mayor esfuerzo upfront sin entregar valor incremental; riesgo de regresión visual al re-cablear componentes rescatados. La parte *valiosa* de B (estructura objetivo de carpetas, route groups) se absorbe en A como "B-lite" sin pagar su costo.

### Opción C — Archive demo, build from specs

Archivar el demo como referencia y construir `apps/web` + `apps/api` desde cero a partir de las specs.

- **Pros:** máxima pureza arquitectónica; cero deuda heredada.
- **Cons:** **destruye valor** — descarta UI production-grade, PWA y demo desplegada que ya sirven para pitch/defensa comercial; el mayor time-to-value; alto riesgo de re-derivar peor lo que ya está bien hecho; pierde el design system maduro. Contradice el principio de no destruir activos validados.

---

## 3. Justificación de A (con toque B-lite)

| Criterio | A (elegida) | B | C | Veredicto |
|---|---|---|---|---|
| Calidad de código heredado | Se preserva (build verde, TS strict, design system) | Parcial (rescata componentes) | Se descarta | **A** maximiza reúso de calidad |
| Acoplamiento a mocks | Neutralizable en 7 sitios localizados | Igual, pero re-cableando todo | N/A (se reescribe) | **A** — el acoplamiento es trivial, no justifica rebuild |
| Claridad de componentes | Alta y ya organizada por dominio | Alta tras re-cablear | Por construir | **A/B** empatan; A no paga el re-cableo |
| Deuda técnica | Menor (rutas ES, dominio pobre, sin tests) saldada incrementalmente | Se reduce shell, se reintroduce riesgo de regresión | Cero, a costo total | **A** — la deuda es acotada y conocida |
| Velocidad de migración | Alta (incremental, sin downtime) | Media (esfuerzo upfront) | Baja (greenfield) | **A** |
| Riesgo de romper demo | Mínimo (flag + redirects) | Alto durante el rebuild | Total (demo archivada) | **A** |
| Utilidad para pitch/defensa | Máxima (demo viva evoluciona) | Degradada en transición | Nula hasta MVP | **A** |
| Facilidad de conectar API real | Alta (capa de datos + OpenAPI) | Alta tras rebuild | Alta pero diferida | **A** consigue lo mismo antes |

**Conclusión:** A domina en 7/8 criterios y empata en el restante. El único argumento real de B/C —shell limpio alineado al canon— se obtiene con el **toque B-lite** (route groups + rutas inglés con redirects + estructura objetivo de carpetas) **sin** pagar el costo de reescritura ni el riesgo de romper la demo. C se descarta por destrucción de valor.

---

## 4. Principios de migración (invariantes)

1. **No romper la demo.** En todo commit, `pnpm build`, `tsc --noEmit` y `next lint` siguen en verde; la demo desplegada (PWA) sigue navegable end-to-end. La red de seguridad es el build verde + (a futuro) los tests de contrato.
2. **`DEMO_MODE` como flag de conmutación.** `NEXT_PUBLIC_DEMO_MODE` decide si la capa de datos resuelve desde `lib/fixtures` (mock) o desde `lib/api` (API real). Default `true` durante toda la transición; se apaga por módulo a medida que el backend lo soporta.
3. **Mocks fuera de la lógica productiva.** Ningún componente, página o store importa `@/lib/mock-data` directamente. El mock vive solo en `lib/fixtures` y solo es accesible a través de la data-access layer. Los 7 imports directos actuales se erradican como primer paso.
4. **Rutas en inglés con redirects.** Las rutas objetivo del canon (inglés, route groups) se introducen y las rutas español actuales (`/desglose`, `/alertas`, `/reporte`, `/ajustes`) quedan como **redirects permanentes** para no romper enlaces de la demo desplegada ni QR/material de pitch.
5. **React Query/Zustand reemplazan localStorage como fuente de estado.** localStorage deja de ser la fuente de verdad: **Zustand** gobierna estado de UI y de onboarding; **React Query** gobierna estado de servidor (con caché/invalidación). localStorage queda relegado a persistencia secundaria opcional (ej. preferencia de tema), nunca como fuente de dominio.
6. **OpenAPI es el contrato.** El cliente tipado de `lib/api` se genera desde `specs/04-api/openapi.yaml`; la UI y el backend convergen contra el mismo contrato, no contra tipos ad-hoc.

---

## 5. Fases de conexión incremental (por módulo)

La conmutación es **por módulo de dominio**, no global. Cada módulo (dashboard, breakdown, alerts, reports, control, onboarding…) recorre las cuatro fases de forma independiente; el flag `DEMO_MODE` puede coexistir con módulos ya conectados a API real y módulos aún en fixtures.

| Fase | Nombre | Qué hace | Fuente de datos | Flag relevante | Estado demo |
|:--:|---|---|---|---|---|
| 0 | UI mock (estado actual) | UI consume `mock-data` por import directo | `lib/mock-data` (acoplado) | — | Verde |
| 1 | Data-access layer | Se interpone una capa de acceso; el mock se mueve a `lib/fixtures`; los 7 imports directos desaparecen | `lib/fixtures` vía capa | `DEMO_MODE=true` | Verde (sin cambio visible) |
| 2 | API client (tipado, contra fixtures-server o backend stub) | `lib/api` con cliente tipado generado desde OpenAPI; React Query orquesta fetching; Zustand toma el estado UI/onboarding | fixtures **o** API según flag | `DEMO_MODE` conmuta por módulo | Verde |
| 3 | Backend real por módulo | El módulo apunta a `apps/api` (Fastify) real; se valida contra contrato; `DEMO_MODE=false` para ese módulo | API real (Fastify+Prisma) | `DEMO_MODE=false` (módulo) | Verde |

**Regla de avance:** un módulo no pasa a Fase 3 hasta que (a) su endpoint existe en `apps/api`, (b) hay test de contrato verde contra `openapi.yaml`, y (c) la UI renderiza idéntico con fixtures y con API real (paridad visual). Mientras tanto convive en Fase 2 con el resto en fixtures.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El mock se filtra a lógica productiva | Regla de lint/revisión: prohibido importar `@/lib/mock-data` fuera de `lib/fixtures`; barrera revisada en cada PR |
| Drift entre fixtures y contrato real | Fixtures tipadas con los tipos generados desde OpenAPI; un cambio de contrato rompe la compilación de fixtures |
| Romper enlaces de la demo desplegada | Redirects español→inglés permanentes; QA de navegación en cada release |
| Dominio pobre del demo (sin multi-tenant) | El backend modela el canon completo; la UI consume solo lo que necesita por pantalla; los gaps (User/Org/Installation) se introducen primero en onboarding/auth |
| Regresión visual al introducir route groups | Reorganización "B-lite" mueve archivos sin reescribir componentes; screenshots Playwright como baseline de comparación |

---

*Referencias: `specs/_canon.md` (stack y dominio), `specs/05-frontend/routes.md` (rutas objetivo), `specs/06-backend/backend-architecture.md` (capas backend), `docs/audit/_evidence-brief.md` (hechos verificados).*
*Detalle de ejecución frontend: `docs/architecture/frontend-transition-plan.md`. Detalle backend: `docs/architecture/backend-transition-plan.md`.*
