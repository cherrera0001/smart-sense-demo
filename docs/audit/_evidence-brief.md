# Brief de evidencia — Auditoría brownfield smart-sense-demo (interno)

> Hechos verificados el 2026-06-01 sobre el repo clonado en `E:\Cód\SmartSense\smartsense-brownfield` (rama `chore/brownfield-spec-reconciliation`, base `origin/master` @ `a50edf6`). Fuente de verdad para los documentos de auditoría. NO inventar más allá de esto; si falta, abrir el archivo real.

## Stack real
- Next.js **15.5.14** (App Router), React **19.2**, TypeScript **5.9 strict**, Tailwind **3.4**, Recharts **2.15**, lucide-react, date-fns, class-variance-authority, clsx, tailwind-merge.
- PWA vía `next-pwa` (`public/sw.js`, `manifest.webmanifest`, fallback `/offline`).
- Playwright 1.60 (solo screenshots). pnpm 8.12, lockfile presente.
- Sin backend, sin ORM, sin DB, sin API routes, sin auth. **100% mock estático + localStorage.**

## Validaciones ejecutadas (resultado real)
- `pnpm install` → OK (66s).
- `pnpm lint` (`next lint`) → **PASS**, 1 warning: `components/onboarding/Step2PairingLeds.tsx:35` react-hooks/exhaustive-deps (`enchufes`). Nota: `next lint` deprecado en Next 16.
- `pnpm exec tsc --noEmit` → **PASS** (0 errores). No existe script `typecheck` en package.json.
- `pnpm build` → **PASS**, 12 rutas estáticas (○). Tamaños: desglose 11.4kB/214kB, reporte 8.69kB/215kB, dashboard 5.27kB/123kB, alertas 5.94kB/120kB. Shared 102kB.
- `pnpm test` → **NO EXISTE** script test. No hay tests unitarios/integración.
- Scripts package.json: dev, build, start, lint, verify-deck, screenshots, screenshots:install.

## Rutas reales (app/)
`/` (page.tsx, parece dashboard/landing), `/onboarding`, `/dashboard`, `/desglose`, `/alertas`, `/reporte`, `/ajustes`, `/demo`, `/offline`. **NO existen:** /login, /register, onboarding sub-rutas, /reports, /breakdown, /control, /alerts, /projections, /smart-control, /settings. Rutas en **español**.

## Componentes reales
- `components/ui/`: badge, button, card, dialog, input, select (primitivos estilo shadcn, a mano).
- `components/layout/`: BottomNav, IPhoneFrame, LayoutShell, Sidebar.
- `components/dashboard/`: AlertasStrip, HeroNumerico, ProyeccionMes, QuickActions.
- `components/onboarding/`: Step1QR, Step2PairingLeds, Step3Tarifa.
- `components/shared/`: RayoSvg. `components/theme/`: ThemeToggle.
- Sidebar tiene **5 items**: Inicio(/dashboard), Desglose, Alertas, Reporte, Ajustes. Marca "Home Energy". Footer hardcodea "3/4 conectados, 1/4 reconectando".

## lib/
- `lib/types.ts`: dominio en español — `Tarifa`(BT-1/BT-1A, clpKwh, comuna, distribuidora), `ConsumoHoy`, `FirmaElectrica`, `Alerta`(anomalia/sugerencia/tip, leida), `ReporteSemanal`, `Enchufe`(online/offline/reconectando), `AppState`.
- `lib/mock-data.ts` (187 líneas): datos deterministas alineados al deck. tarifa CGE Coquimbo 165 CLP/kWh; consumoHoy 7.58kWh/$1250, proyección $42.500, serieHoraria 24pts, serieMesAcumulada 35 días; firmaElectrica 5 segmentos (Refrigeración 38%, Climatización 24%, Electrónica 14%, Iluminación 12%, Lavado 12%); 3 alertas; reporteSemanal; 4 enchufes.
- `lib/format.ts`: `formatCLP` (Intl es-CL), `formatKwh` (coma decimal), `formatDelta`, `formatHora`. **Production-grade, KEEP.**
- `lib/utils.ts` (cn helper, presumible). `lib/context/ThemeContext.tsx` (theme + localStorage 'theme'). `lib/hooks/`: useLocalStorage<T> (genérico), useOnboarding (localStorage 'onboardingDone'), usePeriodo.

