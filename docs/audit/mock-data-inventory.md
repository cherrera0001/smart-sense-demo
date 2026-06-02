# Inventario de datos simulados / hardcodeados — SmartSense (brownfield)

> Auditoría brownfield · 2026-06-01 · rama `chore/brownfield-spec-reconciliation` (base `origin/master` @ `a50edf6`).
> Alcance: repo `E:\Cód\SmartSense\smartsense-brownfield`. Fuente de hechos: `docs/audit/_evidence-brief.md` + apertura directa de archivos reales.
> Estado del sistema: **sin backend, sin DB, sin API routes, sin auth. 100% mock estático + `localStorage`.**
> Mapeo a futuro: `specs/04-api/openapi.yaml` (32 paths) y `specs/03-data-model/relational-model.md` (21 tablas, canon).

---

## REGLA DE SEGREGACIÓN (obligatoria, se aplica en todo el inventario)

**Ningún dato mock puede convivir con lógica productiva.** Todo dato simulado debe cumplir una de estas condiciones:

1. Vivir físicamente en una carpeta de aislamiento: `lib/fixtures/`, `mocks/`, `demo/`, `stories/` o `tests/` (incl. `e2e/`).
2. Estar gobernado por un flag explícito `DEMO_MODE` (env `NEXT_PUBLIC_DEMO_MODE`), de modo que en build productivo el camino de datos provenga **siempre** de la API.
3. Convertirse en **seed productivo** (catálogo real) y dejar de ser mock: solo aplica a datos de catálogo verificables (`device_categories`, `distributors`, `tariffs`), nunca a métricas de consumo/telemetría.

Consecuencia operativa: el `import` directo `@/lib/mock-data` desde componentes de runtime (hoy 7 sitios) es una violación de la regla y debe eliminarse. La capa de presentación consume un **data adapter** que en `DEMO_MODE` lee fixtures y en producción llama a React Query → API.

Clasificación usada por fila:
- **SEED PRODUCTIVO**: catálogo real, deriva a tabla + `seed prisma`.
- **DEMO-ONLY (flag)**: se conserva solo bajo `DEMO_MODE`, vive en `lib/fixtures/` o `demo/`.
- **FIXTURE/TEST**: insumo de tests/screenshots, mover a `e2e/` o `tests/fixtures/`.
- **REEMPLAZAR POR API**: dato de runtime que en MVP proviene del backend; el mock pasa a fixture demo-only.

---

## 1. Inventario detallado

