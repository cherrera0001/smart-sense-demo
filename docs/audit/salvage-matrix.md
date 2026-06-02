# Matriz de rescate (salvage matrix) — SmartSense brownfield

> Auditoría brownfield de `smartsense-brownfield` (demo Next.js 15 / React 19, 100% mock + localStorage) contra los specs objetivo en `E:\Cód\SmartSense\specs` (Fastify+Prisma+PostgreSQL/TimescaleDB, monorepo pnpm, roadmap F0–F7).
>
> **ESTADO: SOLO PLAN. NINGUNA ACCIÓN SE EJECUTA AÚN.** Este documento NO mueve, modifica ni elimina archivos. Las columnas *Decisión* y *Acción propuesta* son recomendaciones para fases posteriores; ningún `rm`, `mv` o refactor se aplica en este paso.
>
> Fuente de verdad: `docs/audit/_evidence-brief.md` (hechos verificados 2026-06-01).
>
> **Convenciones**
> - Decisión ∈ {KEEP, REFACTOR, REPLACE, DELETE, ARCHIVE}
> - Fase ∈ {0.5, 1, 2, 3, 4, 5, 6, 7} (roadmap F0–F7; 0.5 = saneamiento previo) o `demo-only` (vive solo en el repo demo / archivo de defensa, no migra al monorepo)
> - Riesgo / Valor: BAJO / MEDIO / ALTO desde la óptica de la migración a producción.

---

## 1. App routes (`app/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| App route | `app/layout.tsx` | Root layout, fuentes, ThemeProvider, LayoutShell, metadata PWA | BAJO | ALTO | REFACTOR | Migrar a `apps/web`; mantener providers, ajustar metadata y wiring de React Query/Zustand | 1 |
| App route | `app/globals.css` | Estilos base + tokens Tailwind + variables tema | BAJO | ALTO | KEEP | Migrar tal cual al design system del monorepo (junto a tailwind.config) | 0.5 |
| App route | `app/page.tsx` (`/`) | Landing/dashboard de entrada | MEDIO | MEDIO | REFACTOR | Redefinir como landing o redirect; alinear con 17 rutas objetivo del spec | 1 |
| App route | `app/onboarding/` | Onboarding 3 pasos (QR→pairing→tarifa) sobre mock | ALTO | MEDIO | REFACTOR | Reescribir contra flujo spec (scan-kit, pair-devices, installation-type, profile, bill-upload); reutilizar UX/animaciones | 2 |
| App route | `app/dashboard/` | Dashboard consumo (hero, proyección, alertas) sobre mock | MEDIO | ALTO | REFACTOR | Conectar a EnergyAggregate/Telemetry vía React Query; conservar layout/composición | 3 |
| App route | `app/desglose/` | Desglose por firma eléctrica (FirmaElectrica mock) | MEDIO | ALTO | REFACTOR | Mapear a breakdown por DeviceCategory; sustituir import de mock por fetch | 3 |
| App route | `app/alertas/` | Listado de alertas (mock) | MEDIO | MEDIO | REFACTOR | Mapear a Alert + Recommendation; estado leída/no-leída vía API | 4 |
| App route | `app/reporte/` | Reporte semanal (mock) | MEDIO | MEDIO | REFACTOR | Mapear a reports/EnergyAggregate; parametrizar por periodo | 4 |
| App route | `app/ajustes/` | Ajustes: enchufes + tarifa (mock) | MEDIO | MEDIO | REFACTOR | Dividir en gestión de devices y tariff/distributor; CRUD real | 4 |
| App route | `app/demo/` | Vista demo con IPhoneFrame para defensa/pitch | BAJO | MEDIO | ARCHIVE | Conservar como artefacto de defensa; NO migrar al monorepo | demo-only |
| App route | `app/offline/` | Fallback offline de la PWA | BAJO | BAJO | REFACTOR | Re-evaluar PWA en producción; recrear si se mantiene next-pwa | 6 |

