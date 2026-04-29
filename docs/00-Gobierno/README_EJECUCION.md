# 🎯 SmartSense Execution Guide

**Status:** Ready to execute (Semana 0 completada)  
**Timeline:** 4 semanas (Semanas 1–4)  
**Objective:** De prototipo visual → MVP usable con datos reales + 2 flujos E2E

---

## 📍 Dónde Estamos

✅ **Completado:**
- Auditoría exhaustiva del código (vea `AUDIT.md` en GitHub issues si existe)
- Plan de ejecución con gates
- 3 documentos de backlog detallados (archivo por archivo)
- Alineación de alcance

❌ **Pending:**
- Ejecutar Quick Wins (Semana 1)
- Setup backend (Semana 1.5)
- Integración frontend-backend (Semana 3)
- Validación usuario (Semana 4)

---

## 🚀 QUICK START — Primeras 24 Horas

### Si eres developer:

```bash
# 1. Lee el plan
cat EXECUTION_PLAN.md

# 2. Entiende las 5 tareas de quick wins
cat BACKLOG_QUICK_WINS.md

# 3. Inicia la primera (Demo Banner)
# Archivo: components/layout/LayoutShell.tsx
# Tiempo: 4 horas
# Criterio: Usuario ve banner "⚠️ Modo Demo" en todas las páginas

# 4. Verifica tests pasan
pnpm test

# 5. Push a rama feature, crea PR
git checkout -b feat/quick-wins-1-demo-banner
# ... make changes ...
git push origin feat/quick-wins-1-demo-banner
```

### Si eres PM/product:

1. Leer **EXECUTION_PLAN.md** — entender 4 fases y 3 gates
2. Leer **Criterios de aceptación por Gate** → compartir con team
3. Setup: coordinar que backend dev cree `backend/` repo en paralelo a quick wins
4. Semana 1: asegurar que Quick Wins se completan (3 días) → GATE 1
5. Semana 1.5–3: backend dev ejecuta B1–B8, frontend comienza conexión a API

---

## 📋 Documentos de Referencia

### 1. EXECUTION_PLAN.md
- [ ] **Leer primero esto**
- Contiene: 4 fases, gates de decisión, criterios de aceptación, condiciones para pausar
- Tiempo de lectura: 15 min

### 2. BACKLOG_QUICK_WINS.md
- [ ] **5 tareas concretas para Semana 1 (3 días)**
- Archivo por archivo, línea por línea
- Cada tarea tiene: criterio terminado, código exacto, test manual
- Tiempo de lectura: 20 min (antes de ejecutar cada tarea)
- Tiempo de ejecución: 3 días (15 horas)

### 3. BACKLOG_MVP_BACKEND.md
- [ ] **8 tareas backend para Semanas 1.5–3 (2.5 semanas)**
- Diseño de dominio (B1) → modelo de datos (B2) → API spec (B3) → implementación (B4–B8)
- Sigue enfoque backend-first: no hace frontend sin que API esté definida
- Tiempo de lectura: 30 min (antes de start backend)
- Tiempo de ejecución: 2.5 semanas (37 horas con paralelismo frontend)

---

## 🎯 Roles y Responsabilidades (Semanas 1–4)

### Frontend Developer
**Semana 1:** Quick wins (5 tareas)
- [ ] T1: Demo banner (4h)
- [ ] T2: Deshabilitar botones muertos (3h)
- [ ] T3: Persistir alertas en localStorage (4h)
- [ ] T4: Extraer utilidad getAlertStyle (2h)
- [ ] T5: Mejorar accesibilidad modal (2h)

**Semana 2:** Esperar backend + empezar API client
- [ ] Crear `lib/api.ts` con fetchAccount, fetchAlerts, etc.
- [ ] Preparar componentes para leer de API en lugar de mock

