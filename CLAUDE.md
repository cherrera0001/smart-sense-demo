# Contexto para Agentes — SmartSense Demo

## 🚦 EJECUCIÓN EN PROGRESO (Apr 28, 2026)

### Plan de Escalamiento: Demo → MVP Usable
Status: **SEMANA 0 - ALINEACIÓN**

**Documentos de ejecución:**
- [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md) — Plan de 4 fases (0–4 semanas) con gates de decisión
- [`BACKLOG_QUICK_WINS.md`](./BACKLOG_QUICK_WINS.md) — 5 tareas concretas (Semana 1, 3 días)
- [`BACKLOG_MVP_BACKEND.md`](./BACKLOG_MVP_BACKEND.md) — 8 tareas backend (Semanas 1.5–3, 2.5 semanas)

**Decisión de proyecto:** [✅] MVP USABLE (no solo demo)

**Objetivo final (Semana 4):** Usuario puede registrarse → ver consumo real → marcar alertas leídas (persistente)

**Gates:**
- [ ] **Gate 1 (Semana 1):** Usuario entiende qué es demo, estado básico persiste
- [ ] **Gate 2 (Semana 3):** 2 flujos E2E funcionales, tests pasan, zero mock en rutas autenticadas
- [ ] **Gate 3 (Semana 4):** Validación con 5–10 usuarios beta, señal de valor clara

**Próximos pasos:**
1. Ejecutar tareas 1–5 en BACKLOG_QUICK_WINS.md (3 días)
2. Crear backend/ repo (Node + PostgreSQL)
3. Ejecutar tareas B1–B8 en BACKLOG_MVP_BACKEND.md (2.5 semanas, paralelo con frontend)
4. Integración frontend-backend (semana 3)
5. Validación usuario (semana 4)

---

## 📋 Resumen del Proyecto (Apr 28, 2026)

**SmartSense** es un mockup funcional de dashboard de gestión energética en tiempo real. Incluye:
- ✅ Onboarding con pairing de enchufes
- ✅ Dashboard con contador live CLP
- ✅ Desglose por firma eléctrica (pie chart)
- ✅ Alertas predictivas (master/detail)
- ✅ Reporte semanal con análisis
- ✅ Ajustes y estado de dispositivos
- ✅ PWA (instalable como app)

**Stack:** Next.js 15 + Tailwind CSS 3.x + Recharts + lucide-react

## 🚀 Estado Actual (Apr 28, 2026)

### Deployment
- ✅ GitHub Repository: `cherrera0001/smart-sense-demo`
- ✅ Vercel Integration: `prj_pgEpK6iqMMcvAYen38xR0Nb9QjgF`
- ✅ Production URL: https://smartsense.c4a.cl
- ✅ Auto-deploy on master push

### UX/UI Improvements (Apr 28)
**4 fases completadas:**
1. **WCAG AA Dark Theme Contrast** ✅ — Todos los colors severities cumplen 4.5:1
2. **Responsive Chart Heights** ✅ — Mobile (360-430px) ahora funciona sin breaking
3. **Component Consistency** ✅ — Badge variants unificados, spacing estandarizado
4. **Mobile-First Design** ✅ — Font scaling, touch targets (44px), responsive typography

**Commits:**
- `d5fab3d` - Apply mobile-first responsive design (PHASE 1-4)
- `061e0e6` - Add MEDIUM priority UX/UI standardization classes
- `ba7a38a` - Fix Badge variant consistency and responsive chart heights

### Audit Status
- **CRITICAL:** 4/4 (100%) ✅
- **HIGH:** 5/5 (100%) ✅  
- **MEDIUM:** 8/15 (53%) 🔄
- **LOW:** 0/8 (0%) ⏳

## 🔧 CLI Setup (Apr 28) ✅ COMPLETADO

### GitHub CLI ✅
**Token en `.env.local`:**
```
GITHUB_TOKEN=ghp_...
```
- ✅ Authenticado con `gh auth login --with-token`
- ✅ Repo created & pushed a cherrera0001/smart-sense-demo
- ⚠️ Token stored locally (`.env.local` in `.gitignore`)

### Vercel CLI ✅
**Token en `.env.local`:**
```
VERCEL_TOKEN=vcp_...
```
- ✅ Autenticado con `npx vercel whoami`
- ✅ Project ID: `prj_pgEpK6iqMMcvAYen38xR0Nb9QjgF`
- ✅ Auto-deploy on master push habilitado
- Scope: Full account access
- Expiration: 90 days

### Cloudflare CLI ✅
**Token en `.env.local`:**
```
CLOUDFLARE_API_TOKEN=cfut_...
```
- ✅ Autenticado con `npx wrangler whoami`
- ✅ Permissions: Workers Scripts Edit, Routes Edit, Zone Read
- Zone Resources: All zones
- API Token (no OAuth)