| Dato | Archivo:línea | Significado | ¿Seed/demo? | ¿Mover a fixtures? | ¿Reemplazar por API? | Endpoint futuro (openapi) | Entidad/tabla (canon) | Riesgo si se mantiene mezclado |
|---|---|---|---|---|---|---|---|---|
| `tarifa` (CGE, Coquimbo, BT-1, 165 CLP/kWh) | `lib/mock-data.ts:3-8` | Tarifa eléctrica asignada a la instalación | **SEED PRODUCTIVO** (catálogo) + asignación vía API | Sí, mientras no haya DB → `lib/fixtures/` | Parcial: el catálogo es seed; la asignación se lee de la instalación | `GET /installations/{id}` (campo tariff), catálogo no expuesto aún | `tariffs` (+ `distributors`), FK en `installations.tariff_id` | Tarifa quemada para Coquimbo aplicada a todo usuario → cálculos CLP falsos para otra comuna/distribuidora; mezcla catálogo con dato de instalación |
| `clpKwh = 165` repetido como literal | `components/onboarding/Step3Tarifa.tsx:82` (`$165/kWh`) | Precio kWh mostrado en onboarding, **desacoplado** de `mock-data.ts` (que dice 165 también, pero es otro literal) | DEMO-ONLY (flag) | Sí | Sí (debe venir de `tariffs` según comuna seleccionada) | catálogo `tariffs` por `distributor`/comuna | `tariffs.price_clp_kwh` | Doble fuente de verdad del precio (componente vs mock-data); cambiar tarifa no se propaga; valor ficticio presentado como real |
| `comunas[]` (17 comunas hardcoded) | `Step3Tarifa.tsx:15-33` | Lista de comunas selectable en onboarding | **SEED PRODUCTIVO** (catálogo geográfico) | Sí | Sí (catálogo distribuidoras/comunas) | catálogo `distributors`/cobertura (no expuesto aún) | `distributors` (cobertura comunal) | Lista estática sin relación a distribuidora real; selección no determina tarifa real |
| `consumoHoy.kwh = 7.58`, `clp = 1250`, `deltaAyerPct = -6` | `lib/mock-data.ts:14-18` | Consumo del día y delta vs ayer | DEMO-ONLY (flag) | Sí | **Sí** | `GET /installations/{installationId}/dashboard`; `.../telemetry/latest` | `energy_aggregates` (rollup diario), `telemetry_readings` | Métrica inventada presentada como consumo real del usuario; engaño de producto y cálculo de ahorro falso |
| `consumoHoy.proyeccionFinMesClp = 42500` | `lib/mock-data.ts:18` | Proyección de gasto fin de mes | DEMO-ONLY (flag) | Sí | **Sí** (cálculo backend) | `GET .../dashboard` (campo projection) | `energy_aggregates` + lógica de proyección (servicio) | Proyección fija no recalculada; induce decisiones de gasto sobre dato ficticio |
| `consumoHoy.serieHoraria[24]` | `lib/mock-data.ts:19-44` | Curva horaria de costo del día (suma exacta = 1250) | DEMO-ONLY (flag) | Sí | **Sí** | `GET .../telemetry/range`, `.../dashboard` | `telemetry_readings` (hypertable) / `energy_aggregates` horario | Serie fabricada para cuadrar con el deck; no es telemetría real |
| `consumoHoy.serieMesAcumulada[35]` (IIFE, día 35 = 42500, >30 = proyección) | `lib/mock-data.ts:46-58` | Acumulado mensual real+proyección | DEMO-ONLY (flag) | Sí | **Sí** | `GET .../reports/monthly`, `.../dashboard` | `energy_aggregates` (diario acumulado) | Lógica de proyección embebida en mock (IIFE) dentro de runtime → algoritmo fake mezclado con presentación |
| `firmaElectrica[5]` (Refrigeración 38%, Climatización 24%, Electrónica 14%, Iluminación 12%, Lavado 12%; colores, tendencias, clpDia/kwhDia) | `lib/mock-data.ts:65-116` | Desglose de consumo por categoría de dispositivo | Categorías → **SEED PRODUCTIVO**; porcentajes/CLP → DEMO-ONLY | Sí (porcentajes/valores) | **Sí** (porcentajes/valores); catálogo de categorías es seed | `GET /installations/{installationId}/breakdown` | `device_categories` (catálogo: nombre, color) + `energy_aggregates.category_id` (valores) | Mezcla catálogo estable (categorías) con métricas inventadas; colores/tendencias quemados; % fijos presentados como medición |
| `alertas[3]` (anomalia/sugerencia/tip, `titulo`, `mensaje`, `ahorroEstimadoClp`, `timestamp` relativo a `Date.now()`, `leida`) | `lib/mock-data.ts:118-147` | Alertas y tips de ahorro | DEMO-ONLY (flag) | Sí | **Sí** | `GET /installations/{installationId}/alerts`; `POST /alerts/{id}/review`; `GET .../recommendations` | `alerts` (anomalia) + `recommendations` (sugerencia/tip) | Alertas falsas con ahorros en CLP ($4.200/mes, $180/año) presentados como reales; `leida` no persiste (estado en memoria); timestamps siempre "hace 2/4/6h" |
| `reporteSemanal` (`ahorroSemanaClp = 3850`, `huellaCarbonoKg = 42.5`, comparativa 2 semanas) | `lib/mock-data.ts:149-156` | Reporte semanal de ahorro y huella | DEMO-ONLY (flag) | Sí | **Sí** | `GET /installations/{installationId}/reports/weekly` | `energy_aggregates` (rollup semanal) | Ahorro y huella de carbono inventados; afirmación ambiental sin base |
| `enchufes[4]` (Refri/Lavadora/Microondas/TV; `estado` online/reconectando; `ultimoPingMs`; `dispositivoAsociado`) | `lib/mock-data.ts:158-187` | Dispositivos/enchufes inteligentes y su estado de conexión | DEMO-ONLY (flag) | Sí | **Sí** | `GET /installations/{installationId}/devices`, `GET /devices/{id}`, `GET /devices/{deviceId}/control-state` | `devices` (+ `device_pairings`); estado/ping → `control-state`/telemetría | Estado de conexión y ping fabricados; "Microondas reconectando" siempre fijo; no refleja device real |
| `mockEnchufes[4]` (lista propia del onboarding, animación de pairing por `setTimeout`) | `components/onboarding/Step2PairingLeds.tsx:15-20,25-35` | Simulación de emparejamiento LED azul→verde | DEMO-ONLY (flag) | Sí | **Sí** (flujo real de pairing) | `POST /onboarding/kit/scan`, `/onboarding/kit/claim`, `/onboarding/devices/pair`, `GET /onboarding/status` | `device_pairings`, `energy_kits`, `devices` | **Segunda fuente de verdad de enchufes** (distinta de `mock-data.enchufes`); pairing simulado con timers presentado como real |
| `serieMesAcumulada` constantes de proyección (`1400`, `41100`, divisor `34`) | `lib/mock-data.ts:50` | Parámetros de la curva fabricada | DEMO-ONLY (flag) | Sí | N/A (no es API; es algoritmo fake) | — | — | Constantes mágicas de proyección en runtime |
| Footer Sidebar: `"3/4 conectados"` / `"1/4 reconectando"` | `components/layout/Sidebar.tsx:55,59` | Estado del kit en barra lateral | DEMO-ONLY (flag) | Sí | **Sí** (derivar de `devices`/control-state) | `GET /installations/{installationId}/devices` (conteo por estado) | `devices.status` agregado | Texto quemado que **ni siquiera lee `enchufes`** (que serían 3 online / 1 reconectando por casualidad); se desincroniza al cambiar el mock |
| Progreso onboarding `{conectados} / {total}` | `Step2PairingLeds.tsx:82-84` | Contador derivado de `mockEnchufes` | DEMO-ONLY (flag) | Sí | Sí | `GET /onboarding/status` | `device_pairings` | Derivado de mock local; OK como UI pero atado a fuente fake |
| Contador vivo HeroNumerico (`+8..15 CLP` cada 5s, techo `TECHO_CLP_LIVE = 1450`) | `components/dashboard/HeroNumerico.tsx:10,16-25` | Animación de "costo subiendo en vivo" | **DEMO-ONLY (flag)** — efecto de demo, no dato | Sí (a `demo/` o tras flag) | No (no es un dato API; es animación de escaparate) | N/A | N/A | `Math.random()` incrementando un costo falso presentado como consumo en tiempo real; el más engañoso de cara a usuario/inversor |
| Colores fallback de chart (`#FF8A00`, `#3A4555`, etc.) | `components/dashboard/ProyeccionMes.tsx:11-19,32-38` | Tema visual (no dato de negocio) | KEEP (config UI) | No (son design tokens, ya leen CSS vars) | No | N/A | N/A | Bajo. Son fallbacks de tema, aceptables; no son datos simulados de negocio |
| `localStorage 'onboardingDone'` | `lib/hooks/useOnboarding.ts:10,16,21`; `e2e/screenshots.spec.ts` | Flag de onboarding completado | DEMO-ONLY ahora → **API en MVP** | N/A (es estado, no dato) | **Sí** (persistencia server-side) | `GET /onboarding/status` | `device_pairings`/estado onboarding por usuario | Persistencia solo local; no multi-dispositivo; no atado a usuario real |
| `localStorage 'theme'` (ThemeContext) | `lib/context/ThemeContext.tsx` (key `theme`) | Preferencia de tema claro/oscuro | KEEP (preferencia UI local) | No | No (preferencia de cliente, válido en local) | N/A | (opcional) `users` preferencias | Bajo. Preferencia de UI legítima en `localStorage` |
| `localStorage 'showIPhoneFrame'` | `components/layout/LayoutShell.tsx:15`; `app/demo/page.tsx:15`; `e2e/screenshots.spec.ts:46` | Toggle del marco iPhone para demo/screenshots | **DEMO-ONLY (flag)** | Sí (a `demo/`) | No | N/A | N/A | Artefacto de presentación; debe quedar fuera del build productivo (solo `DEMO_MODE`/screenshots) |
| Números del deck en `verify-deck.mjs` (`CLP_PARTS`, `KWH_PARTS`, `PCT_PARTS`, `HORARIA[24]`, asserts 1250/7.58/100) | `scripts/verify-deck.mjs:10-26` | Validación de coherencia numérica del mock vs deck | FIXTURE/TEST | **Sí** (mover a `tests/`) | No | N/A | N/A | **Duplica los valores de `mock-data.ts`** como literales separados → tercera fuente de verdad; valida el mock, no producción; debe degradarse a test de fixture y removerse del flujo productivo |
| `serieHoraria` re-hardcodeada en `verify-deck.mjs:24` | `scripts/verify-deck.mjs:24` | Copia literal de los 24 puntos horarios | FIXTURE/TEST | Sí | No | N/A | N/A | Mantener sincronizado a mano dos copias de la serie horaria es frágil; cualquier edición rompe sin avisar |