**Semana 3:** Integración
- [ ] Conectar HeroNumerico a GET /account
- [ ] Conectar alertas/page.tsx a API
- [ ] Conectar onboarding Step3 a POST /account
- [ ] Tests E2E (Playwright) full flow

### Backend Developer
**Semana 0.5:** Setup
- [ ] Crear `backend/` repo
- [ ] Setup Node + Express + PostgreSQL

**Semana 1:** Diseño + Schema
- [ ] B1: Definir dominio (4h)
- [ ] B2: Diseñar schema SQL (6h)
- [ ] B3: Crear OpenAPI spec (4h)

**Semana 1.5–2:** Implementación
- [ ] B4: Setup DB + migrations (6h)
- [ ] B5: Auth register/login (6h)
- [ ] B6: Account + consumo (5h)
- [ ] B7: Alerts (4h)

**Semana 2.5–3:** Tests + CI
- [ ] B8: Unit + integration tests + CI pipeline (5h)

**Semana 3:** Soporte integración
- [ ] Feedback loop con frontend dev
- [ ] Ajustes a API si es necesario
- [ ] Seed data refinement

### QA
**Semana 1:** Test quick wins
- [ ] Verificar cada tarea en quick wins (manual testing)
- [ ] Validar localStorage roundtrips
- [ ] Validar responsive design (380px, 1440px)

**Semana 3:** Tests E2E
- [ ] Setup Playwright tests
- [ ] Test full flow: register → onboarding → dashboard
- [ ] Test mobile + desktop

**Semana 4:** Validación usuario
- [ ] Coordinar con 5–10 usuarios beta
- [ ] Recolectar feedback
- [ ] Medir KPIs (activación, comprensión, intención)

---

## ⚡ Checklist por Semana

### Semana 1 ✅ Quick Wins
- [ ] T1: Demo banner visible en todas las páginas
- [ ] T2: Botón "Cambiar tarifa" disabled + tooltip
- [ ] T3: Alertas leídas persisten en localStorage (refresh test)
- [ ] T4: getAlertStyle extraído (sin duplicación)
- [ ] T5: Modal accesible (ESC, focus trap, aria-modal)
- [ ] Verificar: pnpm test pasa, pnpm lint sin warnings
- [ ] **GATE 1 PASSED:** Commit + PR merged a master, deploy a Vercel

### Semana 2 ⏳ Backend Setup + Frontend Prep
- [ ] Backend: B1–B3 completados (dominio, schema, API spec)
- [ ] Backend: B4 (DB setup) en progreso
- [ ] Frontend: `lib/api.ts` creado
- [ ] Frontend: Componentes listos para conectarse a API

### Semana 3 ⏳ Integración + Tests
- [ ] Backend: B4–B8 completados, tests pasan (>70% coverage)
- [ ] Frontend: HeroNumerico lee de API, no de mock
- [ ] Frontend: Onboarding guarda tarifa en backend
- [ ] E2E tests: register → dashboard flujo funciona
- [ ] **GATE 2 PASSED:** Cero mock en flujos autenticados, CI verde

### Semana 4 ⏳ Validación + Decisión
- [ ] Script onboarding creado para 5–10 usuarios beta
- [ ] Métricas recolectadas: activación (%), comprensión (%), intención (%)
- [ ] Producto decision: continuar escala o pivotar
- [ ] **GATE 3 PASSED o FALLIDO:** Decisión tomada, next steps claros

---

## 🚨 Condiciones para PARAR

Si en cualquier semana ocurre:

- [ ] Backend setup toma > 3 días (re-plan timeline)
- [ ] Datos reales no disponibles (usar seed + simulate)
- [ ] Stakeholder cambia requisitos > 30% (STOP, re-align)
- [ ] Team tiene < 2 FTE (STOP, extender timeline)
- [ ] Tests fallan y causa desconocida (STOP, diagnosticar)

**Acción:** No pivotar en silencio. Explícitamente STOP, documentar, re-alinear.

---

## 📊 Estimación Total

