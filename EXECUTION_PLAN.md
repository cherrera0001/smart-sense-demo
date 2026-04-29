# 🚀 Plan de Ejecución SmartSense — Semanas 0–4

**Última actualización:** 2026-04-28  
**Objetivo:** De prototipo visual → MVP usable con 2 flujos funcionales + validación usuario

---

## SEMANA 0 — ALINEACIÓN DE ALCANCE (1 día)

### Decisión de Proyecto

**ELEGIR UNO:**

```
[ ] A) DEMO PARA PITCH
    → Objetivo: mostrar UI bonita, flujo bonito, pero sin pretender que funciona
    → Alcance: solo cosmética (remover botones muertos + agregar Demo banner)
    → Timeline: 2–3 días
    → Riesgo: inversores entienden que NO es funcional
    → Go if: financiación depende de apariencia, no de tech

[✅] B) MVP USABLE (RECOMENDADO)
    → Objetivo: usuario real puede registrarse, ver consumo real, marcar alertas leídas
    → Alcance: backend mínimo + 2 flujos E2E funcionales + persistencia
    → Timeline: 3–4 semanas
    → Riesgo: work load es significativo pero desacopla de mock-data
    → Go if: necesitas validar propuesta con usuarios, o levantar capital técnico
```

**DECISION TOMADA: [✅] B) MVP USABLE**

---

## OBJETIVOS POR FASE

### Semana 0: Alineación (1 día)
- [ ] Documento alcance firmado (abajo)
- [ ] Confirmar stack backend (Node/Express + PostgreSQL)
- [ ] Criar repo backend (separado o monorepo)
- [ ] Asignar roles: (frontend dev, backend dev, QA/test)

### Semanas 1–1.5: Quick Wins + Persistencia Local (3 días)
- [ ] Remover UI no-operativa
- [ ] Agregar "Demo Mode" banner transparencia
- [ ] Persistir alertas leídas en localStorage
- [ ] Persistir preferencias notificaciones en localStorage
- [ ] Extraer lógica duplicada de alertas a utilidad
- [ ] **GATE 1:** Usuario entiende qué es demo, estado básico persiste

### Semanas 1.5–3: MVP Backend + 2 Flujos (1.5 semanas)
- [ ] Backend mínimo: DB schema + autenticación + 3 endpoints críticos
- [ ] Conectar onboarding a backend (guardar tarifa, usuario)
- [ ] Conectar dashboard a API real (GET /account)
- [ ] Tests unitarios + integration tests
- [ ] **GATE 2:** 2 flujos E2E funcionales, tests pasan, zero mock en flujo crítico

### Semanas 3–4: Validación Usuario (1 semana)
- [ ] Crear script onboarding para 5–10 usuarios beta
- [ ] Medir: activación, comprensión de ahorro, intención de uso
- [ ] Iterar propuesta o escalar tech
- [ ] **GATE 3:** Señal clara de valor (>60% intención de uso) o pivot

---

## CRITERIOS DE ACEPTACIÓN POR GATE

### ✅ GATE 1 — Fin de Quick Wins

**Debe cumplir TODOS:**

- [ ] Banner "Modo Demo — Datos ficticios" visible en header de todas las páginas
- [ ] Botón "Cambiar tarifa" en ajustes está deshabilitado CON tooltip: "En construcción"
- [ ] Checkboxes notificaciones guardan preferencia en localStorage
- [ ] Al cerrar/reabrir app: alertas previamente leídas siguen leídas
- [ ] Al cerrar/reabrir app: tema (light/dark) se mantiene
- [ ] Modal de alertas tiene `role="dialog"` + `aria-modal="true"` + cierre con ESC
- [ ] No hay código duplicado de `getAlertStyle()` (extraído a `lib/utils.ts`)
- [ ] Tests visuales (Playwright) pasan sin warnings
- [ ] Documento alcance está firmado

**Si NO cumple:** volver a backlog, no avanzar a MVP.

---

### ✅ GATE 2 — Fin MVP Backend

**Debe cumplir TODOS:**

