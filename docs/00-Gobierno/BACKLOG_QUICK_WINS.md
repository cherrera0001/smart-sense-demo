# 📋 Backlog Quick Wins — Semana 1 (3 días, 5 tareas)

**Prioridad:** Orden exacto. No saltar tareas.

---

## TAREA 1️⃣: Agregar Demo Mode Banner (4 horas)

**Objetivo:** Usuario entiende inmediatamente que es prototipo.

**Archivos a tocar:**
- `components/layout/LayoutShell.tsx` — agregar banner

**Criterio de terminado:**
- [ ] Banner "⚠️ Modo Demo — Datos ficticios con fines de presentación" visible en TODAS las páginas
- [ ] Banner es amarillo/naranja (severity-warning)
- [ ] Banner cierra con X (checkbox "Don't show again" en localStorage)
- [ ] En mobile (380px): banner no rompe layout
- [ ] En desktop: centered, no invade contenido principal

**Código cambios específicos:**

Abre `components/layout/LayoutShell.tsx`, busca `export function LayoutShell`:

```tsx
// ANTES
export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header + Nav */}
      <BottomNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}

// DESPUÉS
export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(true)

  useEffect(() => {
    const hidden = localStorage.getItem('hideDemoBanner') === 'true'
    setShowBanner(!hidden)
  }, [])

  const handleCloseBanner = () => {
    setShowBanner(false)
    localStorage.setItem('hideDemoBanner', 'true')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Demo Banner */}
      {showBanner && (
        <div className="bg-severity-warning/15 border-b border-severity-warning/40 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-severity-warning">
            ⚠️ Modo Demo — Datos ficticios con fines de presentación
          </p>
          <button
            onClick={handleCloseBanner}
            className="text-severity-warning hover:opacity-70 transition-opacity"
            aria-label="Cerrar banner de demostración"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header + Nav */}
      <BottomNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

**Test manual:**
```bash
pnpm dev
# Visita cualquier ruta
# ✅ Banner visible en header
# ✅ Clickear X cierra banner
# ✅ Refresh page: banner sigue cerrado
```

---

## TAREA 2️⃣: Deshabilitar/Remover Botones Muertos en Ajustes (3 horas)

**Objetivo:** No hay botones que parecen funcionales pero no hacen nada.

**Archivos a tocar:**
- `app/ajustes/page.tsx` — botón "Cambiar tarifa" + checkboxes notificaciones

**Criterio de terminado:**
- [ ] Botón "Cambiar tarifa" tiene `disabled` + `title="En construcción"`
- [ ] Checkboxes notificaciones ahora persisten en localStorage y recuperan valor al recargar
- [ ] Cambio visual claro: botones disabled tienen opacity 50% + cursor not-allowed

**Código cambios específicos:**

En `app/ajustes/page.tsx`, busca sección "Tarifa" (~línea 30):

```tsx
// ANTES
<button className="w-full mt-4 btn-primary btn-small hover:bg-brand-primary-dark">
  Cambiar tarifa
</button>

// DESPUÉS
<button 
  disabled 
  title="En construcción — disponible en próxima versión"
  className="w-full mt-4 btn-primary btn-small opacity-50 cursor-not-allowed"
>
  Cambiar tarifa
</button>
```

Para checkboxes (busca "Notificaciones" ~línea 110):

```tsx
// ANTES
<input
  type="checkbox"
  defaultChecked
  className="w-5 h-5 rounded cursor-pointer accent-success"
/>

// DESPUÉS (dentro del component, agregar hook):
export default function AjustesPage() {
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = localStorage.getItem('notificationPrefs')
    return saved ? JSON.parse(saved) : {
      alertas: true,
      recomendaciones: true,
      tips: true,
    }
  })

  const handleNotifChange = (key: string) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    localStorage.setItem('notificationPrefs', JSON.stringify(updated))
  }

  // En el map:
  {[
    { key: 'alertas', label: 'Alertas', desc: 'Notificaciones de anomalías detectadas' },
    { key: 'recomendaciones', label: 'Recomendaciones', desc: 'Tips personalizados de ahorro' },
    { key: 'tips', label: 'Tips de ahorro', desc: 'Consejos semanales' }
  ].map((item) => (
    <div key={item.key} className="flex items-center justify-between ...">
      <div>
        <p className="text-sm font-semibold text-text-primary">{item.label}</p>
        <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
      </div>
      <input
        type="checkbox"
        checked={notifPrefs[item.key]}
        onChange={() => handleNotifChange(item.key)}
        className="w-5 h-5 rounded cursor-pointer accent-success"
      />
    </div>
  ))}
