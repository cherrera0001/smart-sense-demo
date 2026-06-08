# Inventario de Componentes — Auditoría brownfield SmartSense

> Fuente de verdad: `docs/audit/_evidence-brief.md`. Hechos verificados leyendo los 19 componentes reales en `components/` el 2026-06-01.
> Stack: Next.js 15.5 (App Router), React 19.2, TS strict, Tailwind 3.4, Recharts 2.15, lucide-react, CVA. Sin backend: 100% mock estático + localStorage.
> Leyenda de decisión: **KEEP** (sirve tal cual) · **REFACTOR** (mantener pero desacoplar/expandir) · **REPLACE** (reescribir) · **DELETE** (eliminar) · **ARCHIVE** (conservar fuera del flujo productivo, solo demo).

## Resumen de decisiones

| Decisión | Cantidad | Componentes |
|---|---|---|
| KEEP | 9 | badge, button, card, dialog, input, select, RayoSvg, ThemeToggle, BottomNav |
| REFACTOR | 8 | LayoutShell, Sidebar, AlertasStrip, HeroNumerico, ProyeccionMes, QuickActions, Step2PairingLeds, Step3Tarifa |
| REFACTOR/expand | 1 | Step1QR |
| ARCHIVE | 1 | IPhoneFrame |

**Total inventariado: 19 componentes.**

---

## Tabla maestra