### Otros literales menores (inteligencia, no bloqueantes)
- `QuickActions.tsx` / `Sidebar.tsx` / `BottomNav`: items de navegación hardcoded (`/desglose`, `/alertas`, etc.). No son datos de negocio sino estructura de rutas; **KEEP**. Riesgo: bajo. Nota: rutas en español divergen de `specs/05-frontend/routes.md` (17 rutas objetivo en inglés) — reconciliar en migración, no en este inventario.
- `IPhoneFrame.tsx`: dimensiones del marco (`max-w-[440px]`, notch). DEMO-ONLY de presentación; vive ya en `components/layout` pero debe quedar tras `DEMO_MODE`/`demo/`.

---

## 2. Acoplamiento a mock (violaciones actuales de la regla)

7 `import` directos de `@/lib/mock-data` desde runtime (deben pasar por adapter):

1. `app/ajustes/page.tsx` → `enchufes`, `tarifa`
2. `app/alertas/page.tsx` → `alertas`
3. `app/desglose/page.tsx` → `firmaElectrica`
4. `app/reporte/page.tsx` → `reporteSemanal`
5. `components/dashboard/AlertasStrip.tsx` → `alertas`
6. `components/dashboard/HeroNumerico.tsx` → `consumoHoy`
7. `components/dashboard/ProyeccionMes.tsx` → `consumoHoy`