```

**Test manual:**
```bash
# En /ajustes
# ✅ Botón "Cambiar tarifa" está disabled (gris, cursor not-allowed)
# ✅ Toggle cada checkbox
# ✅ Refresh page: checkboxes mantienen estado
```

---

## TAREA 3️⃣: Persistir Alertas Leídas en localStorage (4 horas)

**Objetivo:** Alertas marcadas como leídas no reaparecen al recargar.

**Archivos a tocar:**
- `lib/hooks/useAlerts.ts` — CREAR (nuevo hook)
- `components/dashboard/AlertasStrip.tsx` — usar hook
- `app/alertas/page.tsx` — usar hook

**Criterio de terminado:**
- [ ] Hook `useAlerts()` existe y maneja lectura/escritura de localStorage
- [ ] AlertasStrip y alertas/page.tsx usan el mismo hook
- [ ] Marcar alerta como leída → localStorage.setItem
- [ ] Refresh página → alertas previamente leídas mantienen estado
- [ ] No hay duplicación de lógica
- [ ] Tests: localStorage roundtrip

**Código nuevo — crear archivo:**

`lib/hooks/useAlerts.ts`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { alertas as mockAlertas } from '@/lib/mock-data'

export function useAlerts() {
  const [alertas, setAlertas] = useState(mockAlertas)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('readAlertIds')
    if (saved) {
      setReadIds(new Set(JSON.parse(saved)))
    }
    setMounted(true)
  }, [])

  // Save to localStorage when readIds changes
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('readAlertIds', JSON.stringify([...readIds]))
  }, [readIds, mounted])

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set([...prev, id]))
  }

  const markAsUnread = (id: string) => {
    const newSet = new Set(readIds)
    newSet.delete(id)
    setReadIds(newSet)
  }

  return {
    alertas,
    readIds,
    markAsRead,
    markAsUnread,
    mounted,
  }
}
```

**Refactor AlertasStrip.tsx:**

Busca `export function AlertasStrip()`:

```tsx
// ANTES
const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
const alert = alertas.find(a => a.id === selectedAlert)
const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set(alertas.filter(a => a.leida).map(a => a.id)))

const handleToggleRead = (id: string) => {
  const newRead = new Set(readAlerts)
  if (newRead.has(id)) {
    newRead.delete(id)
  } else {
    newRead.add(id)
  }
  setReadAlerts(newRead)
}

// DESPUÉS
const { alertas, readIds, markAsRead, mounted } = useAlerts()
const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
const alert = alertas.find(a => a.id === selectedAlert)

const handleToggleRead = (id: string) => {
  markAsRead(id)
}

// En render:
{alertas.map(a => {
  const isRead = readIds.has(a.id)
  // ... rest of render
}
```

**Refactor alertas/page.tsx:**

Similar al anterior. Reemplazar `useState(mockAlertas)` con `useAlerts()`.

**Test manual:**
```bash
cd smart-sense-demo
pnpm dev

# En /alertas
# 1. Marca una alerta como leída
# 2. Refresh page
# ✅ Alerta sigue como leída
# 3. Open DevTools → localStorage
# ✅ readAlertIds contiene los IDs leídos
```

---

## TAREA 4️⃣: Extraer Lógica Duplicada de getAlertStyle() (2 horas)

**Objetivo:** Mismo código en 2 archivos. DRY principle.

**Archivos a tocar:**
- `lib/utils.ts` — agregar función
- `components/dashboard/AlertasStrip.tsx` — importar
- `app/alertas/page.tsx` — importar

**Criterio de terminado:**
- [ ] Función `getAlertStyle()` está en `lib/utils.ts`
- [ ] Ambos archivos (AlertasStrip, alertas/page) importan y usan
- [ ] Exports en `lib/utils.ts` incluyen la función
- [ ] No hay duplicación

**Código nuevo — agregar a `lib/utils.ts`:**

```tsx
import { AlertTriangle, Lightbulb, AlertCircle } from 'lucide-react'

export function getAlertStyle(tipo: string) {
  if (tipo === 'anomalia') {
    return {
      icon: <AlertTriangle className="w-5 h-5" />,
      badgeVariant: 'warning' as const,
      severityLabel: 'Anomalía detectada',
      accentColor: 'var(--severity-warning)',
      iconColor: 'text-severity-warning',
    }
  }
  if (tipo === 'sugerencia') {
    return {
      icon: <Lightbulb className="w-5 h-5" />,
      badgeVariant: 'info' as const,
      severityLabel: 'Sugerencia',
      accentColor: 'var(--severity-info)',
      iconColor: 'text-severity-info',
    }
  }
  return {
    icon: <AlertCircle className="w-5 h-5" />,
    badgeVariant: 'critical' as const,
    severityLabel: 'Crítica',
    accentColor: 'var(--severity-critical)',
    iconColor: 'text-severity-critical',
  }
}
```

