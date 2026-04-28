# HANDOFF — Smart Sense Demo Build

## Estado Actual (28-Abr-2026)

### ✅ Completado

**Arquitectura:**
- Next.js 15 (App Router, TypeScript strict)
- Tailwind CSS **3.x** con paleta Midnight Voltage (`tailwindcss` en `package.json`)
- Recharts para gráficos (Area, Bar, Pie)
- Componentes UI custom (Button, Card, Badge, Dialog, Input, Select)

**Rutas implementadas:**
- `/` — redirect a onboarding o dashboard según localStorage
- `/onboarding` — 3 pasos (QR → LED pairing cascade → tarifa)
- `/dashboard` — hero contador vivo + proyección + alertas + quick actions
- `/desglose` — pie chart de firma eléctrica, toggle hoy/semana/mes
- `/alertas` — master/detail, marcar como leída
- `/reporte` — comparativa semanal, huella de carbono
- `/ajustes` — tarifa, estado enchufes, notificaciones
- `/demo` — quick nav entre pantallas, reset onboarding, toggle iPhone frame

**Fixes aplicados:**

1. **Fix #1 — Cifras alineadas al deck:**
   - `consumoHoy.kwh = 7.58`
   - `consumoHoy.clp = 1250`
   - `consumoHoy.proyeccionFinMesClp = 42500`
   - `serieHoraria` suma exacta $1.250 (24 horas)
   - `serieMesAcumulada` alcanza $42.500 en día 35 (días >30 son proyección)
   - `firmaElectrica` 5 categorías con porcentajes exactos:
     - Refrigeración 24/7: 38% ($475)
     - Climatización: 24% ($300)
     - Iluminación: 12% ($150)
     - Electrónica menor: 14% ($175)
     - Lavado/Secado: 12% ($150)

2. **Fix #2 — Live counter con techo:**
   - HeroNumerico.tsx inicia en `consumoHoy.clp` ($1.250)
   - `setInterval` cada 5000ms
   - Incremento: `8 + Math.floor(Math.random() * 8)` (rango $8-$15)
   - Techo: `Math.min(newVal, 1450)` — se detiene en $1.450
   - Cleanup: `clearInterval` en return del useEffect

3. **Verificación sin dependencias:**
   - `scripts/verify-deck.mjs` valida cifras sin instalar node_modules

**Archivos clave:**
- `lib/mock-data.ts` — datos coherentes con deck
- `lib/types.ts` — interfaces TypeScript
- `lib/format.ts` — formatCLP, formatKwh, formatDelta, formatHora
- `lib/hooks/` — useOnboarding, useLocalStorage, usePeriodo
- `components/dashboard/HeroNumerico.tsx` — contador vivo
- `app/` — rutas y layout
- `.claude/settings.json` — PowerShell default
- `CLAUDE.md` — reglas para futuras sesiones

### ❌ Pendiente

- `pnpm install` (dependencias)
- `pnpm build` (verificar TS strict)
- Screenshots (380px mobile + 1440px desktop con iPhone frame)
- Deploy a Vercel (post-defensa)
- Reemplazar UI custom por shadcn CLI (futuro)

---

## Comandos — Ejecutá EXACTAMENTE EN ESTE ORDEN en **tu** PowerShell (no el sandbox del agente)

**Nota:** si ya usás Node en otros proyectos, primero `node -v` / `where.exe node` en **tu** máquina. El agente puede no ver tu PATH; no reinstales Node LTS “por defecto” sin comprobar (ver **VERIFICATION.md — Escenarios A/B/C**).

### 1. Verificar Node.js y pnpm

```powershell
node --version
pnpm --version
where.exe node
where.exe pnpm
```

**Si `node` ok pero pnpm no está (Escenario B):**
```powershell
npm install -g pnpm
```

### 2. Validar deck (sin instalar dependencias)

```powershell
cd "C:\Users\c4all\Documents\C4A\C4A\smart-sense-demo"
node scripts\verify-deck.mjs
```

**Esperado:** Output similar a:
```
verify-deck: OK {
  clpDiaTotal: 1250,
  kwhDiaTotal: 7.58,
  porcentajes: 100,
  horariaClp: 1250
}
```