- [ ] Usuario nuevo puede registrarse (POST /auth/register) con email + password
- [ ] Usuario puede loguear (POST /auth/login) → JWT token
- [ ] Flujo onboarding guarda tarifa seleccionada en `accounts` table
- [ ] Dashboard lee consumo de API (GET /account) NO de mock-data
- [ ] Alert "leída" se persiste en DB (PATCH /alertas/:id)
- [ ] Tests de unidad pasan: lógica de cálculo tarifa (kWh × clp/kwh)
- [ ] Tests de integración pasan: flow login → lectura consumo → marcar alerta leída
- [ ] OpenAPI v1 spec está documentado y actualizado
- [ ] CI pipeline pasa (linting + tests + build)
- [ ] Zero mock-data en rutas autenticadas (excepto seed inicial)

**Si NO cumple:** resolver en sprint, no pasar a validación usuario.

---

### ✅ GATE 3 — Validación Usuario

**Debe cumplir MÍNIMO 2 DE 3:**

- [ ] **Activación:** ≥ 4 de 5 usuarios completan onboarding (≥80%)
- [ ] **Comprensión:** ≥ 4 de 5 usuarios pueden responder "¿cuánto ahorrarías si cambias horario de lavado?" (+/- 20%)
- [ ] **Intención:** ≥ 3 de 5 usuarios responden "usaría esta app en próximos 30 días" (Yes/Maybe, no No)

**Si NO cumple:** 
- [ ] Option A: Pivotar propuesta (enfoque diferente al problema)
- [ ] Option B: Abandonar si el problema no es real

**Si SÍ cumple:**
- [ ] Continuar desarrollo + plan de escala

---

## DOCUMENTO DE ALCANCE MVPO

### Definición de MVP

```
Producto Mínimo Viable: app que permite a usuario (propietario de casa en Chile)
1. Registrarse con email + contraseña
2. Seleccionar tarifa (BT-1 o BT-1A) + comuna
3. Ver consumo de hoy en CLP
4. Ver 3 alertas tipo (anomalía, sugerencia, tip)
5. Marcar alertas como leídas (persistente)
6. Cambiar tema (light/dark)

NO incluye en MVP:
- Emparejamiento de enchufes reales (QR, BLE, etc.)
- Histórico > 1 mes
- ML / predictive analytics
- Integración directa con utilities (CGE, etc.)
- Multi-lenguaje
- Notificaciones push
```

### Flujos Críticos (E2E)

#### Flujo 1: Onboarding → Dashboard (primero)
```
User visits / → Splash
→ Not onboarded → /onboarding
→ Step 1: QR (VISUAL only, no validation)
→ Step 2: LED pairing (VISUAL only, no validation)
→ Step 3: Tarifa + Comuna (SELECT → POST /onboarding → localStorage + DB)
→ /dashboard (load from GET /account)
✅ Exit: consumoHoy.clp renderizado en HeroNumerico
```

#### Flujo 2: Alert Mark as Read (segundo)
```
User in /alertas
→ Click alert card → modal opens
→ Modal has button "Marcar como leída"
→ Click → PATCH /alertas/:id { leida: true }
→ Modal closes, alert visual state changes
→ Refresh page → alerta sigue como leída (DB + localStorage fallback)
✅ Exit: alert no reaparece como nueva
```

---

## CONDICIONES PARA PARAR

Si en **Semana 2** (end of quick wins + start backend):

- [ ] Backend setup toma > 3 días (no-go: replanificar)
- [ ] Descubrimos que datos reales no están disponibles (no-go: usar seed data + simulate)
- [ ] Stakeholder cambia requisitos > 30% (no-go: pausar, realinear)
- [ ] Team tiene <2 FTE para 4 semanas (no-go: extender timeline)

Si ocurre → explícitamente STOP, no pivotar en silencio.

---

## PRÓXIMOS PASOS (EoD Semana 0)

- [ ] FIRMAR decisión: A o B (arriba)
- [ ] CREAR repo backend
- [ ] ASSIGNAR roles
- [ ] INICIAR quick wins mañana