## 2. Components (`components/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| ui | `ui/badge.tsx` | Primitivo shadcn-style (CVA) | BAJO | ALTO | KEEP | Migrar a `packages/ui` del monorepo | 0.5 |
| ui | `ui/button.tsx` | Primitivo botón (CVA) | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| ui | `ui/card.tsx` | Primitivo card | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| ui | `ui/dialog.tsx` | Primitivo dialog | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| ui | `ui/input.tsx` | Primitivo input | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| ui | `ui/select.tsx` | Primitivo select | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| layout | `layout/LayoutShell.tsx` | Shell responsive (sidebar + bottom nav) | BAJO | ALTO | KEEP | Migrar; ajustar a navegación spec (17 rutas) | 1 |
| layout | `layout/Sidebar.tsx` | Sidebar 5 items; footer hardcodea "3/4 conectados" | MEDIO | MEDIO | REFACTOR | Migrar items a rutas spec; eliminar footer hardcodeado (datos reales) | 1 |
| layout | `layout/BottomNav.tsx` | Navegación móvil | BAJO | MEDIO | REFACTOR | Migrar; alinear ítems con rutas spec | 1 |
| layout | `layout/IPhoneFrame.tsx` | Marco iPhone para demo/pitch (key `showIPhoneFrame`) | BAJO | BAJO | ARCHIVE | Solo presentación; NO migrar a producción | demo-only |
| dashboard | `dashboard/HeroNumerico.tsx` | Contador vivo de consumo (import directo `consumoHoy`) | MEDIO | ALTO | REFACTOR | Desacoplar de mock; recibir datos por props/React Query | 3 |
| dashboard | `dashboard/ProyeccionMes.tsx` | Proyección de mes (import `consumoHoy`) | MEDIO | ALTO | REFACTOR | Desacoplar de mock; cálculo en backend/aggregate | 3 |
| dashboard | `dashboard/AlertasStrip.tsx` | Strip de alertas (import `alertas`) | MEDIO | MEDIO | REFACTOR | Desacoplar de mock; consumir Alert API | 4 |
| dashboard | `dashboard/QuickActions.tsx` | Accesos rápidos | BAJO | MEDIO | KEEP | Migrar; re-apuntar enlaces a rutas spec | 3 |
| onboarding | `onboarding/Step1QR.tsx` | Paso QR del onboarding | MEDIO | MEDIO | REFACTOR | Reescribir como scan-kit del flujo spec | 2 |
| onboarding | `onboarding/Step2PairingLeds.tsx` | Pairing LEDs (warning exhaustive-deps `enchufes`) | MEDIO | MEDIO | REFACTOR | Mapear a pair-devices; corregir dep del useEffect al migrar | 2 |
| onboarding | `onboarding/Step3Tarifa.tsx` | Selección de tarifa | MEDIO | MEDIO | REFACTOR | Mapear a tariff/installation; integrar bill-upload | 2 |
| shared | `shared/RayoSvg.tsx` | Ícono/branding rayo | BAJO | MEDIO | KEEP | Migrar a assets/branding del monorepo | 1 |
| theme | `theme/ThemeToggle.tsx` | Toggle dark/light | BAJO | ALTO | KEEP | Migrar a `packages/ui` junto a ThemeContext | 0.5 |