### 3. Instalar dependencias

```powershell
pnpm install
```

**Esperado:** ~20 paquetes instalados (react, next, recharts, lucide-react, date-fns, tailwind, etc.)

### 4. Build TS strict

```powershell
pnpm build
```

**Esperado:** Build limpio sin errores TS. Si falla → ver TROUBLESHOOTING.md

### 5. Lint (opcional)

```powershell
pnpm lint
```

### 6. Dev server

```powershell
pnpm dev
```

**Esperado:** http://localhost:3000 — si no estás en onboarding, vás a `/dashboard`

---

## Verificaciones Visuales Esperadas

Cuando levantes `pnpm dev` y abras http://localhost:3000:

### `/dashboard` (si onboarding ya se completó, o fuerza en `/demo` → Toggle → Reset)
- [ ] Hero muestra `$1.250` en color energy (#00D87A)
- [ ] Contador incrementa +$8 a +$15 cada 5 segundos
- [ ] Contador se detiene en `$1.450` (no sube más)
- [ ] "Proyección fin de mes" muestra `$42.500` en color gold (#FFC844)
- [ ] 2 alertas visibles (anomalía + sugerencia)
- [ ] 4 quick actions (Desglose, Alertas, Reporte, Ajustes)

### `/desglose`
- [ ] Pie chart muestra 5 segmentos de colores distintos
- [ ] Refrigeración (38%, azul #5B7FFF) es el más grande
- [ ] Toggle "Hoy/Esta semana/Este mes" cambia vista
- [ ] Listado de 5 dispositivos con tendencias (trending up/down/flat)

### `/alertas`
- [ ] 3 alertas listadas (1 no leída, 2 no leídas)
- [ ] Click en alerta abre Dialog con detalles
- [ ] "Marcar como leída" actualiza estado visual
- [ ] Cierra con Escape o click fuera

### `/reporte`
- [ ] Bar chart: "Semana pasada" ($7.400) vs "Esta semana" ($6.550)
- [ ] Ahorro semanal: `$3.850` 
- [ ] Huella de carbono: `42.5 kg CO₂` con ícono Leaf

### `/ajustes`
- [ ] Tarifa: BT-1, $165/kWh, Coquimbo, CGE (read-only)
- [ ] Enchufes: 3 online (verde), 1 reconectando (amarillo/naranja)
- [ ] Toggle de notificaciones

### `/onboarding` (reset en `/demo`)
- [ ] **Paso 1:** QR mock, botón "Siguiente"
- [ ] **Paso 2:** 4 LEDs en cascada (azul pulsing → verde fijo, 1.5s stagger cada uno)
- [ ] **Paso 3:** Select de tarifa (BT-1), input de comuna, botón "Completar"
- [ ] Onboarding completa y redirige a `/dashboard`

### `/demo`
- [ ] Quick nav con enlaces a todas las rutas
- [ ] Botón "Resetear Onboarding" limpia localStorage
- [ ] Toggle "iPhone Frame" activa/desactiva overlay de pantalla

### Responsive (mobile 380px vs desktop 1440px)
- [ ] 380px: BottomNav fija al pie (Home, Zap, AlertCircle, BarChart3, Settings)
- [ ] 1440px: Sidebar izquierda 240px + iPhone frame (si toggled)
- [ ] Desktop: "Estado del kit: 3/4 conectados" en footer de sidebar

---

## Si el build falla

Ver **TROUBLESHOOTING.md** para los 5 errores más comunes y sus fixes.

Si el error no está en TROUBLESHOOTING.md:
1. Copia el output COMPLETO de `pnpm build`
2. Pásalo a Claude Code en una nueva sesión
3. No intentes fixear tú mismo — espera a que Claude lea el error

---

## Próxima iteración (post-defensa)

- [ ] Screenshots: Playwright headless a 380px y 1440px
- [ ] Reemplazar componentes UI custom con `pnpm dlx shadcn@latest add`
- [ ] Deploy a Vercel: `pnpm build && git push vercel main`
- [ ] Analytics y error tracking
- [ ] Autenticación real (no mock)
- [ ] Backend API (no mock-data)
