# TROUBLESHOOTING — Smart Sense Demo Build

## Error #0: El agente dice "no hay Node" pero vos sí programás con Node

**Causa:** el **sandbox** del asistente a menudo **no ve el mismo PATH** que tu PowerShell de usuario (Git Bash peor aún).

**Qué hacer:** en **tu** PC, `node --version` y `where.exe node`. Si hay versión, **no reinstales Node** por el diagnóstico del agente; abrí el proyecto desde terminal donde Node sí exista, o ajustá PATH. Ver **VERIFICATION.md** (Escenarios A/B/C).

---

## Error #1: "Cannot find module" o "Cannot find package"

**Síntoma:**
```
Error: Cannot find module 'react'
```

**Causa:** `node_modules` no existe o está incompleto.

**Fix:**
```powershell
rm -Recurse node_modules .pnpm-store pnpm-lock.yaml
pnpm install
pnpm build
```

---

## Error #2: Errores de tipos en `serieMesAcumulada`

**Síntoma:**
```
lib/mock-data.ts:46 — Type 'number' is not assignable to type 'undefined'
```

**Causa:** `ConsumoHoy['serieMesAcumulada']` tiene tipado incorrecto en `lib/types.ts`.

**Fix:** En `lib/types.ts`, verifica que `ConsumoHoy` tenga:

```typescript
export interface ConsumoHoy {
  kwh: number
  clp: number
  deltaAyerPct: number
  proyeccionFinMesClp: number
  serieHoraria: Array<{ hora: number; clp: number }>
  serieMesAcumulada: Array<{ dia: number; clpAcumulado: number; esProyeccion: boolean }>
}
```

Si no está, agregalo.

---

## Error #3: Path aliases (`@/*`) rotos

**Síntoma:**
```
Cannot find module '@/lib/format'
ModuleNotFoundError: Cannot resolve '@/lib/format'
```

**Causa:** `tsconfig.json` no tiene configurado el path alias.

**Fix:** Verifica en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Si falta, agregalo en `compilerOptions`.

---

## Error #4: Versión de Tailwind incompatible

**Síntoma:**
```
Error: Unknown at rule @tailwind
```

o

```
Error: Cannot resolve 'tailwindcss/defaultConfig'
```

**Causa:** mezcla de APIs Tailwind v3 vs v4. Este repo usa **Tailwind 3.x** (`package.json` → `tailwindcss`).

**Fix:** En `tailwind.config.ts`, verifica que sea:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        energy: '#00D87A',
        gold: '#FFC844',
        electric: '#5B7FFF',
        warn: '#FF6B6B',
        ink: {
          1: '#0B1220',
          2: '#16213E',
          3: '#0F3460',
        },
        'text-dim': '#64748B',
        'text-dim-on-dark': '#94A3B8',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Si hay referencias a `theme.colors` sin `extend`, cambialas.

---

## Error #5: Componentes sin "use client"

**Síntoma:**
```
Error: useState/useEffect cannot be used in a server component
```

**Causa:** Componentes con hooks no tienen `'use client'` al inicio.

**Fix:** Verifica que ESTOS archivos tengan `'use client'` como primer línea:

- `components/dashboard/HeroNumerico.tsx` ✅ (ya tiene)
- `components/dashboard/ProyeccionMes.tsx` — si usa useState
- `components/dashboard/AlertasStrip.tsx` — si usa useState
- `components/onboarding/Step2PairingLeds.tsx` ✅ (ya tiene)
- `components/layout/LayoutShell.tsx` ✅ (ya tiene, useEffect)
- Cualquier hook personalizado (`hooks/useOnboarding.ts`, etc.) — NO necesita (son módulos)

Si falta, agregalo arriba de todo:

```typescript
'use client'

import { useState } from 'react'
```

---

## Error #6: Missing type definitions

**Síntoma:**
```
Cannot find name 'JSX'
error TS2304: Cannot find name 'React'
```

**Causa:** `tsconfig.json` no incluye `jsx` o `types`.

**Fix:** En `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["node", "jest", "@testing-library/jest-dom"]
  }
}
```

---

## Error #7: Recharts component errors

**Síntoma:**
```
Error: [...] is not a valid Recharts component
```

o

```
Cannot find name 'Cell'
```

**Causa:** Import incompleto de Recharts.

**Fix:** Verifica imports en componentes chart:

```typescript
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
```

---

## Error #8: Lint errors pero build pasa

**Síntoma:**
```
pnpm build  # ✅ OK
pnpm lint   # ❌ FAIL
```

**Causa:** ESLint tiene reglas que TypeScript strict no obliga.

**Solución:** Si lint falla pero build pasa, es advertencia. Para la defensa está OK. Para producción:

```powershell
pnpm lint --fix
```

---

## Quick Checks antes de reportar error

1. ¿`node_modules` existe?
   ```powershell
   ls node_modules | measure
   ```
   Si es 0, hacer `pnpm install` de nuevo.

2. ¿`pnpm-lock.yaml` está corrupto?
   ```powershell
   rm pnpm-lock.yaml
   pnpm install
   ```

3. ¿Hay uncommitted changes?
   ```powershell
   git status
   ```
   Si hay conflictos, resolver o hacer `git checkout .` para reset.

4. ¿Tailwind cache?
   ```powershell
   rm -Recurse .next
   pnpm build
   ```

5. ¿TypeScript cache?
   ```powershell
   rm tsconfig.tsbuildinfo
   pnpm build
   ```

---

## Si nada funciona

1. Copia el output COMPLETO de:
   ```powershell
   pnpm build 2>&1 | tee build.log
   ```

2. Abre `build.log` y lee TODA la salida (hasta el final, donde está el error real)

3. Pásalo a Claude Code en una nueva sesión con:
   > El build falla. [pega build.log]. ¿Qué es el error?

4. Claude puede LEER el error y proponer fix de código sin necesidad de ejecutar nada.