## 📦 Comandos del Proyecto

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Build producción
pnpm start            # Producción local (post-build)
pnpm verify-deck      # Validar números del deck
pnpm lint             # TypeScript + linting
```

## 🪟 Windows — Node / pnpm Path Issues

En Git Bash, Node/pnpm a veces no se encuentran. **Solución:**

1. **Usar PowerShell en su lugar:**
   ```powershell
   $env:PATH += “;C:\Program Files\nodejs;$env:APPDATA\npm”
   pnpm install
   ```

2. **O agregar al PATH globalmente:**
   - Windows Settings → Environment Variables → PATH
   - Add: `C:\Program Files\nodejs`

3. **Health check:**
   ```bash
   node scripts/verify-deck.mjs  # No necesita pnpm
   ```

## 📁 Estructura Relevante

```
smart-sense-demo/
├── .env.local           # Tokens (NUNCA comitear)
├── .vercel/             # Vercel config
├── .claude/             # Claude Code settings
├── app/
│   ├── globals.css      # Tailwind + custom classes
│   ├── layout.tsx       # App layout
│   ├── page.tsx         # Dashboard
│   ├── dashboard/       # Dashboard components
│   ├── onboarding/      # Onboarding flow
│   ├── alertas/         # Alerts detail view
│   ├── desglose/        # Energy breakdown
│   ├── reporte/         # Weekly report
│   ├── ajustes/         # Settings
│   └── demo/            # Quick nav + iPhone frame
├── components/          # Shared components
├── lib/                 # Utils (formatCLP, mock data)
├── public/              # PWA assets (manifest, icons)
└── scripts/             # verify-deck.mjs
```

## 🎯 Próximos Pasos

### Inmediatos (Apr 28)
- [ ] Crear Vercel CLI token → guardar en `.env.local`
- [ ] Crear Cloudflare API token → guardar en `.env.local`
- [ ] Monitorear deployment en Vercel (en progreso)

### Corto Plazo (MEDIUM priority fixes)
- [ ] Aplicar `.numeric-value`, `.percentage-value` en valores CLP/KWh
- [ ] Reemplazar hardcoded icon sizes (w-3, w-4, w-5) con `.icon-xs/sm/md/lg`
- [ ] Usar `.label-*` classes en todos los labels
- [ ] Implementar `.empty-state` en vistas sin datos
- [ ] Reemplazar hover styles ad-hoc con `.hover-subtle/medium/prominent`

### Mediano Plazo (LOW priority)
- [ ] CardDescription vs manual paragraphs consistency
- [ ] Button height alignment (h-8 vs h-9 vs min-h-[44px])
- [ ] Number formatting precision (1 vs 2 decimales)
- [ ] Empty state patterns
- [ ] Hover state opacity consolidation

## 🧭 Backend-First Workflow (estándar de ejecución)

Cuando se inicie backend en este repo, seguir estrictamente este orden:

1. **Dominio y alcance**
   - Definir modulos (bounded contexts), entidades, actores y casos de uso.
2. **Modelo de datos**
   - Diseñar tablas, relaciones, PK/FK, indices, constraints y auditoria (`created_at`, `updated_at`, `deleted_at`).
3. **Contrato API**
   - Publicar OpenAPI v1 (endpoints, payloads, errores, paginacion/filtros, versionado).
4. **Implementación**
   - Construir por capas (`domain`, `application`, `infrastructure`, `api`) empezando por 2-3 flujos criticos.
5. **Calidad**
   - Ejecutar tests unitarios de dominio, integracion repositorio+DB y contract tests contra OpenAPI.

### Reglas de operación para agentes

- No saltar fases (dominio -> DB -> API -> implementación -> tests).
- No implementar endpoints sin contrato definido.
- Si hay ambiguedad, proponer 2 opciones con trade-offs y recomendar 1.
- Mantener cambios pequenos y verificables por fase.
- Antes de codificar, listar archivos a tocar y criterio de terminado.

### Prompt base recomendado para Claude Code (backend-first)

```text
Actúa como Staff Backend Engineer.
Ejecuta backend-first en este orden sin saltos:
1) Dominio (entidades, reglas, invariantes)
2) Modelo de datos (tablas, relaciones, PK/FK, indices, constraints)
3) Contrato API OpenAPI v1 (schemas, errores, paginación, filtros)
4) Implementación por capas (domain/application/infrastructure/api)
5) Tests (unit, integration, contract)

Reglas:
- No inventar features fuera de alcance.
- Si falta contexto, hacer máximo 5 preguntas críticas.
- Entregar por fase: decisiones, archivos tocados, código, riesgos y próximo paso.
```

## 🚨 Importante para Agentes

1. **No subir tokens a GitHub** — `.env.local` está en `.gitignore`
2. **PowerShell para builds en Windows** — Git Bash tiene PATH issues
3. **Vercel auto-deploys** — Cada push a `master` → production
4. **Mobile-first approach** — Viewport 380px es la base
5. **Mock data solamente** — Cero APIs reales en este mockup
6. **PWA enabled** — App instalable desde navegador (HTTPS required)

## 📚 Referencia Rápida

| Comando | Propósito |
|---------|-----------|
| `pnpm dev` | Dev local |
| `pnpm build` | Build prod |
| `git push origin master` | Deploy a Vercel |
| `pnpm verify-deck` | Validar números |
| `node scripts/verify-deck.mjs` | Sin pnpm needed |

---

**Actualizado:** 2026-04-28  
**Maintainer:** Cristóbal Herrera (cherrera0001)  
**Status:** 🟢 Production Ready (responsive design v1 deployed)
