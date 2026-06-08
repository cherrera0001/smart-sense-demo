# Fase 8.5 — Inventario de Specs

Fecha: 2026-06-08. 41 archivos bajo `specs/` (40 `.md` + `openapi.yaml`). Árbol completo (00→09 + `_canon.md`).

## Specs prioritarios

| Spec | Propósito | Estado | Nota |
|---|---|---|---|
| 02-domain/domain-model.md | 21 entidades de dominio | Actualizado | Agnóstico de infra; coherente con F1–F6 |
| 02-domain/business-rules.md | 40+ reglas BR-NNN | Actualizado | BR-031 (costeo con tarifa/boleta) implementado F4 |
| 03-data-model/relational-model.md | Modelo físico PG 16 + Timescale, 21 tablas | Actualizado | Notas F1/F5/F6; documenta Neon sin Timescale (fallback DO/EXCEPTION) |
| 03-data-model/constraints.md | PK/FK/UNIQUE/CHECK/triggers | Desfase menor | Cabecera dice "enums text+CHECK"; impl usa **enums nativos** (reconciliado en notas de relational-model) |
| 04-api/openapi.yaml | Contrato OpenAPI 3.1 | **Desfasado (conocido, NFR-045)** | Shapes reales F4–F6 son superset; reconciliación pendiente. Servers = api.smartsense.cl (no refleja Vercel) |
| 04-api/api-overview.md | Convenciones + estado F2–F6 | Actualizado (doc vivo) | Base URL declarada api.smartsense.cl/v1 |
| 05-frontend/screens.md | 17 pantallas | Spec-objetivo | Describe UI productiva NO implementada (web en DEMO_MODE) |
| 05-frontend/routes.md | Rutas Next App Router | Spec-objetivo | UI no implementada |
| 07-iot/telemetry-model.md | Contrato lectura energética | Actualizado | Coherente con telemetry_readings |
| 07-iot/mqtt-or-ingestion-contract.md | Contrato MQTT EMQX→bridge→API | Desfase parcial conocido | event_hash usa device_id (desviación F3 documentada); MQTT productivo no implementado (bridge dry-run) |
| 08-quality/runtime-gates.md | Gates ejecutables SDD | Actualizado (doc vivo) | **Menciona Railway/Render/VPS/Docker como target API staging → obsoleto por Vercel (Fase 8.4)** |
| 08-quality/traceability-matrix.md | Matriz FR↔entidad↔tabla↔endpoint↔UI | Actualizado (doc vivo) | Replica gates F8.x (Railway) → actualizar a Vercel |
| 09-implementation-plan/tasks.md | Tareas T-FNN-NN | Actualizado (doc vivo) | F8.1/8.2/8.3 con tareas Railway/Render READY-BLOCKED → obsoletas |
| 09-implementation-plan/roadmap.md | Roadmap por fases | Actualizado (doc vivo) | F0–F7 PASS; menciona Railway/Render/Fly/VPS/Docker |
| 09-implementation-plan/milestones.md | Hitos M-0..M-10 | **DESFASADO** | Dice "todos PENDIENTE" pese a F0–F7 PASS |
| 08-quality/validation-matrix.md | Matriz validación | **DESFASADO (probable)** | Cabecera "todos arrancan PENDIENTE" pre-implementación |

## Resto (estables, agnósticos de host, sin mención de host API)
00-product/*, 01-requirements/*, 02-domain/bounded-contexts.md, 03-data-model/{mer-conceptual,indexes,data-dictionary,lifecycle-and-retention}, 04-api/{error-model,auth-and-permissions}, 05-frontend/{components,state-management,information-architecture}, 06-backend/*, 07-iot/{device-model,device-provisioning}, 08-quality/test-plan, _canon.md.

Stack canónico (06-backend/backend-architecture, 01-requirements/NFR): Node+Fastify, PG16+TimescaleDB, MQTT EMQX, monorepo pnpm. **Agnóstico de PaaS** — no fija Railway ni Vercel.

## Desfases a corregir (PASO 8)
1. **F8 specs (runtime-gates, traceability, roadmap, tasks)**: target API = Railway/Render/VPS → actualizar a **Vercel Serverless (Fase 8.4)**, marcar Railway/Render obsoletos.
2. **milestones.md**: refleja "todos PENDIENTE" → actualizar a F0–F7 cumplidos.
3. **validation-matrix.md**: revisar/actualizar desfase.
4. **relational-model.md / constraints.md**: documentar `refresh_tokens` (tabla 22) y confirmar enums nativos en cuerpo.
5. **openapi.yaml**: drift de shapes/endpoints → ver openapi-route-audit (MEDIUM, NFR-045).
