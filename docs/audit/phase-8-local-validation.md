# Fase 8 — Validación local (gates de release)

> Fecha: **2026-06-06**. Rama `release/smartsense-f0-f7` (HEAD `a8bc3b6`).
> Los resultados de tests/build se verificaron al cierre de Fase 7 sobre **estos mismos commits** (sin cambios de código posteriores). Esta tabla consolida el estado de los gates locales para el release F0–F7.

## 1. Tabla de gates locales

| Gate | Comando | Resultado |
|---|---|---|
| Secret-scan | `pnpm security:scan-secrets` | ✅ exit 0 (sin secretos versionados) |
| Typecheck (recursivo) | `pnpm typecheck -r` | ✅ |
| Lint | `pnpm lint` | ✅ (1 warning **preexistente** `Step2PairingLeds.tsx:35`) |
| Build API | `pnpm build:api` | ✅ |
| Build Web | `pnpm build:web` | ✅ (12 rutas, demo `DEMO_MODE`) |
| Tests API | `pnpm --filter @smartsense/api test` | ✅ **156/156** |
| Tests DB | `pnpm test:db:external` (Neon dev) | ✅ **18/18** |
| Tests iot-bridge | `pnpm --filter @smartsense/iot-bridge test` | ✅ **23/23** |
| Smoke API local | `pnpm smoke:api` (API real + Neon) | ✅ **7 pasos OK** |
| Build de imágenes Docker | `docker build` (api/web) | ⛔ **BLOCKED por entorno** — Docker no disponible local; Dockerfiles listos para CI (no FAIL) |

## 2. Detalle de cobertura de tests (API 156/156)

- Fase 2 (auth/orgs/installations/devices/onboarding): 39
- Fase 3 (telemetría): 17
- Fase 4 (billing/dashboard/reports/breakdown): 36
- Fase 5 (alerts/recommendations + regresión dashboard): 22
- Fase 6 (control dry-run): 26
- Fase 7 (security 7 + health 2 + auth-refresh 7): 16

## 3. Smoke local (7 pasos)

`health → register → login → installation → dashboard → alerts → recommendations` contra API real + Neon dev. Todos OK.

## 4. Estado del gate

| Conjunto | Estado |
|---|---|
| Gates de código (typecheck/lint/build) | ✅ |
| Suites de test (API/DB/iot-bridge) | ✅ |
| Smoke local | ✅ |
| Build de imágenes Docker | ⛔ BLOCKED por entorno (no FAIL) — se ejecuta en CI/host con Docker |

> **Conclusión:** todos los gates locales ejecutables están en verde. El único gate no ejecutable localmente (build de imágenes Docker) está **BLOCKED por entorno**, no por defecto del código; se cubre en CI o en un host con Docker.
