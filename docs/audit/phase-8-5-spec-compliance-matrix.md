# Fase 8.5 — Matriz de Cumplimiento de Specs

Estados: PASS · PASS-WITH-DEVIATION · PARTIAL · GAP · OBSOLETE · OUT-OF-SCOPE.
Evidencia detallada en los docs hermanos `phase-8-5-*.md`.

| # | Spec | Requisito | Implementación | Evidencia | Estado |
|--:|---|---|---|---|---|
| 1 | 04-api auth | register/login/me/logout/refresh | 5 rutas + JWT + refresh rotation | auth.routes.ts:9-75; auth.test.ts | PASS-WITH-DEVIATION (logout 200≠204; AuthSession shape; refresh fuera de OpenAPI) |
| 2 | domain/api | Organizations CRUD | 3 rutas + tenant-scope | organizations.routes.ts:12-25 | PASS-WITH-DEVIATION (envelope/casing) |
| 3 | domain/api | Installations CRUD | 4 rutas | installations.routes.ts:37-57 | PASS-WITH-DEVIATION (envelope/casing) |
| 4 | domain/api | Devices CRUD | 4 rutas | devices.routes.ts:11-36 | PASS-WITH-DEVIATION (envelope/casing) |
| 5 | onboarding | scan/claim/pair/status | 4 rutas | onboarding.routes.ts:11-28 | PASS |
| 6 | 07-iot | Telemetry ingest/latest/range | 3 rutas + tenant-scope + anti-spoof | telemetry.routes.ts; telemetry.service.ts:69-85 | PASS-WITH-DEVIATION (range device_id; auth doc) |
| 7 | data-model | Energy aggregates | tabla + agregación | energy_aggregates (0001); aggregate service | PASS |
| 8 | 05-frontend/api | Dashboard | ruta + service | dashboard.routes.ts:10 | PASS |
| 9 | api | Reports daily/weekly/monthly/3m | 4 rutas | reports.routes.ts:20-38 | PASS-WITH-DEVIATION (date vs from/to) |
| 10 | api | Breakdown (firma eléctrica) | ruta + service | breakdown.routes.ts:11 | PASS |
| 11 | api | Alerts list/review | 2 rutas | alerts.routes.ts:15-26 | PASS |
| 12 | api | Recommendations | ruta + cols 0002 | recommendations.routes.ts:13 | PASS-WITH-DEVIATION (shape) |
| 13 | 06-backend | Control dry-run | rutas + dryRun true | control.service.ts:216-224; :99 | PASS-WITH-DEVIATION (201≠202; body; enum dry_run) |
| 14 | auth-and-permissions | RBAC (owner/admin/operator/viewer) | lib/access.ts roles | access.ts:31-79 | PASS |
| 15 | _canon INV | Tenant-scope (no cruce org) | assertOrg/Installation/Device | access.ts; aplicado control+telemetry | PASS |
| 16 | data-model | Audit log append-only | TRIGGER BEFORE UPDATE/DELETE | 0001 migration.sql:581-590 | PASS |
| 17 | 08-quality SEC | Secret scan | secret-scan.mjs | scripts/secret-scan.mjs | PASS |
| 18 | 08-quality SEC | Rate-limit auth/control 429 | plugin + onRoute | rate-limit.ts:17-34 | PASS |
| 19 | 08-quality SEC | CORS no wildcard prod | cors plugin + env guard | cors.ts; env.ts:26-28 | PASS |
| 20 | 08-quality SEC | Helmet | security-headers plugin | security-headers.ts:6-9 | PASS |
| 21 | 08-quality SEC | Refresh token rotation | rotate+revoke+reuse-detect | auth.service.ts:174-244 | PASS |
| 22 | 08-quality OPS | Health/healthz/readyz | health plugin SELECT 1 | health.ts:19-31 | PASS |
| 23 | 08-quality CI | CI pipeline verde | GitHub Actions | run 27054832429 success | PASS |
| 24 | (Fase 8.4) | Vercel API deploy | serverless Fastify | phase-8-4 doc; /health 200 | PASS |
| 25 | 05-frontend | Vercel web v2 deploy | build Next 15 READY | apps/web/.vercel; build PASS | PASS-WITH-DEVIATION (Deployment Protection ON; demo) |
| 26 | E2E | Smoke remoto | smoke:api 7/7 | precheck doc | PASS |
| 27 | _canon scope | No downlink IoT real | bridge dry-run, sin publish | iot-bridge mqtt-client.ts:69 | PASS |
| 28 | 05-frontend | DEMO_MODE web | flag default true | demo-mode.ts:12-15 | PARTIAL (flag desconectada de la UI; UI 100% fixtures) |
| 29 | deploy | Deployment protection | API SSO OFF (correcto); web v2 SSO ON | phase-8-4 doc; web project | PASS (API) / nota (web) |
| 30 | roadmap | Cutover readiness | API lista; web demo | frontend-readiness doc | PARTIAL (API ready; web = fase futura) |

## Fuera de scope F0–F8 (no penaliza este gate)
- UI productiva completa (`screens.md`/`routes.md`): fase futura. Web actual = demo intencional. → OUT-OF-SCOPE (este gate) / requisito para cutover de dominio web.
- MQTT productivo EMQX + downlink: explícitamente fuera de scope (control dry-run, bridge dry-run).
- Bills endpoints: service/schemas/tests existen pero rutas no cableadas → GAP MEDIUM (ver gap-register G-01).

## Resumen
- **Backend F0–F7 + deploy F8.4:** PASS / PASS-WITH-DEVIATION en todos los dominios. Sin GAP funcional salvo Bills (MEDIUM).
- **Seguridad/runtime gates:** 10/10 PASS.
- **OpenAPI:** drift MEDIUM documentado (NFR-045) — el código testeado es la fuente de verdad.
- **Frontend productivo:** no implementado (fase futura) → bloquea SOLO el cutover de la web, no el backend.
- **Sin BLOCKER/HIGH.**