## 3. lib (`lib/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| lib | `lib/format.ts` | `formatCLP`/`formatKwh`/`formatDelta`/`formatHora` (Intl es-CL), production-grade | BAJO | ALTO | KEEP | Migrar a `packages/shared/format` sin cambios | 0.5 |
| lib | `lib/utils.ts` | helper `cn` (clsx + tailwind-merge) | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| lib | `lib/types.ts` | Dominio en español (Tarifa, ConsumoHoy, FirmaElectrica, Alerta, Enchufe, AppState…) | MEDIO | ALTO | REFACTOR | Re-derivar a `packages/shared` en inglés alineado a 21 tablas/68 schemas (Tariff, Device, Alert, EnergyAggregate…) | 1 |
| lib | `lib/mock-data.ts` | 187 líneas de datos deterministas alineados al deck | MEDIO | MEDIO | REFACTOR | Dividir: fixtures a `lib/fixtures` (tests/storybook) y datos a seeds Prisma | 1 |
| lib | `lib/context/ThemeContext.tsx` | Contexto tema + localStorage `theme` | BAJO | ALTO | KEEP | Migrar a `packages/ui` | 0.5 |
| lib | `lib/hooks/useLocalStorage.ts` | Hook genérico `useLocalStorage<T>` | BAJO | ALTO | KEEP | Migrar a `packages/ui`/hooks compartidos | 0.5 |
| lib | `lib/hooks/useOnboarding.ts` | Estado onboarding vía localStorage `onboardingDone` | MEDIO | MEDIO | REFACTOR | Reemplazar persistencia local por estado de Onboarding/DevicePairing en backend | 2 |
| lib | `lib/hooks/usePeriodo.ts` | Selector de periodo (UI) | BAJO | MEDIO | KEEP | Migrar; conectar a queries parametrizadas por periodo | 3 |

## 4. docs (`docs/` y raíz del repo demo)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| docs | `docs/00-Gobierno/` | EXECUTION_PLAN, BACKLOG_MVP_BACKEND, BACKLOG_QUICK_WINS, DOD, DOCUMENTO_CURATOR | BAJO | ALTO | REFACTOR | Reconciliar con `specs/` (roadmap F0–F7, DoD, backlog); fusionar sin perder histórico | 0.5 |
| docs | `docs/10-Producto/` | Documentación de producto | BAJO | MEDIO | REFACTOR | Reconciliar con _canon.md y 87 FR | 1 |
| docs | `docs/20-Tecnologia/` | deployment, dns-cloudflare, troubleshooting | BAJO | MEDIO | KEEP | Conservar como ops; actualizar al stack objetivo | 6 |
| docs | `docs/30-Operaciones/` | checklists + reportes audit/redesign/ux (2026-04-28) | BAJO | MEDIO | ARCHIVE | Reportes puntuales → evidencia histórica; checklists → KEEP en ops | demo-only |
| docs | `docs/40-Clientes/` | defensa-smartsense, handoff | BAJO | ALTO | KEEP | Material de defensa/cliente; conservar | demo-only |
| docs | `docs/90-Archivo/` | fases-completadas, obsoleto, versiones-anteriores | BAJO | BAJO | ARCHIVE | Ya es archivo; mantener como histórico read-only | demo-only |
| docs | `docs/_INDEX.md` | Índice navegable de docs | BAJO | MEDIO | REFACTOR | Regenerar índice tras reconciliación con specs | 0.5 |
| docs | `docs/README.md` | Readme de la carpeta docs | BAJO | BAJO | KEEP | Actualizar referencias | 0.5 |
| docs raíz | `AUDIT_DOCUMENTAL.md` | Auditoría documental previa del demo | BAJO | MEDIO | ARCHIVE | Insumo histórico; superado por esta auditoría brownfield | demo-only |
| docs raíz | `PENDIENTES.md` | Lista de pendientes del demo | BAJO | MEDIO | REFACTOR | Migrar ítems vivos al backlog del monorepo; archivar el resto | 0.5 |
| docs raíz | `ORQUESTACION_MCP_SKILLS.md` | Orquestación MCP/skills del demo | BAJO | BAJO | ARCHIVE | Específico del demo; conservar como referencia | demo-only |
| docs raíz | `CLAUDE.md` (demo) | Plan "Demo→MVP 4 semanas", backend-first; expone Vercel Project ID y dominio | MEDIO | MEDIO | REFACTOR | Reconciliar con specs/; **eliminar IDs/dominio expuestos** y práctica de tokens | 0.5 |
| docs raíz | `README.md` (repo) | Readme del demo; expone Vercel Project ID, dominio, placeholders de tokens | MEDIO | MEDIO | REFACTOR | Reescribir para el monorepo; **limpiar datos sensibles** (riesgo BAJO pero higiénico) | 0.5 |