| Fase | Horas | Team | Timeline |
|------|-------|------|----------|
| **Semana 1: Quick Wins** | 15 | Frontend | 3 días |
| **Semana 1.5–2: Backend Setup + Impl** | 26 | Backend | 3.5 días |
| **Semana 2.5–3: Integration + Tests** | 8 | Frontend + Backend | 3 días |
| **Semana 4: Validation** | 5 | PM + QA + Product | 3 días |
| **TOTAL** | **54 horas** | **2–3 FTE** | **4 semanas** |

Con paralelismo: ambas streams (frontend + backend) trabajan simultáneamente desde Semana 1.5.

---

## 🔗 Links a Documentos Detallados

```
├── EXECUTION_PLAN.md          ← Plan general (4 fases, gates, criterios)
├── BACKLOG_QUICK_WINS.md      ← 5 tareas Semana 1 (archivo por archivo)
├── BACKLOG_MVP_BACKEND.md     ← 8 tareas backend (Semanas 1.5–3)
├── AUDIT.md (si existe)       ← Análisis completo del código actual
└── CLAUDE.md                  ← Contexto general del proyecto
```

---

## 🎬 Cómo Empezar HOY

### Para Frontend Dev:
```bash
cd smart-sense-demo

# 1. Lee backlog quick wins
cat BACKLOG_QUICK_WINS.md | less

# 2. Empieza tarea T1
git checkout -b feat/quick-wins-1-demo-banner

# 3. Abre archivo
# components/layout/LayoutShell.tsx

# 4. Agrega código (sigue instrucciones en BACKLOG_QUICK_WINS.md > TAREA 1)

# 5. Test
pnpm dev
# Visita http://localhost:3000
# ✅ Demo banner visible
# ✅ Close button works
# ✅ Persist in localStorage

# 6. Push
git add components/layout/LayoutShell.tsx
git commit -m "feat: add demo mode banner with localStorage persistence"
git push origin feat/quick-wins-1-demo-banner

# 7. Create PR on GitHub
```

### Para Backend Dev:
```bash
# 1. Lee plan backend
cat BACKLOG_MVP_BACKEND.md | less

# 2. Crea repo backend
mkdir backend
cd backend
pnpm init

# 3. Sigue B1 (dominio), B2 (schema), B3 (API spec)
# (No code yet — solo documentos)

# 4. Luego B4 (setup), B5 (auth), etc.
```

---

## ❓ FAQs

**P: ¿Puedo empezar backend y frontend en paralelo?**  
R: SÍ. Frontend puede trabajar en quick wins (Semana 1) mientras backend hace B1–B3 (diseño). Integración comienza Semana 1.5.

**P: ¿Qué pasa si falla Gate 1?**  
R: No avanzas a Gate 2. Resuelves tareas fallidas en backlog. No es roadblock, solo significa otra semana en quick wins.

**P: ¿Y si no tenemos datos reales de consumo?**  
R: Usa seed data (mock) con patrón realista. La arquitectura es igual. Conecta API real cuando esté disponible (MVP+1).

**P: ¿Cuánto cuesta esto?**  
R: Estimación: 54 horas de trabajo = 2–3 FTE × 2 semanas (con paralelismo). Costo: $2K–5K USD dependiendo de seniority y ubicación.

**P: ¿Cuál es el MVP MÍNIMOmínimo?**  
R: 1 usuario puede registrarse, ver su consumo, marcar alertas leídas, y cambiar tema. Sin histórico, sin ML, sin integraciones.

---

## 📞 Support

Si tienes dudas:
1. Revisa EXECUTION_PLAN.md > "Condiciones para parar"
2. Revisa el backlog específico (Quick Wins o Backend)
3. Si ambos no ayudan: crea issue en GitHub con contexto

---

**Última actualización:** 2026-04-28  
**Status:** Ready to execute  
**Next milestone:** GATE 1 (Fin Semana 1)

