# Contexto para Agentes — SmartSense Demo

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

## 🔧 CLI Setup (Apr 28)

### GitHub CLI
**Tokens en `.env.local` (NUNCA comitear):**
```
GITHUB_TOKEN=ghp_xxxx...  # Crear en https://github.com/settings/tokens
```
- ✅ Repo created & pushed
- ⚠️ Token stored locally (`.env.local` in `.gitignore`)

### Vercel CLI (TODO)
**Crear en https://vercel.com/account/tokens:**
```
VERCEL_TOKEN=vercel_...
```
- Scope: `smartsense-cli`
- Expiration: 90 days
- **Guardar en `.env.local` cuando esté listo**

### Cloudflare CLI (TODO)
**Crear en https://dash.cloudflare.com/profile/api-tokens:**
```
CLOUDFLARE_API_TOKEN=czd_...
```
- Template: “Edit Cloudflare Workers”
- Permissions: Account Workers Scripts + Routes, Zone Read
- **Guardar en `.env.local` cuando esté listo**

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
