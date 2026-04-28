# Smart Sense — Mock Demo

**Mockup funcional para defensa de emprendimiento Smart Sense.**

Consume eléctrico en CLP en tiempo real, onboarding con pairing de enchufes, desglose por firma eléctrica, alertas predictivas y reporte semanal.

## Instalación

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:3000`.

## Rutas

- **`/onboarding`** — Flujo 3 pasos: QR → Pairing LEDs (automático) → Tarifa.
- **`/dashboard`** — Home con hero CLP (contador vivo), proyección mes, alertas, quick actions.
- **`/desglose`** — Pie chart de firma eléctrica, toggle hoy/semana/mes, listado de electros.
- **`/alertas`** — Master/detail de alertas, marcar como leídas.
- **`/reporte`** — Comparativa semanal, huella de carbono, gráfico barras.
- **`/ajustes`** — Tarifa, estado de enchufes (3 online + 1 reconectando), notificaciones.
- **`/demo`** — Quick nav entre pantallas, reset onboarding, toggle iPhone frame.

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS 3.x** (Midnight Voltage palette)
- **UI** (primitivos estilo shadcn, a mano; ver nota accesibilidad en defensa)
- **Recharts** (gráficos: Area, Bar, Pie)
- **lucide-react** (iconografía)

## Características

✅ **Live counter**: parte en $1.250, +$8 a +$15 cada 5 s, techo **$1.450**  
✅ **Firma 5 segmentos (deck)**: 38% / 24% / 12% / 14% / 12% → $1.250 y 7,58 kWh  
✅ **Validación numérica**: `pnpm verify-deck` o `node scripts/verify-deck.mjs`  
✅ **Pairing automático**: LEDs azul→verde en cascada (1.5s cada uno)  
✅ **iPhone frame**: Toggle en `/demo` para demo en defensa  
✅ **Mock data**: 100% estático, determinista, cero APIs  
✅ **Onboarding persistido**: localStorage, ruta `/demo` para reset  
✅ **Paleta Midnight Voltage**: Dark-first, acento energy (#00D87A)  
✅ **formatCLP()**: $42.500 (estándar chileno) en TODA cifra monetaria  

## Uso en Defensa

1. Local:
   ```bash
   pnpm dev
   ```

2. Navega:
   - Entra a `/demo`
   - Resetea onboarding si necesitas (botón)
   - Toggle iPhone frame si proyectas en pantalla (desktop)
   - Salta entre pantallas con quick nav

3. **NO SUBAS A VERCEL ANTES DE LA DEFENSA** — Riesgo de falla de red.

## Mobile-first

- Viewport principal: 380px
- Desktop: sidebar 240px + frame de iPhone (opcional)
- Responsive con Tailwind

## PWA (instalable como app)

Este proyecto ya incluye configuracion PWA para instalarse desde navegador (Chrome/Edge).

### Requisitos

- HTTPS en produccion (obligatorio para install prompt)
- `pnpm build` exitoso

### Ejecutar y probar local

```bash
pnpm build
pnpm start
```

Abre `http://localhost:3000`, luego:

- **Desktop (Chrome/Edge):** icono de instalar en la barra de direcciones.
- **Android (Chrome):** menu `Instalar app` o banner de instalacion.
- **iOS (Safari):** `Compartir -> Agregar a pantalla de inicio` (sin prompt automatico).

### Archivos PWA principales

- `public/manifest.webmanifest`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`
- `public/icons/icon-maskable.svg`
- `app/offline/page.tsx` (fallback offline)
- `next.config.js` (plugin `next-pwa`)

## Créditos

**C4A — Cybersecurity For All**  
Smart Sense Mock (defensa emprendimiento)
