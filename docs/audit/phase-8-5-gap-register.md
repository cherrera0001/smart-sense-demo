# Fase 8.5 — Gap Register

Severidad: BLOCKER (impide cutover) · HIGH (antes de producción) · MEDIUM (deuda controlada) · LOW (doc/mejora).

| ID | Tipo | Severidad | Descripción | Impacto | Acción | Responsable | Estado |
|---|---|---|---|---|---|---|---|
| G-01 | GAP-no-impl | MEDIUM | Bills (GET/POST) en OpenAPI + service/schemas/tests, pero sin `billing.routes.ts` ni registro en app.ts | Calibración de costo por boleta (BR-031) no accesible vía API | Cablear rutas (follow-up acotado, NO en este gate por regla no-features) | Backend | ABIERTO |
| G-02 | DEVIATION-shape | MEDIUM | Drift OpenAPI↔código: envelope `{nombre:[]}`≠`{data,page_info}`, camelCase≠snake_case, AuthSession, control 201≠202, reports date≠from/to | Clientes generados del OpenAPI fallarían; doc no refleja realidad | Reconciliar OpenAPI a la realidad testeada (NFR-045) — punch-list en openapi-route-audit | Backend/Specs | ABIERTO (deuda) |
| G-03 | GAP-no-openapi | MEDIUM | 6 endpoints implementados+testeados ausentes de OpenAPI: /auth/refresh, GET control-actions, GET+PATCH control-schedules, GET+PATCH consumption-limits | Contrato incompleto | Añadir a OpenAPI (NFR-045) | Specs | ABIERTO (deuda) |
| G-04 | OBSOLETE | MEDIUM | Specs F8 (runtime-gates, traceability, roadmap, tasks) fijan target API = Railway/Render/VPS/Docker; realidad = Vercel Serverless (Fase 8.4) | Trazabilidad SDD inexacta | **CORREGIR specs → Vercel; marcar Railway/Render obsoletos** | Auditor | **CORREGIDO (PASO 8)** |
| G-05 | OBSOLETE | LOW | `milestones.md` declara "todos PENDIENTE" pese a F0–F7 PASS | Estado de plan inexacto | **Actualizar milestones a cumplidos F0–F7** | Auditor | **CORREGIDO (PASO 8)** |
| G-06 | OBSOLETE | LOW | `validation-matrix.md` posible "todos PENDIENTE" pre-impl | Estado de validación inexacto | Revisar/actualizar | Auditor | **REVISADO (PASO 8)** |
| G-07 | GAP-doc | LOW | `refresh_tokens` (tabla 22, migración 0004) no documentada en relational-model/constraints | Modelo de datos incompleto en spec | **Documentar tabla en relational-model** | Auditor | **CORREGIDO (PASO 8)** |
| G-08 | DEVIATION-doc | LOW | Cuerpo de constraints.md/relational-model.md dice "enums text+CHECK"; impl usa enums nativos (reconciliado en nota c) | Contradicción interna menor | Nota aclaratoria en cuerpo | Auditor | **CORREGIDO (PASO 8)** |
| G-09 | PARTIAL | LOW | audit_logs: trigger append-only OK; falta revocar GRANT UPDATE/DELETE al rol app (constraints.md:177) | Defensa en profundidad (trigger ya bloquea) | Endurecimiento opcional (GRANT en Neon) | Backend/Ops | ABIERTO (opcional) |
| G-10 | GAP-doc | LOW | `NEXT_PUBLIC_API_URL` no en .env.example; puerto inconsistente (cliente :3001, env :4000) | Config web ambigua | **Documentar var + unificar puerto en .env.example** | Auditor | **CORREGIDO (PASO 8)** |
| G-11 | OUT-OF-SCOPE | (BLOCKER solo para cutover WEB) | Frontend productivo no implementado: web = 100% fixtures, api client muerto, sin auth flow, ~9 pantallas ausentes | El cutover de dominio a un frontend productivo NO es viable hoy; sustituiría demo por demo | Implementar capa productiva web (FASE NUEVA, fuera de F0–F8) | Frontend | ABIERTO (fase futura) |
| G-12 | CONFIG | LOW | Deployment Protection (SSO) ON en smartsense-web-v2 | Bloquea validación pública/CORS de la web | Desactivar en dashboard o Protection Bypass (decisión del usuario) | Usuario | ABIERTO |

## Clasificación final
- **BLOCKER (backend/API cutover): 0.**
- **HIGH: 0.** (El hallazgo /iot/telemetry se verificó tenant-scoped → LOW, descartado como gap de seguridad.)
- **MEDIUM: 3** (G-01 Bills, G-02/G-03 OpenAPI drift) — deuda controlada, no bloquea backend.
- **LOW: 6** (G-05–G-10, G-12) — mayoría corregidos en PASO 8.
- **OUT-OF-SCOPE: 1** (G-11) — bloquea solo el cutover de la WEB productiva, no el backend; es fase futura.

**Implicación:** el backend/API cumple specs sin BLOCKER/HIGH → cutover de API viable con deuda controlada. El cutover de la WEB requiere una fase de implementación de frontend productivo (no parte de F0–F8).
