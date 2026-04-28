# Contexto para agentes (Smart Sense Demo)

## Windows — Node / pnpm “no encontrado” en Git Bash

En muchas instalaciones, **Git Bash no hereda el mismo PATH** que PowerShell o el terminal de Cursor. Antes de pedir al usuario que instale algo:

1. **PowerShell** (recomendado para `pnpm install` / `pnpm build` en este repo):
   - `Get-Command node, npm, pnpm | Select-Object Name, Source`
   - Si faltan, ampliar PATH de la sesión:
     - `$env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm"`

2. **Rutas típicas** (comprobar con `Test-Path`):
   - `C:\Program Files\nodejs\node.exe`
   - `$env:APPDATA\npm\pnpm.cmd`
   - `$env:LOCALAPPDATA\pnpm\pnpm.exe`

3. **Health check sin dependencias** (siempre que exista *algún* `node`):
   - `node scripts/verify-deck.mjs` — valida cifras del deck vs `lib/mock-data.ts`.

4. Si bash falla, **no parar**: probar PowerShell o `cmd /c where node` antes de escalar al usuario.

## Comandos del proyecto

- `pnpm verify-deck` — alias a `node scripts/verify-deck.mjs`
- `pnpm build` / `pnpm lint` — tras `pnpm install`

## Nota

Configuración de shell del proyecto: `.claude/settings.json` (PowerShell + tool). Copia el patrón a `~/.claude/settings.json` si lo querés global en tu máquina.
