# Fase 1.1 — Runtime Verification + Commit Hygiene

> Fecha: 2026-06-02 · Rama `feat/phase-1-db-domain`. Objetivo: pasar Fase 1 de PARTIAL a PASS ejecutando migración/seed/tests contra Postgres+TimescaleDB real.

## Precheck (Paso 1)
- Rama: `feat/phase-1-db-domain` ✅
- node v22.15.0 · pnpm 8.12.0 ✅
- `.env`/`.env.local`/secretos/`node_modules`: **no trackeados** ✅
- Working tree: monorepo restructurado (108 renames de la demo + paquetes nuevos), entendible ✅
- Docker CLI: **28.5.1** presente · `docker-compose` standalone **v2.40.0** presente.

## Artefactos creados (Paso 2)
- `docker-compose.yml` — servicio `db` con `timescale/timescaledb:latest-pg16`, puerto 5432, user `smartsense`, db `smartsense_dev`, volumen persistente, healthcheck. Marcado dev-only.
- `.env.example` — `DATABASE_URL`, `NODE_ENV`, `NEXT_PUBLIC_DEMO_MODE`, `JWT_SECRET`, `API_PORT`.
- `packages/db/.env` — `DATABASE_URL` local (gitignored, verificado con `git check-ignore`).

## Revisión de drift schema↔migración (Paso 7) — ✅ sin DB
`prisma migrate diff --from-empty --to-schema-datamodel` genera **21 CREATE TABLE + 24 CREATE TYPE**, idéntico en conteo a la migración manual `0001_init/migration.sql` (que además añade CHECKs, hypertable y triggers no representables en Prisma). **Sin drift estructural.** `prisma generate` (Fase 1) ya había validado el modelo.

## Verificación runtime (Pasos 3–5) — ⛔ BLOQUEADA POR ENTORNO

Intento de levantar el engine:
1. Docker Desktop **estaba instalado pero el daemon no corría** (`docker info` falla; pipe inexistente).
2. Se lanzó `Docker Desktop.exe`. Procesos `com.docker.backend` y `Docker Desktop` quedaron activos.
3. Polling del daemon: **2 ventanas (180s + 300s ≈ 8 min)**. El pipe pasó de "file not found" a **HTTP 500 Internal Server Error persistente** — el proxy de Docker responde pero el motor `dockerd` del backend Linux **no completa la inicialización**.
4. Diagnóstico raíz: `wsl -l -v` muestra **solo `Ubuntu-24.04` (Stopped)**; **el distro `docker-desktop` (donde corre el engine en WSL2) NO está registrado/levantado**. Ambos contextos (`desktop-linux` y `default`) devuelven 500.

**Conclusión:** el bloqueo es del **entorno local de Docker Desktop / backend WSL2**, no del código ni del modelo de datos. No se ejecutaron `db:migrate`, `db:seed` ni `test:db` contra DB real. **No se declara PASS** (honestidad técnica: "compila ≠ funciona con datos reales").

### Remediación requerida (acción del usuario)
1. Abrir **Docker Desktop** y esperar a estado **"Engine running"** (ícono verde). Si queda colgado: *Troubleshoot → Restart* o *Reset to factory defaults*.
2. Verificar integración WSL2: `wsl --update`, y en Docker Desktop → *Settings → Resources → WSL Integration* habilitar el backend. Confirmar que aparece el distro `docker-desktop` en `wsl -l -v`.
3. Validar con `docker run --rm hello-world`.
4. Reanudar Fase 1.1 con los comandos del bloque siguiente.

### Comandos para cerrar el gate cuando Docker funcione
```bash
docker compose up -d db          # o docker-compose up -d db
docker compose ps                # esperar healthy
pnpm db:generate
pnpm db:migrate                  # aplica 0001_init (o usar: prisma migrate deploy)
pnpm --filter @smartsense/db exec prisma migrate status
pnpm db:seed
pnpm test:db                     # 18 tests reales (ya NO deben skippear)
pnpm build:web && pnpm build:api
```

## Estado de las demás validaciones (re-confirmadas, sin DB)
| Check | Resultado |
|---|---|
| `pnpm install` | ✅ |
| `prisma generate` / `migrate diff` | ✅ (schema válido, sin drift) |
| `pnpm -r typecheck` | ✅ |
| `pnpm -r lint` | ✅ (1 warning preexistente demo) |
| `pnpm build:web` | ✅ 12 rutas |
| `pnpm build:api` | ✅ |
| `pnpm test:db` | ⏳ skip (sin Docker) → debe correr real tras remediación |

## Reintento de reparación (2026-06-02, 2ª iteración)
Se ejecutó un **reinicio limpio**: `Stop-Process` de Docker Desktop + `wsl --shutdown` + relanzar Docker Desktop + poll del daemon. **Resultado idéntico: HTTP 500 persistente**; `docker run --rm hello-world` → 500; el distro WSL `docker-desktop` **sigue sin aparecer**. Por política ("no reinicios infinitos"), se detiene el intento automático y se formaliza el bloqueo en **`docs/audit/phase-1-runtime-blocker.md`**. No hay Postgres nativo como fallback y no se instala software.

## Veredicto Fase 1.1
**BLOCKED (entorno)** en el gate de runtime de DB por el engine de Docker local que no inicializa (backend WSL2 sin provisionar). Todo lo verificable sin DB está en verde y el código quedó **commiteado**. Fase 2 permanece **BLOQUEADA** hasta que `db:migrate` + `db:seed` + `test:db` pasen contra Postgres real. Remediación manual: ver `phase-1-runtime-blocker.md`.
