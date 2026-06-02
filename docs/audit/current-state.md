# SmartSense — Auditoría de Estado Actual

> Fecha: 2026-06-01 · Autor: Arquitectura · Estado: inicial (pre-implementación)

## 1. Resumen

El repositorio **no contiene aplicación**: solo material de investigación de mercado/innovación y un PNG de portada. No hay código fuente, gestor de paquetes, ORM, esquema de base de datos ni configuración de build. SmartSense está hoy en estado **idea + investigación + maqueta**, no de software.

Esta auditoría establece la línea base para iniciar **spec-driven development**: primero especificar, validar e implementar después.

## 2. Estructura encontrada

```
SmartSense/
├── análisis/
│   └── Análisis comercial.pdf            (6.6 MB)
├── research/
│   ├── claims-y-supuestos-a-validar.md
│   ├── entrega-innovacion-radical-smartsense.md
│   ├── matriz-curva-valor-smartsense.md
│   ├── matriz-patrones-innovacion-smartsense.md
│   ├── research-smartsense-mercados-estrategicos-energia-chile.md
│   ├── resumen-ejecutivo-innovacion-smartsense.md
│   └── smartsense-reporte-final.pdf
├── .playwright-mcp/                       (artefacto temporal, no del producto)
└── smartsense-cover-preview.png
```

## 3. Stack detectado

| Capa | Detectado | Comentario |
|---|---|---|
| Frontend | — | Ninguno. No hay `package.json`. |
| Backend | — | Ninguno. |
| ORM | — | Ninguno. |
| Base de datos | — | Ninguna. |
| Autenticación | — | Ninguna. |
| Ruteo | — | Ninguno. |
| Gráficos | — | Ninguno. |
| IoT/MQTT/WebSocket | — | Ninguno. |
| Control de versiones | **No es repo git** (`fatal: not a git repository`) | Riesgo: trabajo sin historial. |

## 4. Stack recomendado (a confirmar en ADR)

Greenfield, alineado al stack estándar del equipo:

- **Backend:** Node.js + **Fastify** + TypeScript. **Prisma** ORM.
- **Base de datos:** **PostgreSQL 16** + extensión **TimescaleDB** para telemetría (hypertables).
- **Frontend:** **Next.js (App Router)** + TypeScript + **Tailwind CSS** + **React Query** (server state) + **Zustand** (UI state). Gráficos: **Recharts** o **visx**.
- **IoT:** ingestión vía **MQTT** (broker EMQX/Mosquitto) → bridge a backend; **WebSocket** para dashboard en vivo.
- **Auth:** JWT (access + refresh) con sesiones; RBAC multi-tenant.
- **Infra:** Docker Compose (dev), GitHub Actions (CI/CD), Cloudflare (edge), GCP (cloud).
- **Monorepo:** pnpm workspaces — `apps/api`, `apps/web`, `apps/iot-bridge`, `packages/shared`, `packages/db`.

## 5. Riesgos técnicos

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R-01 | No hay control de versiones (`git`) | Alta | `git init` antes de cualquier código. |
| R-02 | La maqueta **"App Smart Sense v1.pdf" no está en el repo** | Alta | Specs se basan en la descripción página-a-página del brief + research. Incorporar el PDF como fuente versionada cuanto antes. |
| R-03 | Telemetría IoT de alta cardinalidad puede saturar un PostgreSQL plano | Alta | TimescaleDB + agregados continuos; clave idempotente por evento. |
| R-04 | Extracción de boleta eléctrica (OCR) es frágil | Media | MVP = carga manual asistida; OCR como fase posterior. |
| R-05 | Cálculo de costos depende de tarifas chilenas variables (AT/BT, cargo por demanda) | Media | Modelar `tariffs`/`distributors` desde el inicio; centralizar cálculo en backend. |
| R-06 | Control remoto de dispositivos = superficie de ataque crítica | Alta | RBAC estricto, auditoría obligatoria, no-cross-tenant. |
| R-07 | Multi-tenant sin aislamiento puede filtrar datos entre instalaciones | Alta | Tenant scoping en cada query; tests de autorización obligatorios. |

## 6. Deuda de arquitectura

- No existe arquitectura: la deuda es **cero pero también la base es cero**. Ventaja: diseñar limpio sin migración de legacy.
- Decisiones aún abiertas (ver `specs/00-product/assumptions.md`): un solo segmento de entrada (OIMSAE/PyME) vs. hogar; modelo de hardware (kit propio vs. enchufes comerciales); estrategia de NILM.

## 7. Brechas frente a la maqueta

La maqueta describe 9 módulos (Inicio, Reportes, Desglose, Control, Alertas/recomendaciones, Proyecciones, Control inteligente, Ajustes) + onboarding por QR. **Brecha = 100%**: nada está implementado. Todas las pantallas requieren modelo de datos, API y frontend nuevos.

## 8. Recomendaciones de ordenamiento

1. `git init` + `.gitignore` + versionar la maqueta PDF.
2. Adoptar la estructura `specs/` (creada en esta ejecución).
3. Congelar el stack en un ADR (`docs/adr/0001-stack.md`).
4. No escribir código productivo hasta cerrar specs 00→04 y la matriz de trazabilidad.

## 9. Próximos pasos obligatorios

1. ✅ Estructura `specs/` creada.
2. ✅ Visión, requerimientos, dominio, MER, modelo relacional, API, frontend, backend, IoT y calidad especificados.
3. ⏭️ Validar matriz de trazabilidad (cobertura maqueta → FR → entidad → tabla → endpoint → componente → test).
4. ⏭️ Autorizar e implementar **Fase 1 (base de datos y dominio)** únicamente.
