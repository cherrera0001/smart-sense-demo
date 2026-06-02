# Resultados de validación — Auditoría brownfield SmartSense

> Resultados de comandos **realmente ejecutados** sobre el repo `smart-sense-demo` (`E:\Cód\SmartSense\smartsense-brownfield`, rama `chore/brownfield-spec-reconciliation`, base `origin/master` @ `a50edf6`) el 2026-06-01. Fuente: `docs/audit/_evidence-brief.md`. No se ocultan ausencias: la falta de tests funcionales se documenta explícitamente.

---

## 1. `pnpm install`

- **Comando intentado:** `pnpm install`
- **Resultado:** OK. Instalación completa en **66 s**. Lockfile presente.
- **Exit code:** 0
- **Acción sugerida:** Ninguna. Entorno reproducible.

---

## 2. `pnpm lint`

- **Comando intentado:** `pnpm lint` (`next lint`)
- **Resultado:** **PASS** con **1 warning**:
  - `components/onboarding/Step2PairingLeds.tsx:35` — `react-hooks/exhaustive-deps` (falta la dependencia `enchufes` en el array de dependencias).
  - Aviso de toolchain: `next lint` está **deprecado y será removido en Next 16**.
- **Exit code:** 0 (warning no rompe el lint)
- **Acción sugerida:**
  1. Corregir la dependencia faltante del hook en `Step2PairingLeds.tsx:35` (o justificar con `// eslint-disable-next-line` si es intencional).
  2. Planificar migración de `next lint` a ESLint CLI / flat config antes de actualizar a Next 16.

---

## 3. `tsc --noEmit` (type check)

- **Comando intentado:** `pnpm exec tsc --noEmit`
- **Resultado:** **PASS** — 0 errores de tipos (TypeScript 5.9 strict).
- **Exit code:** 0
- **Razón de ejecución manual:** **No existe** script `typecheck` en `package.json`; se invocó `tsc` directamente vía `pnpm exec`.
- **Acción sugerida:** Agregar `"typecheck": "tsc --noEmit"` a `package.json` e incluirlo en CI para evitar que regresiones de tipos pasen desapercibidas.

---

## 4. `pnpm build`

- **Comando intentado:** `pnpm build` (`next build`)
- **Resultado:** **PASS** — **12 rutas estáticas (○)** generadas. Tamaños representativos:

  | Ruta | Tamaño | First Load JS |
  |---|---|---|
  | `/desglose` | 11.4 kB | 214 kB |
  | `/reporte` | 8.69 kB | 215 kB |
  | `/dashboard` | 5.27 kB | 123 kB |
  | `/alertas` | 5.94 kB | 120 kB |
  | Shared chunks | — | 102 kB |

- **Exit code:** 0
- **Acción sugerida:** Ninguna bloqueante. El bundle compartido (102 kB) y los First Load JS (~120–215 kB) son razonables para un mockup; revisar al introducir React Query / Recharts en más rutas.

---

## 5. `pnpm test`

- **Comando intentado:** `pnpm test`
- **Resultado:** **NO EXISTE.** No hay script `test` en `package.json`.
- **Exit code:** distinto de 0 (script no encontrado)
- **Razón:** El repo **no tiene tests unitarios, de integración ni E2E funcionales**. El único artefacto de Playwright (`e2e/screenshots.spec.ts`) solo captura screenshots; no contiene assertions de comportamiento. Cobertura funcional automatizada: **0%**.
- **Acción sugerida:** Antes de cualquier migración a backend, establecer una base de tests: (1) unit de `lib/format.ts`, (2) tests de render de componentes de dashboard, (3) E2E funcional del flujo de onboarding. Sin esto, todo refactor es ciego.

---

## 6. Playwright (screenshots)

- **Comando intentado:** `pnpm screenshots` (`playwright test e2e/screenshots.spec.ts`)
- **Resultado:** Ejecuta capturas de pantalla únicamente. **No valida comportamiento.**
- **Exit code:** n/a (no es una validación funcional)
- **Razón:** Diseñado para generar evidencia visual para presentaciones, no para QA automatizado.
- **Acción sugerida:** No contar Playwright como cobertura de pruebas. Reutilizar la infraestructura existente para añadir specs E2E **con assertions**.

---

## Tabla resumen

| # | Validación | Comando | Resultado | Exit | Estado |
|---|---|---|---|---|---|
| 1 | Instalación | `pnpm install` | OK (66 s) | 0 | ✅ |
| 2 | Lint | `pnpm lint` | PASS, 1 warning (`Step2PairingLeds.tsx:35`); `next lint` deprecado | 0 | ⚠️ |
| 3 | Type check | `pnpm exec tsc --noEmit` | PASS, 0 errores (sin script `typecheck`) | 0 | ⚠️ |
| 4 | Build | `pnpm build` | PASS, 12 rutas estáticas | 0 | ✅ |
| 5 | Tests | `pnpm test` | NO EXISTE — sin tests funcionales | ≠0 | ❌ |
| 6 | Playwright | `pnpm screenshots` | Solo screenshots, sin assertions | n/a | ⚠️ |

**Leyenda:** ✅ sano · ⚠️ pasa pero con deuda/acción pendiente · ❌ ausente / brecha crítica.

---

## Conclusión

El proyecto **compila, tipa y linta limpio** (con 1 warning menor y toolchain de lint deprecado). La brecha crítica de calidad es la **ausencia total de pruebas funcionales**: no hay script `test`, no hay tests unitarios/integración/E2E, y Playwright solo produce imágenes. Esta ausencia debe resolverse **antes** de iniciar la migración a backend real, porque hoy no existe red de seguridad contra regresiones.