## 5. e2e (`e2e/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| e2e | `e2e/screenshots.spec.ts` | Spec Playwright solo para capturas (no asserts funcionales) | BAJO | BAJO | ARCHIVE | No es test de regresión; conservar para capturas de defensa. Reemplazar por suite e2e real con asserts | demo-only |

## 6. scripts (`scripts/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| scripts | `scripts/capture-screenshots.mjs` | Captura de screenshots (versión "buena" en scripts/) | BAJO | BAJO | ARCHIVE | Conservar como utilidad de defensa; duplicado en raíz → DELETE (ver §7) | demo-only |
| scripts | `scripts/demo-timing.mjs` | Medición de timing de la demo | BAJO | BAJO | ARCHIVE | Específico del pitch; no migra | demo-only |
| scripts | `scripts/mcp-file-indexer.js` | Indexador de archivos para MCP | BAJO | BAJO | ARCHIVE | Herramienta interna del demo; evaluar reutilización | demo-only |
| scripts | `scripts/measure-journey.mjs` | Mide el journey de usuario (genera journey-report.json) | BAJO | BAJO | ARCHIVE | Métrica puntual de defensa; no migra | demo-only |
| scripts | `scripts/measure-onboarding.mjs` | Mide onboarding (genera onboarding-report.json) | BAJO | BAJO | ARCHIVE | Métrica puntual de defensa; no migra | demo-only |
| scripts | `scripts/validate-docs.js` | Valida estructura de docs | BAJO | MEDIO | REFACTOR | Útil; adaptar para validar docs reconciliados con specs | 0.5 |
| scripts | `scripts/verify-deck.mjs` | Verifica el deck/screenshots (script `verify-deck` en package.json) | BAJO | BAJO | ARCHIVE | Específico de la presentación; no migra | demo-only |
| scripts | `scripts/verify-theme-prod.mjs` | Verifica tema en producción (Vercel) | BAJO | BAJO | ARCHIVE | Atado al deploy demo; recrear si aplica en producción | demo-only |

## 7. Artefactos temporales / ruido (raíz del repo demo)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| artefacto | `capture-audit.mjs` | Script ad-hoc de captura/auditoría en raíz | BAJO | BAJO | DELETE | Ruido en raíz; funcionalidad cubierta por `scripts/`. (No borrar ahora; proponer) | 0.5 |
| artefacto | `capture-final.mjs` | Script ad-hoc de captura en raíz | BAJO | BAJO | DELETE | Ruido en raíz; duplica scripts/. (No borrar ahora) | 0.5 |
| artefacto | `capture-screenshots.js` | Captura screenshots (duplicado de scripts/, formato .js) | BAJO | BAJO | DELETE | Duplicado obsoleto; la versión vigente está en `scripts/`. (No borrar ahora) | 0.5 |
| artefacto | `capture-screenshots.mjs` | Captura screenshots (duplicado de scripts/) | BAJO | BAJO | DELETE | Duplicado de `scripts/capture-screenshots.mjs`. (No borrar ahora) | 0.5 |
| artefacto | `screenshot-eval.mjs` | Evaluación ad-hoc de screenshots | BAJO | BAJO | DELETE | Ruido en raíz; one-off. (No borrar ahora) | 0.5 |
| artefacto | `validate-production.mjs` | Validación contra prod (Vercel) en raíz | BAJO | BAJO | DELETE | Atado al deploy demo; redundante con verify-theme-prod. (No borrar ahora) | 0.5 |
| artefacto | `validate-redesign.sh` | Script shell de validación de rediseño | BAJO | BAJO | DELETE | One-off de una fase de rediseño ya cerrada. (No borrar ahora) | 0.5 |
| artefacto | `validate-uniformity.sh` | Script shell de validación de uniformidad UI | BAJO | BAJO | DELETE | One-off; ya cumplió su propósito. (No borrar ahora) | 0.5 |
| artefacto | `dev-server.log` | Log del dev server (debería estar gitignored) | BAJO | BAJO | DELETE | Log transitorio; añadir patrón a .gitignore. (No borrar ahora) | 0.5 |
| artefacto | `journey-report.json` | Output de measure-journey | BAJO | BAJO | DELETE | Artefacto regenerable; no versionar. (No borrar ahora) | 0.5 |
| artefacto | `onboarding-report.json` | Output de measure-onboarding | BAJO | BAJO | DELETE | Artefacto regenerable; no versionar. (No borrar ahora) | 0.5 |
| build | `tsconfig.tsbuildinfo` | Caché incremental de TS | BAJO | BAJO | DELETE | Generado; debe estar gitignored. (No borrar ahora) | 0.5 |
| build | `.next/` | Build output de Next | BAJO | BAJO | DELETE | Generado; ya gitignored normalmente. (No borrar ahora) | 0.5 |
| build | `node_modules/` | Dependencias instaladas | BAJO | BAJO | DELETE | Generado; gitignored. (No borrar ahora) | 0.5 |

