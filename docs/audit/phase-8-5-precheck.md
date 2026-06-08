# Fase 8.5 — Precheck (Spec Compliance Gate)

Fecha: 2026-06-08 · Rama: `release/smartsense-f0-f7` · Producción: NO TOCADA.

## Estado git
- Branch: `release/smartsense-f0-f7` (correcto).
- `git pull --ff-only`: Already up to date (HEAD = `d87765b`).
- Pendientes sin commitear (residuo Fase 8.3): docs/specs modificados + blueprints render/vps (obsoletos por Vercel). Se reconcilian en esta fase.

## Gates locales

| Gate | Comando | Resultado |
|---|---|---|
| Secret scan | `pnpm security:scan-secrets` | **PASS** — sin secretos versionados |
| Typecheck | `pnpm typecheck` | **PASS** (6 proyectos) |
| Lint | `pnpm lint` | **PASS** (1 warning react-hooks/exhaustive-deps en apps/web) |
| Build API | `pnpm build:api` | **PASS** (tsc) |
| Build Web | `pnpm build:web` | **PASS** (Next 15, Compiled) |
| Test API | `pnpm --filter @smartsense/api test` | **PASS** — 156/156 (15 files) |
| Test IoT bridge | `pnpm --filter @smartsense/iot-bridge test` | **PASS** — 23/23 (3 files) |
| Test DB externo | `SMARTSENSE_DB_ALLOW_UNSAFE=1 pnpm test:db:external` | **PASS** — 18/18 (2 files) |

> Nota: `test:db:external` requiere `SMARTSENSE_DB_ALLOW_UNSAFE=1` porque la DB Neon (`neondb`) no
> contiene señal `dev|test|staging` en el nombre. Guard de seguridad funcionando correctamente.

## API remota (Vercel Serverless — `https://smartsense-api-v2.vercel.app`)

| Check | Resultado |
|---|---|
| `GET /health` | **200** `{"status":"ok","version":"0.8.4-vercel"}` |
| `GET /readyz` | **200** `{"status":"ready","db":"ok"}` (Prisma↔Neon) |
| Smoke E2E (`smoke:api`) | **PASS 7/7** — health, register(JWT), login, installations, dashboard, alerts, recommendations |

## Veredicto precheck
Todos los gates verdes. Base sólida para auditoría de cumplimiento de specs (PASO 1–11).