| Path | Propósito | Props principales | Dependencias (libs / otros comp) | ¿Mock/localStorage? | ¿Lógica de negocio? | ¿Reusable? | ¿Conectar a API? | Decisión | Justificación |
|---|---|---|---|---|---|---|---|---|---|
| `components/ui/badge.tsx` | Badge con variantes de severidad (default/outline/secondary/critical/warning/info/success/warn/gold) | `variant`, `className`, `...HTMLAttributes<div>` | CVA, `cn` (lib/utils) | No | No | Sí (primitivo) | No | **KEEP** | Primitivo shadcn-like, presentacional puro, tokens CSS. Base del design system. |
| `components/ui/button.tsx` | Botón con variantes (default/outline/ghost/secondary) y tamaños; touch target 44px | `variant`, `size`, `className`, `...ButtonHTMLAttributes` | CVA, `cn` | No | No | Sí (primitivo) | No | **KEEP** | Primitivo accesible, sin estado ni datos. |
| `components/ui/card.tsx` | Card + Header/Title/Content (composición) | `className`, `...HTMLAttributes` | `cn` | No | No | Sí (primitivo) | No | **KEEP** | Contenedor visual puro. |
| `components/ui/dialog.tsx` | Modal controlado: overlay, ESC, bloqueo de scroll, `DialogClose` | `open`, `onOpenChange`, `children` | lucide (`X`), React | No | No | Sí (primitivo) | No | **KEEP** | Modal controlado correcto. Mejora opcional: focus-trap/`role=dialog` para A11y completa, no bloqueante. |
| `components/ui/input.tsx` | Input estilizado h-44 con tokens | `className`, `type`, `...InputHTMLAttributes` | `cn` | No | No | Sí (primitivo) | No | **KEEP** | Primitivo de formulario. |
| `components/ui/select.tsx` | Select nativo estilizado con chevron | `className`, `...SelectHTMLAttributes` | lucide (`ChevronDown`), `cn` | No | No | Sí (primitivo) | No | **KEEP** | Primitivo de formulario; `<select>` nativo (sin dropdown custom). |
| `components/shared/RayoSvg.tsx` | Icono SVG de marca (rayo) | `className` | Ninguna | No | No | Sí | No | **KEEP** | Asset SVG inline, sin dependencias. |
| `components/theme/ThemeToggle.tsx` | Selector de tema (Claro/Oscuro/Sistema) | Ninguna (consume contexto) | lucide, `useTheme` (lib/context/ThemeContext) | localStorage `theme` vía ThemeContext (indirecto) | No (UI de preferencia) | Sí | No | **KEEP** | Preferencia de UI, no dato de negocio; localStorage legítimo. Deuda menor: estilos inline en vez de Tailwind/tokens. |
| `components/layout/BottomNav.tsx` | Nav inferior mobile, 5 items, ruta activa | Ninguna | next/link, next/navigation (`usePathname`), lucide | No | No | Sí (con menú parametrizable) | No | **KEEP** | Presentacional + routing. Items hardcodeados duplicados con Sidebar → al expandir a 8 módulos, extraer config de nav compartida. KEEP con nota de refactor menor. |
| `components/layout/Sidebar.tsx` | Nav lateral desktop (w-60), logo "Home Energy", footer estado kit | Ninguna | next/link, next/navigation, lucide, RayoSvg | **Footer hardcodea "3/4 conectados, 1/4 reconectando"** (dato de negocio simulado) | Sí (estado de dispositivos hardcodeado en JSX) | Parcial | **Sí (estado kit)** | **REFACTOR** | Solo **5 items** vs **8 módulos** del spec → expandir nav. Footer de estado debe venir de datos reales (devices online/offline), no hardcode. Extraer config de nav común con BottomNav. Marca "Home Energy" inconsistente con "SmartSense" → unificar. |
| `components/layout/LayoutShell.tsx` | Shell responsive: <768px BottomNav, ≥768px Sidebar + frame opcional | `children` | BottomNav, Sidebar, IPhoneFrame, `useLocalStorage` | localStorage `showIPhoneFrame` | No | Sí | No | **REFACTOR** | Shell válido pero acopla `IPhoneFrame` (demo). Detección desktop por `window.innerWidth` causa hydration flash (`isDesktop` arranca false). Al sacar IPhoneFrame del flujo, simplificar; considerar media query CSS o `useSyncExternalStore`. |
| `components/layout/IPhoneFrame.tsx` | Marco visual iPhone (notch) para demo/screenshots | `children`, `visible` | Ninguna | Activado por localStorage `showIPhoneFrame` (vía LayoutShell) | No | Solo demo | No | **ARCHIVE** | Puramente cosmético para presentaciones/deck. No aporta al MVP usable. Conservar fuera del render productivo (gate por `/demo` o flag de build), no eliminar para no perder material de venta. |
| `components/dashboard/HeroNumerico.tsx` | Card hero: costo CLP con **contador vivo** (setInterval 5s, techo 1450), delta vs ayer, proyección, CTA | Ninguna | next/link, lucide, `formatCLP/Delta/Kwh`, **`consumoHoy` (mock)**, Badge | **Import directo de mock-data** | Sí (incremento aleatorio simulado + techo `TECHO_CLP_LIVE`; lógica `isSaving`) | Solo tras refactor | **Sí (telemetría/EnergyAggregate)** | **REFACTOR** | Import directo de mock + simulación de "live" con `Math.random`. Inyectar `consumoHoy` por props/hook (React Query). El contador vivo debe alimentarse de telemetría real (WebSocket/MQTT) o polling, no de un intervalo random con techo fijo. UI conservable. |
| `components/dashboard/ProyeccionMes.tsx` | **Gráfico de área (Recharts)** consumo acumulado + proyección; lee colores de CSS vars por tema | Ninguna | **Recharts** (AreaChart/Area/XAxis/YAxis/Grid/Tooltip/ResponsiveContainer), `useTheme`, **`consumoHoy` (mock)** | Import directo de mock-data; `theme` (indirecto) | Parcial (distingue real vs `esProyeccion` en tooltip) | Solo tras refactor | **Sí (serie acumulada/proyección)** | **REFACTOR** | Gráfico correcto y theme-aware (buen patrón de colores por CSS var). Acopla `consumoHoy.serieMesAcumulada` desde mock → inyectar `data` por props/hook. La proyección debe calcularse en backend (EnergyAggregate), no venir precocida en el mock. Recharts: KEEP como librería de charting. |
| `components/dashboard/AlertasStrip.tsx` | Lista de alertas (cards) + modal de detalle; toggle leído/no-leído | Ninguna | Dialog, Badge, lucide, `formatCLP`, **`alertas` (mock)** | **Import directo de mock-data**; estado `readAlerts` solo en memoria (`useState`, NO persiste) | Sí (mapeo tipo→estilo/severidad; cálculo isNew; estado de lectura) | Solo tras refactor | **Sí (Alert/Recommendation)** | **REFACTOR** | Import directo de mock. El "marcar leído" no persiste (se pierde al recargar) — debe ir a API (PATCH alert.read) o al menos localStorage. Inyectar `alertas` por props/hook. Mapeo tipo→severidad debería derivar del modelo Alert del spec. |
| `components/dashboard/QuickActions.tsx` | Grid de 4 accesos rápidos (Desglose/Alertas/Reporte/Ajustes) | Ninguna | next/link, lucide | No | No | Sí | No | **REFACTOR** | Presentacional puro, sin mock. Solo 4 destinos hardcodeados → alinear con los 8 módulos del spec y, idealmente, parametrizar acciones. Refactor leve (sin urgencia de datos). |
| `components/onboarding/Step1QR.tsx` | Paso 1: pantalla "Kit recibido" + **QR simulado (no real)** | `onNext` | RayoSvg | No (QR es un placeholder visual "SS", no escanea) | No | Sí | **Sí (scan-kit)** | **REFACTOR/expand** | El QR es decorativo: no hay lectura de cámara ni validación de kit. El spec exige `scan-kit` real (asociar EnergyKit a Installation). Expandir a captura/validación real de código de kit. UI base reusable. |
| `components/onboarding/Step2PairingLeds.tsx` | Paso 2: **pairing simulado** de 4 enchufes con LEDs azul→verde por `setTimeout` | `onNext` | React (useState/useEffect) | **Lista `mockEnchufes` local hardcodeada**; auto-avanza al "conectar" todos | Sí (simulación de conexión por temporizadores) | Solo tras refactor | **Sí (pair-devices)** | **REFACTOR** | Pairing es 100% simulado (`setTimeout` 1.5s escalonado). Warning lint conocido (exhaustive-deps `enchufes`). El spec exige pairing real de Devices (MQTT/BLE). Reemplazar simulación por estado real de emparejamiento; conservar la UX de LEDs. |
| `components/onboarding/Step3Tarifa.tsx` | Paso 3: selección de tarifa (BT-1/BT-1A) y comuna; muestra "$165/kWh" | `onComplete` | Select, Button (importado, no usado), useState | **Tarifa/comuna en estado local; precio "$165/kWh" hardcodeado**; comunas hardcodeadas (no incluye distribuidora) | Sí (precio fijo, no calculado por distribuidora/comuna) | Solo tras refactor | **Sí (Tariff + Distributor)** | **REFACTOR** | Lista de comunas hardcodeada y precio fijo $165 sin relación real comuna→distribuidora→tarifa. El spec separa Tariff y Distributor; el precio debe resolverse vía API. Selección no se persiste al estado de la app. `Button` importado sin uso (limpiar). UI reusable. |