En `AlertasStrip.tsx`, reemplazar `const getAlertStyle = ...` con:
```tsx
import { getAlertStyle } from '@/lib/utils'

export function AlertasStrip() {
  const { alertas, readIds, markAsRead, mounted } = useAlerts()
  // getAlertStyle ya está importada, usa directamente:
  const styles = getAlertStyle(a.tipo)
```

Ídem en `alertas/page.tsx`.

**Test:**
```bash
pnpm lint
# ✅ Sin warnings de código duplicado
```

---

## TAREA 5️⃣: Mejorar Accesibilidad Modal de Alertas (2 horas)

**Objetivo:** Modal cumple WCAG AA.

**Archivos a tocar:**
- `components/ui/dialog.tsx` — si es componente custom
- `components/dashboard/AlertasStrip.tsx` — uso de dialog

**Criterio de terminado:**
- [ ] Dialog tiene `role="dialog"` + `aria-modal="true"`
- [ ] Dialog tiene aria-label o aria-labelledby
- [ ] Cerrar con ESC funciona
- [ ] Focus trap dentro del modal
- [ ] Close button tiene aria-label

**Código cambios — si AlertasStrip abre dialog inline:**

Busca donde se renderiza el dialog (línea ~180 en AlertasStrip):

```tsx
// Verificar que el dialog tenga estos atributos:
<Dialog open={selectedAlert !== null} onOpenChange={open => !open && setSelectedAlert(null)}>
  <div 
    role="dialog" 
    aria-modal="true"
    aria-labelledby="alert-modal-title"
  >
    {/* Header */}
    <h2 id="alert-modal-title" className="text-lg font-semibold">
      {alert?.titulo}
    </h2>

    {/* Close button */}
    <button
      onClick={() => setSelectedAlert(null)}
      className="absolute top-4 right-4"
      aria-label="Cerrar modal de alerta"
    >
      ✕
    </button>

    {/* Content */}
  </div>
</Dialog>
```

**Test con keyboard:**
```bash
# En /dashboard o /alertas
# 1. Tab hasta alert card
# 2. Enter abre modal
# ✅ Focus está dentro del modal
# 3. Press ESC
# ✅ Modal cierra, focus vuelve a card
# 4. Tab ciclando dentro modal (sin escapar fuera)
```

---

## CHECKLIST DE ACEPTACIÓN (Fin Semana 1)

- [ ] T1: Demo banner visible en todas las páginas
- [ ] T1: Demo banner persiste (localStorage)
- [ ] T2: Botón "Cambiar tarifa" disabled con tooltip
- [ ] T2: Checkboxes notificaciones persisten en localStorage
- [ ] T3: Hook `useAlerts()` creado y usado en 2 componentes
- [ ] T3: Alertas leídas persisten (refresh page test passed)
- [ ] T4: `getAlertStyle()` extraído, sin duplicación
- [ ] T5: Dialog tiene role + aria-modal + aria-label + ESC handler
- [ ] Prueba visual: todas las rutas en mobile (380px) y desktop (1440px)
- [ ] Prueba funcional: localStorage roundtrips (alert state, notif prefs, theme, banner)
- [ ] No hay console errors en dev

---

## ESTIMACIÓN DE ESFUERZO

| Tarea | Horas | Owner | Status |
|-------|-------|-------|--------|
| T1: Demo Banner | 4 | Frontend | ⏳ |
| T2: Deshabilitar botones | 3 | Frontend | ⏳ |
| T3: Persistir alertas | 4 | Frontend | ⏳ |
| T4: Extraer utilidad | 2 | Frontend | ⏳ |
| T5: Accesibilidad modal | 2 | Frontend | ⏳ |
| **TOTAL** | **15 horas** | | |

**Timeline:** 3 días (5 horas/día) si work is focused.

---

## SALIDA GATE 1

Cuando todas las tareas ✅:

1. Crear commit: `"refactor: quick wins — demo transparency + local persistence"`
2. Crear PR, mergearse a master
3. Deploy a Vercel (automático)
4. Enviar a stakeholder: screenshot con demo banner visible
5. Documentar decisiones en CLAUDE.md

**Si NO todas las tareas:** volver a la tarea fallida, no avanzar a MVP backend.