## Acoplamiento a mock (imports directos de @/lib/mock-data)
1. `app/ajustes/page.tsx` → enchufes, tarifa
2. `app/alertas/page.tsx` → alertas
3. `app/desglose/page.tsx` → firmaElectrica
4. `app/reporte/page.tsx` → reporteSemanal
5. `components/dashboard/AlertasStrip.tsx` → alertas
6. `components/dashboard/HeroNumerico.tsx` → consumoHoy (contador vivo)
7. `components/dashboard/ProyeccionMes.tsx` → consumoHoy
**Total: 7 sitios.** Acoplamiento superficial y localizado.

## localStorage (keys)
- `onboardingDone` (useOnboarding + e2e). `theme` (ThemeContext). `showIPhoneFrame` (demo/e2e). Hook genérico useLocalStorage<T> disponible.

## Seguridad
- `.env.local` correctamente en `.gitignore`; NO trackeado. No hay tokens reales en archivos versionados (solo placeholders ghp_.../vcp_.../cfut_... en README/CLAUDE.md).
- README/CLAUDE.md exponen públicamente: Vercel Project ID `prj_pgEpK6iqMMcvAYen38xR0Nb9QjgF`, dominio smartsense.c4a.cl, y la práctica de almacenamiento de tokens. Riesgo BAJO (IDs no son secretos) pero conviene limpiar de docs públicos.

## Documentación existente (docs/)
Estructura curada 00-Gobierno (EXECUTION_PLAN, BACKLOG_MVP_BACKEND, BACKLOG_QUICK_WINS, DEFINITION_OF_DONE, DOCUMENTO_CURATOR), 10-Producto, 20-Tecnologia (deployment, dns-cloudflare, troubleshooting), 30-Operaciones (checklists, reportes audit/redesign/ux 2026-04-28), 40-Clientes (defensa-smartsense, handoff), 90-Archivo (fases completadas, versiones). + `_INDEX.md`. Raíz: AUDIT_DOCUMENTAL.md, PENDIENTES.md, ORQUESTACION_MCP_SKILLS.md.
- CLAUDE.md del demo declara plan "Demo→MVP en 4 semanas" con gates; backend-first workflow. **Coincide en espíritu con spec-driven; reconciliar con specs/ nuevas.**

## Artefactos temporales / ruido (raíz)
capture-audit.mjs, capture-final.mjs, capture-screenshots.js, capture-screenshots.mjs, screenshot-eval.mjs, validate-production.mjs, validate-redesign.sh, validate-uniformity.sh, dev-server.log, journey-report.json, onboarding-report.json. + `screenshots/` (~40 PNG), `artifacts/` (2 PNG), `test-results/`. Duplicación: capture-screenshots existe en raíz Y scripts/.

## Mapeo demo→specs (entidades)
- Tarifa → Tariff + Distributor. ConsumoHoy → EnergyAggregate/TelemetryReading (dashboard). FirmaElectrica → breakdown por DeviceCategory. Alerta(tipo) → Alert + Recommendation (sugerencia/tip). Enchufe → Device. ReporteSemanal → reports/EnergyAggregate. onboardingDone → Onboarding/DevicePairing.
- Gap clave: demo NO modela User/Organization/Membership/Installation/EnergyKit/multi-tenant/control/telemetría real. Onboarding demo = 3 pasos (QR→pairing→tarifa) vs spec más rico (scan-kit, pair-devices, installation-type, profile por segmento, bill-upload).

## Specs objetivo (ya existentes en E:\Cód\SmartSense\specs)
_canon.md; 87 FR; 45 NFR; 21 tablas; openapi 32 paths/68 schemas; 17 rutas frontend objetivo; 17 servicios backend; roadmap F0–F7; matriz trazabilidad 45 filas. Stack objetivo: Fastify+Prisma+PostgreSQL/TimescaleDB, Next App Router+React Query+Zustand+Recharts, MQTT+WebSocket, monorepo pnpm.