**Fuentes de verdad duplicadas detectadas (riesgo real de desincronización):**
- Enchufes: `mock-data.enchufes` (4) **vs** `Step2PairingLeds.mockEnchufes` (4) **vs** texto quemado `Sidebar` "3/4 conectados".
- Precio kWh: `mock-data.tarifa.clpKwh = 165` **vs** literal `$165/kWh` en `Step3Tarifa`.
- Serie/porcentajes: `mock-data.ts` **vs** `verify-deck.mjs` (copias literales).

---

## 3. Plan de destino propuesto (por categoría)

### 3.1 Seeds productivos (derivables a datos reales — catálogo verificable)
Estos dejan de ser mock y se convierten en datos de catálogo con `seed prisma`:

| Origen mock | Tabla canon | Contenido del seed | Fuente de verdad real requerida |
|---|---|---|---|
| `firmaElectrica[].nombre/categoria/color` | `device_categories` | Refrigeración, Climatización, Electrónica, Iluminación, Lavado (+ color de UI) | Catálogo de producto (estable) |
| `tarifa.distribuidora` + `Step3Tarifa.comunas[]` | `distributors` | CGE y demás distribuidoras con cobertura comunal | Datos públicos SEC/distribuidora |
| `tarifa.tipo/clpKwh` | `tariffs` | BT-1, BT-1A con `price_clp_kwh` por distribuidora/vigencia | Pliego tarifario vigente (no inventar 165 genérico) |

