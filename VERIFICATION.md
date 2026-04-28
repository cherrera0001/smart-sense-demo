# Verificación pre-defensa

## Importante: sandbox del agente ≠ tu PC

Los asistentes que corren en **Cursor/Claude Code a veces usan un entorno sin tu PATH de usuario**. Si el agente dice “no hay `node`”, **no implica** que tu Windows no tenga Node — sobre todo si ya trabajás con otros repos (pnpm, Next, etc.).

**Antes de instalar otra versión de Node desde nodejs.org** (riesgo de duplicar runtime o chocar con nvm/Volta/fnm), **confirmá en tu propia terminal**:

```powershell
node --version
pnpm --version
where.exe node
where.exe pnpm
```

### Escenario A — Todo responde con versiones

Tu entorno está bien; el problema fue solo el sandbox. Seguí directo:

```powershell
cd C:\Users\c4all\Documents\C4A\C4A\smart-sense-demo
node scripts\verify-deck.mjs
pnpm install
pnpm build
pnpm dev
```

Abrí `http://localhost:3000`.

### Escenario B — `node` funciona, `pnpm` no

Solo falta pnpm global:

```powershell
npm install -g pnpm
```

Luego los mismos comandos del Escenario A.

### Escenario C — `node` tampoco funciona en *tu* PowerShell

Ahí sí: instalá **Node LTS** (instalador o `winget install OpenJS.NodeJS.LTS`) o repará el PATH. Es el escenario menos probable si tenés historial de proyectos Node en la misma máquina.

---

## Coherencia con el deck (fuente: `lib/mock-data.ts`)

| Campo | Valor |
|-------|--------|
| Consumo hoy | **7,58 kWh** → **$1.250** (165 CLP/kWh) |
| Proyección fin de mes | **$42.500** (último punto de `serieMesAcumulada`) |
| Firma (5 segmentos) | Refrigeración **38%** · Climatización **24%** · Iluminación **12%** · Electrónica **14%** · Lavado **12%** |
| Suma CLP firma | **$1.250** |
| Suma serie horaria (24 h) | **$1.250** |
| Hero contador vivo | Base $1.250 · +$8…+$15 cada 5 s · **techo $1.450** |

Validación rápida **sin `pnpm install`** (solo Node):

```powershell
node scripts\verify-deck.mjs
```

## Comandos completos (tras `pnpm install`)

```powershell
pnpm verify-deck
pnpm build
pnpm lint
```

Si `pnpm build` falla, pegá **stdout + stderr completo**.

## Checklist visual vs deck (orden sugerido)

1. **`/onboarding` paso 2** — 4 LEDs: azul pulsando → verde fijo en cascada (~6 s).
2. **`/dashboard`** — hero **$1.250** y contador que tickea (techo $1.450).
3. **`/desglose`** — doughnut con **exactamente 5** segmentos: 38 / 24 / 12 / 14 / 12 %.
4. **`/alertas`** — **≥3** alertas; click abre modal/dialog.
5. **`/reporte`** — barras semana actual vs anterior + huella carbono.
6. **`/ajustes`** — **3** enchufes online + **1** reconectando.
7. **`/demo`** — reset onboarding + toggle marco iPhone.

Si alguna falla: screenshot + mensaje de error al agente.

## Screenshots (Playwright)

Tras `pnpm build`: ver `package.json` → `pnpm screenshots` y `VERIFICATION.md` / `TROUBLESHOOTING.md`.

## Artefactos útiles para sesiones futuras

- `scripts/verify-deck.mjs` — validación numérica sin dependencias.
- `.claude/settings.json` + `CLAUDE.md` — PowerShell y reglas PATH.
- `HANDOFF.md` / `TROUBLESHOOTING.md` — referencia pair programming.