---

## Atención especial (análisis detallado)

### Gráficos (Recharts)
- **ProyeccionMes** es el único componente con Recharts en `components/` (las vistas `desglose`/`reporte` montan sus charts directamente en `app/*/page.tsx`, fuera del scope de carpeta pero relevantes para el plan). Patrón **theme-aware** correcto: lee `--chart-*` y `--brand-primary` de `getComputedStyle` y re-renderiza al cambiar `theme`. `isAnimationActive={false}` evita jank. **Recharts se mantiene** como librería de charting (coincide con stack objetivo). Deuda: `data` viene del mock; la distinción real/proyección (`esProyeccion`) está precalculada en el dataset. Al conectar API, la serie y la proyección deben venir del servicio EnergyAggregate.
- Bundle: el brief reporta desglose 214kB / reporte 215kB — Recharts es el principal contribuyente. Considerar code-splitting/lazy de los charts pesados al productivizar.

### Cards de dashboard
- **HeroNumerico** (contador vivo): el "live" es cosmético — `setInterval` cada 5s suma 8–15 CLP aleatorios hasta un techo fijo (`TECHO_CLP_LIVE = 1450`). No refleja consumo real. Es el mayor candidato a conectar telemetría real (WebSocket/MQTT o polling React Query). UI premium reusable.
- **AlertasStrip**: el toggle leído/no-leído vive solo en `useState` → **se pierde al recargar**. El brief mapea esto a un gate del MVP ("marcar alertas leídas persistente"). Debe persistir vía API (o al menos localStorage como quick win).
- **ProyeccionMes**: ver sección Gráficos.
- **QuickActions**: sin datos, solo navegación; el único riesgo es desalineación con los 8 módulos.