Nota: el **valor 165 CLP/kWh NO es seed productivo verificado** — es el número del deck. Para seed real se requiere tarifa publicada; mientras tanto va como fixture demo etiquetada.

### 3.2 Demo-only bajo `DEMO_MODE` (vive en `lib/fixtures/` o `demo/`, nunca en runtime productivo)
Todo lo que es métrica/telemetría/estado simulado y los efectos de escaparate:

- `consumoHoy` completo (kwh, clp, delta, proyección, `serieHoraria`, `serieMesAcumulada`) → `lib/fixtures/demo/consumo.ts`
- `firmaElectrica` valores (clpDia/kwhDia/porcentaje/tendencia) → `lib/fixtures/demo/breakdown.ts`
- `alertas` + `reporteSemanal` → `lib/fixtures/demo/alertas.ts`, `.../reporte.ts`
- `enchufes` + `mockEnchufes` (unificar en una sola fixture) → `lib/fixtures/demo/devices.ts`
- **Contador vivo HeroNumerico** (`+8..15`/5s, techo 1450) → efecto solo activo si `DEMO_MODE` (escaparate puro)
- **`showIPhoneFrame` / IPhoneFrame** → `demo/` + flag; fuera del build productivo
- Footer Sidebar "3/4 conectados" → derivar de fixture/devices bajo flag, no texto quemado

### 3.3 Fixtures de test (a `tests/` / `e2e/`)
- `verify-deck.mjs` (todos sus literales) → test de fixture en `tests/`; debe **importar** los valores desde la fixture única, no recopiarlos.
- `localStorage 'onboardingDone'` y `'showIPhoneFrame'` en `e2e/screenshots.spec.ts` → permanecen en e2e (correcto).

### 3.4 Estado/preferencias (legítimo en cliente, KEEP)
- `localStorage 'theme'` → preferencia de UI, KEEP.
- `localStorage 'onboardingDone'` → KEEP como cache local en demo; en MVP **reemplazar por** `GET /onboarding/status` (persistencia server-side ligada a usuario).

### 3.5 Arquitectura objetivo (cierre de la regla)
Introducir un **data adapter** único por dominio (`lib/data/*`):
- `DEMO_MODE=true` (env `NEXT_PUBLIC_DEMO_MODE`) → adapter resuelve desde `lib/fixtures/demo/*`.
- producción → adapter resuelve vía React Query contra los endpoints openapi listados.
- Eliminar los 7 `import @/lib/mock-data` de runtime; `mock-data.ts` se descompone en fixtures demo-only.
- `format.ts` permanece intacto (production-grade, KEEP).

---

## 4. Resumen ejecutivo