## 8. Evidencia visual (`screenshots/`, `artifacts/`, `test-results/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| evidencia | `screenshots/` (~36 PNG) | Capturas de pantallas del demo (defensa) | BAJO | MEDIO | ARCHIVE | Mover a evidencia de defensa fuera del código fuente; mantener para pitch | demo-only |
| evidencia | `artifacts/` (dashboard-dark.png, dashboard-light.png) | 2 capturas light/dark | BAJO | MEDIO | ARCHIVE | Evidencia de defensa del tema; archivar | demo-only |
| evidencia | `test-results/` (vacío) | Salida de Playwright | BAJO | BAJO | DELETE | Vacío y regenerable; gitignorear. (No borrar ahora) | 0.5 |

## 9. Public assets (`public/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| public | `public/manifest.webmanifest` | Manifiesto PWA | BAJO | MEDIO | REFACTOR | Recrear con branding/nombre del producto en monorepo | 6 |
| public | `public/sw.js` | Service worker (next-pwa, generado) | BAJO | BAJO | REPLACE | Regenerado por next-pwa en build; no editar a mano | 6 |
| public | `public/workbox-e9849328.js` | Runtime Workbox (generado) | BAJO | BAJO | REPLACE | Regenerado por next-pwa; no versionar manualmente | 6 |
| public | `public/fallback-uapdTTdkG_g_dD0W8Xyjk.js` | Fallback PWA (generado, hash) | BAJO | BAJO | REPLACE | Regenerado por next-pwa en build | 6 |
| public | `public/icons/` (icon-192, icon-512, icon-maskable .svg) | Íconos PWA | BAJO | MEDIO | KEEP | Migrar; reemplazar por branding final si cambia | 6 |

## 10. Config files (raíz + `.claude/`)

