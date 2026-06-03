# Fase 1.1 — Bloqueo Formal de Runtime (Docker engine)

> Fecha: 2026-06-02 · Rama: `feat/phase-1-db-domain`. Estado: **BLOCKED** (entorno). No se declara PASS.

## Resumen
El gate de runtime de Fase 1 (`db:migrate` + `db:seed` + `test:db` contra Postgres real) **no se pudo ejecutar**: el engine de Docker Desktop no inicializa en este host, incluso tras un reinicio limpio. No hay PostgreSQL nativo disponible como fallback y la política de esta iteración prohíbe instalar software. Bloqueo de **entorno**, no de código.

## Comandos ejecutados y salida (resumida)

```text
$ docker info
Server:
ERROR: request returned 500 Internal Server Error ... /v1.51/info

$ docker ps
request returned 500 Internal Server Error for API route ...
  //./pipe/dockerDesktopLinuxEngine/v1.51/containers/json

$ docker run --rm hello-world
docker: request returned 500 Internal Server Error ... /_ping

$ docker context ls
default          npipe:////./pipe/docker_engine
desktop-linux *  npipe:////./pipe/dockerDesktopLinuxEngine   (activo)

$ wsl -l -v
  NAME            STATE        VERSION
* Ubuntu-24.04    Stopped/Running   2          ← NO aparece el distro 'docker-desktop'

$ psql --version      → command not found (sin Postgres nativo)
$ pg_isready          → no disponible
```

## Acciones de reparación ya intentadas (sin éxito)
1. Lanzar `Docker Desktop.exe` y poll del daemon (2 ventanas: 180s + 300s). → 500 persistente.
2. **Reinicio limpio**: `Stop-Process` de Docker Desktop/com.docker.backend → `wsl --shutdown` → relanzar Docker Desktop → poll. → **500 persistente, idéntico**.
3. Probar contexto `default` además de `desktop-linux`. → ambos 500.

## Diagnóstico / causa probable
- Los procesos `Docker Desktop` y `com.docker.backend` corren (6 procesos), por lo que el **proxy de la API responde** (pipe existe) pero devuelve **500** porque el **motor `dockerd` del backend Linux (WSL2) no termina de provisionarse**.
- Señal clave: **el distro WSL `docker-desktop` no aparece** en `wsl -l -v` (solo `Ubuntu-24.04`). En Docker Desktop con backend WSL2, el engine corre dentro de ese distro; su ausencia/no-arranque ⇒ engine inaccesible (500).
- Causa raíz típica: integración WSL2 corrupta o sin provisionar (kernel WSL viejo — `5.10.102.1`, con "automatic updates cannot occur due to your system settings"), o estado interno de Docker Desktop que requiere *Reset/Purge*.

## Por qué bloquea Fase 1.1
La migración SQL (`0001_init`, 592 líneas) y los tests de integridad **solo tienen valor si corren contra Postgres real**. Sin engine Docker y sin Postgres nativo, no hay DB contra la cual ejecutar `db:migrate`/`db:seed`/`test:db`. Declarar PASS sin ejecutarlos sería falso ("compila ≠ funciona con datos reales").

## Por qué Fase 2 sigue bloqueada
Fase 2 (API base) construye sobre el esquema de datos. Levantar endpoints sobre un esquema cuya migración nunca se aplicó arrastraría cualquier error de SQL/constraint/trigger a una capa superior. El gate de runtime debe cerrarse primero.

## Pasos manuales EXACTOS para reparar (acción del usuario en el host)
1. Abrir **Docker Desktop**.
2. Menú **Troubleshoot** (icono de bug / engranaje) → **Restart**.
3. Si persiste el 500: **Troubleshoot → Clean / Purge data** *(solo si aceptas perder contenedores/imágenes locales — en este proyecto no hay ninguno valioso)*.
4. **Settings → Resources → WSL Integration**: activar integración (y habilitar el distro `Ubuntu-24.04` si se quiere usar).
5. En PowerShell (como administrador):
   ```powershell
   wsl --update
   wsl --shutdown
   ```
6. Reiniciar **Docker Desktop** y esperar a **"Engine running"** (icono verde).
7. Confirmar engine sano:
   ```bash
   docker run --rm hello-world      # debe imprimir "Hello from Docker!"
   wsl -l -v                        # debe listar 'docker-desktop'  Running
   ```
8. Recién entonces, cerrar el gate de Fase 1.1:
   ```bash
   cd <repo>
   docker compose up -d db
   docker compose ps                # esperar healthy
   pnpm db:generate
   pnpm db:migrate
   pnpm --filter @smartsense/db exec prisma migrate status
   pnpm db:seed
   pnpm test:db                     # 18 tests reales (ya NO deben skippear)
   pnpm build:web && pnpm build:api && pnpm typecheck && pnpm lint
   ```

## Fallback no disponible
- **Postgres nativo Windows:** no instalado (`psql`/`pg_isready` ausentes).
- **Instalar Postgres:** descartado por política de esta iteración ("no instales software destructivamente; solo documenta bloqueo").
- **`embedded-postgres`/`pg-mem` (npm):** descartados — `pg-mem` no soporta extensiones/triggers/SQL crudo del `0001_init` (daría falso PASS); añadir binarios sería instalar software.

## Estado
**Fase 1.1: BLOCKED (entorno).** Fase 2: **BLOQUEADA**. El código y la migración quedan listos y commiteados; el gate se cierra en cuanto el engine Docker funcione (o haya un Postgres real disponible).