- **Riesgo mayor**: métricas de consumo/ahorro/huella/proyección y el contador vivo se presentan al usuario como datos reales en tiempo real, siendo 100% fabricados (incl. `Math.random()`).
- **Riesgo estructural**: 3 fuentes de verdad duplicadas (enchufes ×3, precio kWh ×2, serie/porcentajes ×2) que se desincronizan en silencio.
- **Convertibles a seed productivo**: solo `device_categories`, `distributors` y la **estructura** de `tariffs` (los precios requieren pliego real, no el 165 del deck).
- **Acción de cumplimiento de la regla**: extraer mocks a `lib/fixtures/demo/`, gobernar con `NEXT_PUBLIC_DEMO_MODE`, introducir data adapter + React Query, y degradar `verify-deck.mjs` a test que importe la fixture única.

---

## Estado Fase 1 (movimientos realizados)

> Lo efectivamente ejecutado en la implementación de Fase 1 (base de datos y dominio). Las acciones de §3 que dependen del data adapter / React Query siguen pendientes (Fase 4, frontend).

### Movimiento del mock a fixtures (DEMO-ONLY)

- `lib/mock-data.ts` se **movió** a **`apps/web/lib/fixtures/mock-data.ts`** — queda físicamente en carpeta de aislamiento (`lib/fixtures/`), marcado **DEMO-ONLY** y solo consumible bajo `DEMO_MODE` (`apps/web/lib/config/demo-mode.ts`, default `true`).
- Los **7 `import` directos** de runtime listados en §2 se **actualizaron** a la nueva ruta de fixtures (`@/lib/fixtures/mock-data`): `app/ajustes/page.tsx`, `app/alertas/page.tsx`, `app/desglose/page.tsx`, `app/reporte/page.tsx`, `components/dashboard/AlertasStrip.tsx`, `components/dashboard/HeroNumerico.tsx`, `components/dashboard/ProyeccionMes.tsx`.
- La descomposición fina en fixtures por dominio (`lib/fixtures/demo/consumo.ts`, `breakdown.ts`, etc.) y el **data adapter + React Query** de §3.5 **siguen pendientes** (Fase 4). En Fase 1 solo se consolidó el aislamiento físico + el gating por `DEMO_MODE`.

### Mocks traducidos a seeds productivos (`packages/db/prisma/seed.ts`)

El seed es **idempotente** (upserts con UUIDs deterministas + claves naturales) y separa catálogo global de datos demo:

| Origen mock | Destino en seed | Clasificación |
|---|---|---|
| `firmaElectrica[].nombre/categoria` | `device_categories` (refrigeración, climatización, electrónica, iluminación, lavado) | **Catálogo global** (sin tenant, sin `is_demo`) |
| `tarifa.distribuidora` (CGE) + Enel | `distributors` (CGE, Enel) | **Catálogo global** |
| `tarifa.tipo/clpKwh` (BT-1, 165) | `tariffs` (BT-1 CGE 165 CLP/kWh, BT-1A Enel) | **Catálogo global** (165 etiquetado como valor demo del deck, no tarifa verificada) |
| `organización` / usuario demo | `organizations` (`is_demo=true`), `users`, `memberships` | **DEMO** (bajo `is_demo=true`) |
| `installation` + perfil (Coquimbo, home, CGE+BT-1) | `installations`, `installation_profiles` | **DEMO** |
| `enchufes[]` / `mockEnchufes[]` | `energy_kits`, `devices`, `device_pairings` | **DEMO** |
| `alertas[]` | `alerts` | **DEMO** |
| boleta demo | `electricity_bills` | **DEMO** |

> Coherente con §3.1: solo catálogo verificable (`device_categories`, `distributors`, estructura de `tariffs`) deja de ser mock. Las **métricas de consumo/telemetría/ahorro/proyección** (`consumoHoy`, `serieHoraria`, `serieMesAcumulada`, `reporteSemanal`, contador vivo) **NO** se sembraron: permanecen exclusivamente como fixtures DEMO-ONLY bajo `DEMO_MODE`, nunca en la base. La regla de segregación se respeta: ningún dato mock de métrica vive en datos productivos.
