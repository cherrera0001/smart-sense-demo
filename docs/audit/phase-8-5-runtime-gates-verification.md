# Fase 8.5 — Verificación de Runtime/Security Gates

`specs/08-quality/runtime-gates.md` vs evidencia en código. **10/10 PASS.**

| Gate | Requisito | Evidencia (file:line) | Estado |
|---|---|---|---|
| Secret scan | escanea archivos versionados | scripts/secret-scan.mjs:19-27 (7 patrones), git ls-files :99-102, ignora dist/.next/node_modules, placeholders .env.example, exit 1 con hits | **PASS** |
| JWT fuerte en prod | rechaza secretos <32 + CORS wildcard en prod | config/env.ts:15-19 (lanza si <32), :38-39 (ambos secretos), :26-28 (wildcard) | **PASS** |
| Refresh token rotation | rota, revoca, detecta reuso | auth.service.ts: issueTokens persiste SHA-256 :174-190; rotate atómico :220-231; reuso de revocado → revoca árbol :207-213; revoke idempotente :235-244 | **PASS** |
| Rate-limit auth/control | global + estricto 429 | rate-limit.ts:17-18 (300/min global, 10/min strict), onRoute :23-34 (auth login/register + POST control-actions), registrado antes de rutas app.ts:50-53 | **PASS** |
| Helmet | registrado | security-headers.ts:6-9 (CSP off API JSON, CORP same-site), app.ts:46-48 | **PASS** |
| CORS no wildcard | allowlist; prod sin `*` | cors.ts:11-18 (callback contra CORS_ORIGINS, no listado → false), env.ts:26-28 | **PASS** |
| Logs redactados | pino redaction | logger.ts:9-31 (authorization, cookie, password, token, refresh_token, DATABASE_URL, JWT_*, MQTT_PASSWORD → [REDACTED]) | **PASS** |
| /health /healthz /readyz | liveness sin DB + readiness SELECT 1 | health.ts:19-20 (liveness), :22-31 (readyz SELECT 1 → 503 si falla); sin secretos | **PASS** |
| Control dry-run | dryRun default true, sin downlink | control.service.ts:216-224 (dryRun:true hardcoded, "simulado sin downlink"), status forzado 'dry_run' :99; schedules/limits solo persisten política | **PASS** |
| No downlink MQTT | bridge dry-run, no publica | iot-bridge config.ts:17,68 (default dry-run); mqtt-client.ts solo subscribe :69, **sin client.publish** (grep vacío); uplink-only | **PASS** |

## Análisis prioritario: POST /iot/telemetry (severidad)

- **Auth:** JWT obligatorio (`preHandler:[app.authenticate]`, telemetry.routes.ts:14). Payload JWT = `{sub:userId}`; scoping server-side por membership.
- **Tenant-scope (doble candado):**
  1. `assertInstallationAccess(prisma, userId, dto.installation_id, ROLES.operate)` (telemetry.service.ts:69) → resuelve org de la installation y exige membership operate+, 403 `crossTenant` si no (access.ts:41).
  2. Anti device-spoofing (telemetry.service.ts:80-85): valida `device.kitId===dto.kit_id && device.installationId===dto.installation_id`, si no → 409 DEVICE_KIT_MISMATCH.
- **Tests:** telemetry.test.ts:151-172 cubre device de otra installation + cross-tenant directo.
- **Veredicto: NO explotable cross-tenant. Severidad LOW.** Riesgo residual acotado a la propia org (operator inyecta telemetría sintética en sus devices — diseño legítimo). El único desfase es de **documentación**: el OpenAPI documenta token de kit con scope `telemetry:ingest`; la impl usa JWT user + tenant-scope. Reconciliar el contrato (MEDIUM doc), no es gap de seguridad.

## Patrón tenant-scope (consistente)
Helper central `apps/api/src/lib/access.ts`: `assertOrgAccess` :31-47, `assertInstallationAccess` :50-63, `assertDeviceAccess` :66-79. Aplicado en TODA mutación/lectura de control (control.service.ts:174,255,283,327,368,395,454,493,518) y telemetry (:69,183,212). Invariante "ninguna query cruza organization_id" respetado (scoping deriva del membership del JWT, nunca de un orgId del cliente).

## Gates de despliegue/ops adicionales (evidencia Fase 8.4)
- API desplegada Vercel Serverless: /health 200, /readyz 200 (Neon), smoke 7/7. (ver phase-8-4-vercel-serverless-api.md, phase-8-5-precheck.md)
- CI: success en último push (run 27054832429). 
- Producción antigua (smart-sense-demo): NO TOCADA. PR #1 sin merge.