| Área | Archivo/Carpeta | Función actual | Riesgo | Valor | Decisión | Acción propuesta | Fase |
|---|---|---|---|---|---|---|---|
| config | `package.json` | Deps + scripts (dev/build/start/lint/verify-deck/screenshots) | BAJO | ALTO | REFACTOR | Base para `apps/web/package.json`; quitar scripts demo-only, añadir workspace | 0.5 |
| config | `pnpm-lock.yaml` | Lockfile pnpm 8.12 | BAJO | ALTO | REFACTOR | Regenerar bajo workspace del monorepo | 0.5 |
| config | `next.config.js` | Config Next + next-pwa | BAJO | ALTO | KEEP | Migrar; revisar opciones PWA y headers de seguridad | 1 |
| config | `tsconfig.json` | TS 5.9 strict | BAJO | ALTO | KEEP | Migrar; extender de tsconfig base del monorepo | 0.5 |
| config | `tailwind.config.ts` | Design system (tokens, colores, tipografía) | BAJO | ALTO | KEEP | Migrar a config Tailwind compartida del monorepo | 0.5 |
| config | `postcss.config.js` | PostCSS para Tailwind | BAJO | ALTO | KEEP | Migrar sin cambios | 0.5 |
| config | `.eslintrc.json` | Config ESLint (next lint, deprecado en Next 16) | BAJO | MEDIO | REFACTOR | Migrar a flat config / ESLint del monorepo | 0.5 |
| config | `.gitignore` | Ignora .env.local, node_modules, .next | BAJO | ALTO | REFACTOR | Migrar; **añadir** *.log, *-report.json, tsbuildinfo, test-results | 0.5 |
| config | `playwright.config.ts` | Config Playwright (solo screenshots) | BAJO | BAJO | REFACTOR | Reusar como base para suite e2e real con asserts | 5 |
| config | `next-env.d.ts` | Tipos de Next (generado) | BAJO | BAJO | KEEP | Generado por Next; migra con apps/web | 1 |
| config | `.claude/settings.json` | Config local de Claude Code del demo | BAJO | BAJO | KEEP | Migrar/fusionar con `.claude` del monorepo | 0.5 |
| config | `.claude/skills/document-curator.md` | Skill curador de documentos | BAJO | MEDIO | KEEP | Reutilizable para reconciliación de docs | 0.5 |

---

## Resumen por decisión

| Decisión | Conteo |
|---|---|
| KEEP | 22 |
| REFACTOR | 25 |
| REPLACE | 3 |
| DELETE | 14 |
| ARCHIVE | 17 |
| **Total ítems** | **81** |

> Nota: ninguna acción se ha ejecutado. Todos los DELETE/ARCHIVE/REFACTOR son propuestas para fases posteriores del roadmap.

## Top 5 prioridades para Fase 0.5 (saneamiento previo a la migración)

1. **Extraer el design system y primitivos a `packages/ui`** — `tailwind.config.ts`, `postcss.config.js`, `app/globals.css`, `components/ui/*` (6), `lib/utils.ts` (`cn`), `theme/ThemeToggle.tsx` + `lib/context/ThemeContext.tsx`. Es el activo de mayor valor y menor riesgo, base de todo el frontend objetivo.
2. **Promover `lib/format.ts` y los hooks genéricos a `packages/shared`** — `format.ts` (production-grade, Intl es-CL), `useLocalStorage<T>`. Reutilizables sin tocar lógica de negocio.
3. **Higiene de seguridad en docs públicos** — limpiar de `README.md` y `CLAUDE.md` el Vercel Project ID `prj_pgEpK6iqMMcvAYen38xR0Nb9QjgF`, el dominio `smartsense.c4a.cl` y la práctica de almacenamiento de tokens (riesgo BAJO, pero higiénico antes de exponer el repo).
4. **Limpieza de ruido en raíz y .gitignore** — proponer DELETE de los 11 artefactos temporales (`capture-*.mjs/.js`, `screenshot-eval.mjs`, `validate-*.mjs/.sh`, `dev-server.log`, `*-report.json`) más duplicados de `scripts/`, y endurecer `.gitignore` (*.log, *-report.json, tsbuildinfo, test-results). Reduce confusión antes de migrar.
5. **Reconciliar gobierno documental con `specs/`** — fusionar `docs/00-Gobierno/*` (EXECUTION_PLAN, BACKLOG, DoD) y `PENDIENTES.md` con `specs/_canon.md`, roadmap F0–F7 y la matriz de trazabilidad; regenerar `_INDEX.md`. Establece la fuente de verdad única antes de empezar a construir.
