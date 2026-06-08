# Fase 8.5 — Frontend Readiness (apps/web)

**Veredicto: la web es una demo 100% fixtures. El cutover a API real NO es flip de flag.** El api client existe pero es scaffold muerto (cero imports en UI). La UI productiva de `screens.md`/`routes.md` es **fase futura no implementada**, no una regresión.

## 1. DEMO_MODE
- `lib/config/demo-mode.ts:12-15`: `DEMO_MODE_DEFAULT=true`; `isDemoMode = (NEXT_PUBLIC_DEMO_MODE ?? 'true') !== 'false'`. Default **true**.
- **La flag no controla la UI.** Único consumidor: `lib/api/client.ts:39` (hace fallar apiFetch). Ninguna página la lee para conmutar fuente de datos.

## 2. NEXT_PUBLIC_API_URL
- Usada en `lib/api/client.ts:9` → fallback `http://localhost:3001`.
- **NO documentada en .env.example** (raíz solo tiene NEXT_PUBLIC_DEMO_MODE, DATABASE_URL, JWT_*, CORS_ORIGIN, API_PORT=4000). Inconsistencia: cliente usa :3001, env dice :4000.

## 3. API client F2–F6 (scaffold, no usado)
`lib/api/client.ts` declarado "scaffold preparatorio, NO usado en UI". Cobertura: dashboard ✓, reports ✓, breakdown ✓ (falta rangeTelemetry), alerts/recommendations ✓, control ✓. **Ausentes: auth, organizations, installations, devices, onboarding, bills.** Ningún método se importa en páginas (toda la UI usa `lib/fixtures/mock-data.ts`).

## 4. Pantallas (spec vs apps/web)
Estructura `app/` no sigue routes.md (sin route groups, rutas en español, sin middleware.ts). Nav real: dashboard, desglose, alertas, reporte, ajustes.

| Pantalla (spec) | Estado |
|---|---|
| login, register, forgot-password | Ausente |
| onboarding scan-kit, pair-devices | Parcial (demo, sin WS) |
| onboarding installation-type, profile/*, bill-upload | Ausente (solo tarifa) |
| dashboard | Parcial (fixtures; "live" = setInterval cosmético) |
| reports (/reporte) | Parcial (semanal fijo) |
| breakdown (/desglose) | Parcial (dona fixtures) |
| control | Ausente |
| alerts+recommendations (/alertas) | Parcial (ack en memoria) |
| projections, smart-control (V1) | Ausente |
| settings (/ajustes) | Parcial (tarifa+enchufes fixtures) |

Extras fuera de spec: `/demo`, `/offline` (PWA).

## 5. Datos reales vs fixtures
**Cero pantallas con datos reales.** 100% fixtures determinísticos. "Live" del dashboard = setInterval aleatorio (HeroNumerico.tsx:16-25). Ack alertas = useState en memoria (no persiste).

## 6-7. ¿Conectar a https://smartsense-api-v2.vercel.app hoy?
**No sin trabajo de implementación.** Faltaría: setear NEXT_PUBLIC_API_URL; **flujo auth completo** (no existe login/register/storage/refresh/inyección Bearer); completar client (auth/onboarding/installations/devices/bills); resolver installationId (sin selector); agregar el origen Vercel web al CORS del API. La flag DEMO_MODE no conmuta nada en UI.

## 8. Deployment Protection
Config a nivel proyecto Vercel (no auditable desde repo). `apps/web/.vercel/project.json` → smartsense-web-v2. Si SSO activo, bloquea validación pública/CORS desde orígenes no autenticados. Acción: dashboard Vercel → desactivar Vercel Authentication o usar Protection Bypass.

## 9. Falta para cutover web (accionable, FASE FUTURA — fuera de F0–F8)
1. Auth E2E (authApi + /login + /register + storage/refresh + Bearer automático).
2. Conmutador real DEMO_MODE en capa de datos (React Query no instalado pese a spec).
3. Completar api client (installations, devices, onboarding, bills, rangeTelemetry).
4. Resolver installationId (selector + Zustand).
5. Pantallas ausentes (/control, onboarding completo, settings).
6. Persistencia de alertas (reviewAlert real).
7. Documentar NEXT_PUBLIC_API_URL + unificar puerto.
8. Live data real (WS/refetch vs setInterval).
9. CORS + Deployment Protection.
10. middleware.ts de guard de rutas.

## Implicación para el plan
**Conectar la web v2 a la API NO es la próxima acción viable**: requiere implementar la capa productiva del frontend (fase nueva, fuera del scope F0–F8 de este gate). Lo desplegado y spec-compliant es el **backend** (API). El cutover de dominio a un frontend productivo debe esperar a esa implementación; hoy solo se sustituiría una demo por otra demo.
