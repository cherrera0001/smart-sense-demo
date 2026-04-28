# Definition of Done UX — 15 Checks Obligatorios

**Criterio:** PASS = visible + medible en screenshot. FAIL = ausente o no cumple spec.

---

## GATE 0: Fundaciones (CSS/Tailwind)

### Check 0.1 — Tailwind CSS carga sin errores
**Observable:** Ningún elemento con `style="..."` inline. Todos los estilos vienen de clases Tailwind/CSS.
**Medición:** Inspeccionar DevTools: color, spacing, borders vienen de class names, no inline.
**PASS:** 100% de elementos usan clases. FAIL: Algún elemento tiene inline style.

### Check 0.2 — Colores cumplen paleta Midnight Voltage
**Observable:** Colores de fondo, texto, bordes, highlights son exactamente de la paleta definida.
**Medición:** Contrastar vs. tailwind.config.ts: ink (#0B1220), ink-2 (#111A2E), ink-3 (#1B2A44), energy (#00D87A), gold (#FFC844), warn (#FF6B6B).
**PASS:** Todos los colores son de la paleta. FAIL: Hay colores "grises" o indefinidos.

### Check 0.3 — Sin HTML pelado (todos los elementos tienen estilo mínimo)
**Observable:** Ningún `<div>`, `<p>`, `<button>` sin clase. Todo tiene al menos padding/border/radius.
**Medición:** Screenshot. Buscar bordes duros, text sin color explícito, sin padding.
**PASS:** Todos los elementos tienen clase visual. FAIL: Hay elementos "desnudos".

---

## GATE 1: Design System Mínimo (Tokens + Componentes + Estados)

### Check 1.1 — Spacing tokens consistentes (8/12/16/24/32px)
**Observable:** Padding y margins usan solo: p-2/3/4/6/8, m-2/3/4/6/8.
**Medición:** Medir en DevTools o screenshot. ¿Hay p-5? ¿m-7? ¿Gaps raros?
**PASS:** 100% de spacing usa tokens. FAIL: Hay px custom o tokens inconsistentes.

### Check 1.2 — Radius consistente (sm/md/lg/xl)
**Observable:** Bordes redondeados: rounded-lg (8px) o rounded-xl (12px). Sin rounded-md, sin valores custom.
**Medición:** DevTools. ¿Qué radius tiene cada card, button, input?
**PASS:** Todos los elementos usan rounded-lg o rounded-xl. FAIL: Hay mix de radius (rounded-sm, 6px, etc).

### Check 1.3 — Componentes base con estados (Card, Button, Badge, Input)
**Observable:** Componentes definen default, hover, active, disabled, loading.
**Medición:** Código + screenshot. ¿Cada componente tiene archivo con variantes?
**PASS:** Todos los componentes en `/components/ui/` tienen states visibles. FAIL: Hay componentes sin states, o states no visibles.

### Check 1.4 — Shadows sistem (sin, sm, md, lg)
**Observable:** Cards/modals usan shadow-sm o shadow-md. Botones en hover usan shadow-md. Sin shadow custom.
**Medición:** DevTools box-shadow o screenshot. Contar sombras.
**PASS:** Shadows vienen de Tailwind (shadow-sm, shadow-md). FAIL: Hay shadow custom o inconsistente.

### Check 1.5 — Tipografía: size + weight + line-height
**Observable:** Títulos: text-base/lg/xl + font-bold. Body: text-sm + font-medium/regular. Labels: text-xs + font-semibold.
**Medición:** DevTools. ¿Qué size/weight tiene cada nivel?
**PASS:** Existe jerarquía clara. Títulos > body > labels. FAIL: Mix de sizes/weights sin lógica.

---

## GATE 2: UX por Journeys (Tarea + Tiempo + Fricción)

### Check 2.1 — Journey "Onboarding": empieza en / termina en /dashboard (tiempo ≤ 30s)
**Observable:** Usuario puede completar pasos 1-2-3-4-5 sin confusión. Botones "Siguiente" claros. CTA final es "Ir a Dashboard".
**Medición:** Tiempos en Playwright. Clicks por pantalla.
**PASS:** Journey completo sin loops/confusión, tiempo ≤ 30s. FAIL: Pasos confusos, loops, tiempo > 30s.

### Check 2.2 — Journey "Dashboard → Desglose → Alertas": ≤ 5s, max 3 clics
**Observable:** Dashboard carga. Click "Desglose" → carga en <2s. Click "Alertas" → carga en <1s. Modal alerta → click "Entendido" cierra limpio.
**Medición:** Timing + click count en Playwright.
**PASS:** 3 clics, tiempo total ≤ 5s, sin confusión. FAIL: >3 clics, tiempo >5s, o pasos confusos.

### Check 2.3 — CTA primaria (botón principal) visible en cada pantalla
**Observable:** Cada pantalla tiene 1 botón protagonista (bg-energy, font-bold). No hay duda qué hacer.
**Medición:** Screenshot. ¿Hay CTA green/energy? ¿Es el más visible?
**PASS:** 1 CTA claro por pantalla. FAIL: 0 CTA, o múltiples igual de prominentes.

---

## GATE 3: QA Visual (Screenshots 380/768/1440)

### Check 3.1 — Contraste WCAG AA (mínimo 4.5:1 en texto)
**Observable:** Texto oscuro sobre fondo claro, o texto claro sobre fondo oscuro. Legible.
**Medición:** WCAG checker tool o visual. ¿Se lee sin esfuerzo?
**PASS:** Todos los textos cumplen 4.5:1 contraste. FAIL: Hay textos grises sobre gris, o < 4.5:1.

### Check 3.2 — Responsive sin overflow en 380px
**Observable:** En móvil (380px), ningún elemento desborda. Cards, texto, botones caben sin scroll horizontal.
**Medición:** Screenshot 380px. ¿Hay scroll horizontal?
**PASS:** Cero overflow horizontal en 380px. FAIL: Hay elementos que se desbordan.

### Check 3.3 — Desktop (1440px) no tiene espacios muertos (uso eficiente)
**Observable:** En desktop, no hay "vacío" al lado. Layout distribuye contenido sin dejar zonas blancas inútiles.
**Medición:** Screenshot 1440px. ¿El layout se ve balanceado?
**PASS:** Contenido distribuido sin espacios inútiles. FAIL: Media pantalla vacía, o layout roto en desktop.

### Check 3.4 — Consistencia visual en 3 viewports (380/768/1440)
**Observable:** Componentes mantienen proporción, jerarquía y alignment en todos los tamaños.
**Medición:** 3 screenshots misma pantalla. ¿Los componentes se comportan igual?
**PASS:** Mismo aspecto visual en 380/768/1440. FAIL: Jerarquía rompe, o comportamiento diferente.

### Check 3.5 — Hover states visibles en 768/1440 (mouse targets)
**Observable:** Botones, links, cards cambian en hover. Feedback claro (color, shadow, scale).
**Medición:** DevTools hover simulation o video. ¿Hay cambio visual?
**PASS:** Todos los clickables tienen hover estado visible. FAIL: Botones sin hover, o hover imperceptible.

---

## GATE 4: Demo-Ready (Narrativa + Wow Moments)

### Check 4.1 — Copy microcopy amigable y sin jargón técnico
**Observable:** Botones, labels, errores usan lenguaje humano. Ej: "Entendido" no "OK". "Vas ahorrando" no "Delta negativo".
**Medición:** Leer cada texto en screenshots. ¿Es accesible a usuario no-técnico?
**PASS:** 100% de copy es humana, clara, sin jargon. FAIL: Hay términos técnicos o copy confuso.

### Check 4.2 — "Wow moments" identificados (2-3 máximo) y destacados
**Observable:** 2-3 interacciones que sorprenden (ej: número que sube en vivo, alerta modal con ahorro, animación entrada).
**Medición:** Listar wow moments + evidencia en screenshot.
**PASS:** 2-3 momentos identificados y visibles. FAIL: 0 momentos, o más de 3 (ruido).

### Check 4.3 — Tiempo demo (Dashboard → Alertas → back) ≤ 90s con narrativa
**Observable:** Script de 90s + 5 clics máximo + 3 frases del presentador.
**Medición:** Timing en Playwright + contar clics.
**PASS:** ≤ 90s, ≤ 5 clics, narrativa clara. FAIL: > 90s, > 5 clics, o narrativa confusa.

---

## Scoring

**Gate 0 (Fundaciones):** Checks 0.1, 0.2, 0.3 — Todos PASS = Gate OK. Si alguno FAIL = BLOQUEADO.
**Gate 1 (Design System):** Checks 1.1-1.5 — ≥4/5 PASS = Gate OK. <4 = BLOQUEADO.
**Gate 2 (UX Journeys):** Checks 2.1-2.3 — Todos PASS = Gate OK. Si alguno FAIL = BLOQUEADO.
**Gate 3 (QA Visual):** Checks 3.1-3.5 — ≥4/5 PASS = Gate OK. <4 = BLOQUEADO.
**Gate 4 (Demo-Ready):** Checks 4.1-4.3 — Todos PASS = UX aprobado.

**Resultado final:** Todos los gates PASS = "Demo-Ready". Si algún gate tiene <threshold = "No Demo".
