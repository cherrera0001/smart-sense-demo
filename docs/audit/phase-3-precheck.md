# Fase 3 — Precheck

> Fecha: 2026-06-03 · Rama: `feat/phase-3-iot-telemetry` · Monorepo `smartsense-brownfield`.
> Verificación previa al inicio de Fase 3 (IoT / Telemetría): confirma que Fase 1 y Fase 2 están cerradas en PASS y que el entorno está limpio para construir la ingestión de telemetría sobre la base de datos real y la API base.

## Resumen

Fase 1 (DB + dominio) y Fase 2 (API base) cerraron en **PASS** contra Postgres real (Neon, entorno Development, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech`). Las suites de ambas fases siguen verdes. Este precheck registra el estado del entorno antes de implementar la ingestión de telemetría, la agregación energética y el `iot-bridge`.

## Checklist de precondiciones

| Condición | Estado | Evidencia |
|---|---|---|
| Fase 1 cerrada en PASS | ✅ | `docs/implementation/phase-1-summary.md`; `test:db:external` 18/18 contra Neon |
| Fase 2 cerrada en PASS | ✅ | `docs/implementation/phase-2-summary.md`; 39/39 tests API contra Neon |
| DB de desarrollo disponible (Neon) | ✅ | Neon Postgres dev, database `neondb`, host enmascarado `ep-lucky-pine-***.neon.tech` (URL unpooled) |
| Sin migración nueva (MER intacto) | ✅ | Fase 3 reutiliza `telemetry_readings` y `energy_aggregates` de Fase 1; no se altera el esquema |
| Secretos no trackeados | ✅ | `.env`, `packages/db/.env` y `apps/iot-bridge/.env` gitignored; sin connection strings ni contraseñas versionadas |
| `apps/iot-bridge` env ignorado | ✅ | `apps/iot-bridge/.env` gitignored; `config.ts` enmascara secretos vía `maskSecret`, nunca imprime tokens |
| `apps/web` (demo) intacta bajo DEMO_MODE | ✅ | Build 12 rutas; sin cambios visuales; scaffold `apps/web/lib/api/client.ts` de Fase 2 intacto |
| Sin trabajo de Fase 4+ adelantado | ✅ | No hay dashboard, reportes, alertas, recomendaciones ni control; `app.ts` solo suma el módulo `telemetry` |

## Detalle

### Estado de Fases previas (precondición dura)
- **Fase 1:** `prisma migrate deploy` desde cero + `db:seed` + `test:db:external` (18/18) verde contra Neon real; 21/21 tablas.
- **Fase 2:** API Fastify 5 con JWT, RBAC multi-tenant y onboarding; **39/39 tests PASS** contra Neon real.
- Ambas habilitan la Fase 3: `telemetry_readings`/`energy_aggregates` (Fase 1) + devices/installations resueltos (Fase 2).

### MER intacto (sin migración)
- Fase 3 **no** introduce migración nueva. Reutiliza las tablas `telemetry_readings` (ingestión idempotente por `event_hash` UNIQUE) y `energy_aggregates` (rollup hour/day) materializadas en Fase 1.

### Entorno y secretos
- `DATABASE_URL`/`DIRECT_URL` viven en `packages/db/.env` (gitignored). El `iot-bridge` usa `apps/iot-bridge/.env` (gitignored). **No** hay connection strings, tokens ni contraseñas versionadas. Host siempre enmascarado en docs (`ep-lucky-pine-***.neon.tech`).
- `apps/iot-bridge/config.ts` aplica `maskSecret` y **nunca** imprime secretos (broker URL, token) en logs.

### Demo preservada
- `apps/web` sin cambios visuales: 12 rutas, `DEMO_MODE` default seguro. El scaffold `apps/web/lib/api/client.ts` de Fase 2 permanece intacto y no consume la API en esta fase.

### No-Fase-4
- La Fase 3 se limita a ingestión, lectura (latest/range) y agregación de telemetría + `iot-bridge` en dry-run. **No** incluye dashboard, reportes, costos CLP, alertas, recomendaciones, control ni MQTT productivo (diferidos a Fase 4+).

## Veredicto

Precondiciones de Fase 3 **satisfechas**. Entorno limpio, Fases 1 y 2 en PASS, MER intacto, secretos no trackeados (incl. `iot-bridge`), demo intacta, sin adelanto de Fase 4. **Fase 3 puede iniciarse.**