### Navegación / Sidebar
- **Sidebar (desktop) y BottomNav (mobile) duplican** la misma lista de 5 items: Inicio/Desglose/Alertas/Reporte/Ajustes. El spec define **8 módulos** → ambos quedan cortos. Recomendación: extraer una única config de navegación compartida y expandir a 8 módulos (Sidebar REFACTOR principal; BottomNav KEEP con ese refactor menor).
- Sidebar **mezcla negocio**: el footer "3/4 conectados, 1/4 reconectando" está hardcodeado en JSX → debe derivar del estado real de Devices.
- Inconsistencia de marca: Sidebar dice "Home Energy", el resto del producto es "SmartSense" → unificar.

### Layout mobile/desktop
- **LayoutShell** decide por `window.innerWidth >= 768`: arranca `isDesktop=false` → posible flash de layout mobile en desktop (hydration). Acopla `IPhoneFrame`. REFACTOR para sacar el frame del flujo y, si se desea, resolver el breakpoint con CSS/`useSyncExternalStore`.
- **IPhoneFrame**: solo demo/screenshots → **ARCHIVE** (no eliminar; material de venta/deck).

### Componentes de onboarding (colapsados vs spec)
- Los 3 pasos están **colapsados/simulados** frente al spec más rico (scan-kit, pair-devices, installation-type, profile por segmento, bill-upload):
  - **Step1QR**: QR decorativo, sin escaneo real → REFACTOR/expand a `scan-kit`.
  - **Step2PairingLeds**: pairing simulado por timers, lista local → REFACTOR a `pair-devices` real.
  - **Step3Tarifa**: precio $165 y comunas hardcodeados, sin Distributor, sin persistencia → REFACTOR a `Tariff + Distributor` vía API.
- Faltan pasos del spec (installation-type, profile, bill-upload) → expandir el flujo, no solo refactorizar los 3 existentes.

### Alertas / Desglose / Reportes / Ajustes
- Estas son **rutas** (`app/*/page.tsx`), no componentes de `components/`; importan mock directamente (alertas, firmaElectrica, reporteSemanal, enchufes+tarifa). El único componente de carpeta que las sirve es **AlertasStrip** (dashboard). El trabajo de desacople de mock en esas rutas se trata en el inventario de páginas/rutas, no aquí.

### Primitivos ui/ (shadcn-like)
- Los 6 primitivos (`badge`, `button`, `card`, `dialog`, `input`, `select`) son presentacionales puros, sin mock ni negocio, basados en CVA + tokens CSS → **KEEP** en bloque. Forman el design system reutilizable. Mejora opcional no bloqueante: focus-trap/`role="dialog"` en Dialog.

---

## Notas transversales (deuda detectada)
- **Acoplamiento a mock localizado**: solo 4 componentes importan `@/lib/mock-data` directamente (HeroNumerico, ProyeccionMes, AlertasStrip + Step2 con lista local) → desacople de bajo costo vía props/hooks de React Query.
- **Estado no persistente**: AlertasStrip (leído) y Step3 (tarifa/comuna) no persisten selección.
- **Duplicación de nav**: Sidebar + BottomNav.
- **Inconsistencia de marca**: "Home Energy" (Sidebar) vs "SmartSense".
- **Limpieza menor**: `Button` importado y no usado en Step3; warning `react-hooks/exhaustive-deps` en Step2PairingLeds:35; `ThemeToggle` usa estilos inline en vez de tokens Tailwind.
