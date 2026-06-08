# Visión de Producto — SmartSense

> Fuente de verdad de stack, entidades, enums y convenciones: `specs/_canon.md`. Este documento es consistente con ese canon; cualquier divergencia se registra en `specs/00-product/assumptions.md`.

## 1. Descripción del producto

SmartSense es una plataforma **SaaS + IoT de monitoreo y gestión energética en tiempo real**, expresada siempre en **CLP** (pesos chilenos), orientada a tres segmentos: hogar (`home`), PyME (`smb`) y empresa/agro/retail/fábrica (`business`).

El producto combina:

- **Hardware IoT** (un *kit* identificado por QR que agrupa enchufes inteligentes, sensores y/o medidores de circuito) que emite telemetría energética vía MQTT.
- **Backend** (Node.js + Fastify + Prisma + PostgreSQL/TimescaleDB) que ingiere telemetría, la agrega, la valora monetariamente contra tarifas chilenas y genera alertas y recomendaciones.
- **Frontend** (Next.js + Tailwind + React Query + Recharts) que entrega dashboard en vivo (WebSocket), reportes históricos, desglose por dispositivo, control remoto/programado y proyecciones.

Principio rector del canon: **convertir la energía de un costo fijo incontrolable en una variable operacional gestionable en tiempo real, sin requerir expertos.** El cálculo de costos vive **siempre en backend**; el frontend solo renderiza.

## 2. Problema que resuelve

La energía eléctrica es gestionada de forma **reactiva y post-mortem**: el usuario solo descubre cuánto gastó cuando llega la boleta, sin saber qué dispositivo, qué horario ni qué decisión operacional la encareció.

- En el **hogar**: la boleta es una caja negra; no hay visibilidad de qué consume ni cómo bajarla.
- En la **PyME**: el dueño paga la energía como un costo fijo inevitable, sin herramientas para asignarla a procesos ni detectar fugas.
- En la **empresa mediana (OIMSAE)**: factura $3M–$40M CLP/mes, **no tiene energy manager**, y las soluciones existentes (BMS, EMS, SCADA, consultoras) son demasiado caras, complejas y lentas para su escala. Un componente significativo de su factura AT puede ser **cargo por potencia/demanda máxima** que hoy no controla.

SmartSense cierra el ciclo: **medir → traducir a CLP → alertar → recomendar → controlar**, antes de que llegue la boleta.

## 3. Usuarios objetivo

- **Residente del hogar** (`home`): persona natural que quiere entender y reducir su cuenta de luz. Rol típico `owner`.
- **Dueño/administrador de PyME** (`smb`): gestiona un local o pequeño negocio; necesita asignar consumo y detectar derroche. Roles `owner`, `operator`.
- **Operador Industrial Mediano Sin Área Energética — OIMSAE** (`business`): jefe de operaciones/mantención de cámara de frío, packing, maestranza, planta de proceso, retail o agro. No es experto en energía pero toma decisiones operacionales. Roles `owner`, `admin`, `operator`, `viewer`. **Segmento estratégico.**

El modelo multi-tenant se ancla en `Organization` (tenant raíz). En `home`, la organización es **implícita** y de un solo usuario (ver SUP-002 en `assumptions.md`).

## 4. Los tres segmentos y sus necesidades

| Segmento | Quién | Necesidad central | Énfasis de producto |
|---|---|---|---|
| **home** | Residencia familiar | Entender la boleta, identificar gastos invisibles, bajar el monto mensual | Simplicidad, desglose por electrodoméstico, alertas de ahorro en CLP, control de enchufes |
| **smb** | Local/negocio pequeño | Convertir energía en costo gestionable, detectar derroche fuera de horario | Reportes por horario operativo, límites de consumo, control programado |
| **business** (OIMSAE) | Empresa mediana 20–500 empleados, $3M–$40M CLP/mes | Reducir cargo por demanda/potencia, gestionar multisede, evidenciar trazabilidad | Demanda máxima, multi-instalación, RBAC, alertas pre-factura, recomendaciones operacionales en CLP |

`InstallationProfile` caracteriza cada instalación según su `segment` (campos derivados de las pantallas de selección de tipo de instalación de la maqueta), validando el `extra` (jsonb) contra el segmento.

## 5. Propuesta de valor

- **Lenguaje en CLP, no en kWh abstractos.** Todo se traduce a pesos: el usuario decide con dinero.
- **Tiempo real, no post-mortem.** Dashboard en vivo + alerta antes de que llegue la boleta.
- **Sin expertos.** Onboarding por QR, emparejamiento guiado, recomendaciones automáticas accionables.
- **Acción, no solo información.** Control remoto y programado de enchufes inteligentes compatibles, con límites de consumo.
- **Multi-tenant y multisede.** Un mismo operador gestiona varias instalaciones con RBAC, manteniendo aislamiento estricto por `organization_id`.

## 6. Módulos funcionales (mapeo a la maqueta)

La maqueta declara: Inicio, Reportes, Desglose, Control, Alertas y recomendaciones, Proyecciones, Control inteligente, Ajustes. Mapeo a módulos del canon (prefijos `FR-<MOD>-NNN`):

| Módulo maqueta | Módulo canon (`MOD`) | Entidades principales | Fase |
|---|---|---|---|
| Onboarding / registro / QR kit / tipo instalación / boleta | `AUTH`, `ONB`, `PROF`, `BILL` | User, Organization, Membership, Installation, InstallationProfile, EnergyKit, Device, DevicePairing, ElectricityBill | MVP |
| **Inicio** (dashboard tiempo real) | `DASH` | TelemetryReading, EnergyAggregate, Device | MVP |
| **Reportes** (históricos) | `REP` | EnergyAggregate, ElectricityBill, Tariff | MVP |
| **Desglose** (por dispositivo/categoría) | `BRK` | EnergyAggregate, Device, DeviceCategory | MVP |
| **Control** (remoto) | `CTRL` | ControlAction, Device | MVP (si hay enchufe compatible) |
| **Alertas y recomendaciones** | `ALRT`, `REC` | Alert, Recommendation | MVP (básico) |
| **Proyecciones** | `PROJ` | EnergyAggregate, ElectricityBill, Tariff | V1 (básica) / V2 (sofisticada) |
| **Control inteligente** (programado/autónomo) | `CTRL` | ControlSchedule, ConsumptionLimit, ControlAction | V1 (programado) / V2 (autónomo) |
| **Ajustes** | `SET`, `PROF` | User, Organization, Membership, InstallationProfile, Tariff, Distributor | MVP |

## 7. Supuestos críticos

Detalle completo y trazable en `specs/00-product/assumptions.md`. Resumen de los más críticos:

- La maqueta "App Smart Sense v1.pdf" **no está en el repo**; las pantallas se especifican desde el brief (SUP-001).
- `home` = `Organization` implícita de un usuario (SUP-002).
- El MVP usa **carga manual/asistida de boleta**; OCR es fase posterior (SUP-003).
- Cálculo de costos **centralizado en backend** (SUP-004).
- **Tarifas chilenas** (AT/BT, cargo fijo, energía, demanda) modeladas desde el inicio (SUP-005).
- Zona horaria `America/Santiago` (SUP-006); moneda **CLP entera** (SUP-007).

## 8. Riesgos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| RSK-01 | Telemetría inexacta o pérdida de paquetes MQTT | Costos/desglose erróneos → pérdida de confianza | Idempotencia por `event_hash`, distinción `source`/`received` timestamp, recálculo de agregados |
| RSK-02 | Heterogeneidad de enchufes/dispositivos del kit | Control y emparejamiento frágiles | `capabilities` (jsonb) y `DevicePairing` con estados explícitos; control solo si `capabilities.switch` |
| RSK-03 | Modelado tarifario chileno incorrecto (AT/BT, demanda) | Valoración en CLP errónea, riesgo reputacional | `Tariff`/`Distributor` desde inicio; boleta como base de verdad; no inventar CLP sin tarifa/boleta |
| RSK-04 | Fuga cross-tenant | Exposición de datos sensibles entre clientes | Invariante: scoping por `organization_id` en toda query; RBAC; auditoría |
| RSK-05 | Sobrepromesa de ahorro sin línea base | Reclamos / daño de marca | Comunicar "oportunidades de reducción típicas 10–25%", nunca % garantizado |
| RSK-06 | Control remoto sin auditoría/permiso adecuado | Acción no autorizada sobre equipo crítico | `ControlAction` siempre auditada; requiere rol `operator/admin/owner`; `critical_equipment` en perfil |
| RSK-07 | Onboarding complejo frena adopción (especialmente OIMSAE) | Baja conversión de pilotos | Onboarding por QR + emparejamiento guiado; instalación objetivo en horas |

## 9. Definición de MVP

El MVP entrega el ciclo completo **medir → valorar en CLP → alertar → recomendar → controlar (básico)** para los tres segmentos. Incluye **como mínimo**:

1. **Onboarding de usuario** — registro/login (JWT access+refresh), creación de `Organization` (implícita para `home`) y `Membership` `owner`.
2. **Registro de instalación** — alta de `Installation` con `segment`, `timezone` (default `America/Santiago`), distribuidora y tarifa; selección de tipo de instalación (`InstallationProfile` por segmento).
3. **Registro/emparejamiento de kit y dispositivos** — escaneo de QR (`EnergyKit.qr_code`), *claim* del kit, emparejamiento de enchufes/dispositivos (`DevicePairing`, `Device` con `capabilities`).
4. **Carga manual o asistida de boleta** — alta de `ElectricityBill` (`status: uploaded → confirmed`), ingreso manual de campos clave; sin OCR automático.
5. **Ingesta de mediciones energéticas** — pipeline MQTT → iot-bridge → API; `TelemetryReading` idempotente; agregados en `EnergyAggregate`.
6. **Dashboard de consumo actual** (módulo Inicio) — consumo en vivo vía WebSocket, valorado en CLP.
7. **Reportes históricos** (módulo Reportes) — series por `granularity` (`hour|day|week|month`) desde `EnergyAggregate`.
8. **Desglose por dispositivo/categoría** (módulo Desglose) — atribución de consumo y costo por `Device`/`DeviceCategory`.
9. **Alertas básicas** (módulo Alertas) — `Alert` de tipo `anomaly|high_device|over_budget|offline` con severidad y estado.
10. **Recomendaciones de ahorro** — `Recommendation` con `estimated_saving_clp` cuando exista base tarifaria; sin inventar CLP si falta tarifa/boleta.
11. **Control básico de dispositivos** — `ControlAction` (`turn_on|turn_off|set_limit`) **solo cuando exista enchufe inteligente compatible** (`capabilities.switch`), con permiso y auditoría.

**Explícitamente FUERA del MVP** (ver `out-of-scope.md`): NILM avanzado por desagregación de señal, predicción ML sofisticada, control autónomo completo (sin humano en el loop) y Energy Mesh / benchmark sectorial. Todos son fases futuras.

## 10. Definición post-MVP (V1 / V2)

### V1 — Profundización operacional
- **Proyecciones básicas** de factura del período en curso (módulo Proyecciones) a partir de agregados y tarifa/boleta.
- **Control inteligente programado**: `ControlSchedule` (horarios on/off) y `ConsumptionLimit` (límites por device con pre-alerta y `action_on_exceed: alert|turn_off`).
- **Multisede y RBAC ampliado** para `business` (varias `Installation` por `Organization`, roles `admin`/`viewer`).
- **Carga de boleta asistida por OCR** (extracción a `raw_extraction`, revisión humana → `confirmed`).
- **Notificaciones multicanal** (`in_app|email|push`).
- **Alertas de cargo por demanda/potencia** para AT (`peak_power_w`, demanda máxima del período).

### V2 — Inteligencia y autonomía (innovación radical)
- **NILM avanzado**: desagregación de consumo por señal sin medición dedicada por dispositivo.
- **Predicción sofisticada (ML)**: pronóstico de factura, detección predictiva de picos y alerta pre-factura de alta precisión.
- **Control autónomo completo** ("Energy Autopilot"): el sistema ejecuta acciones operacionales sin intervención humana, dentro de reglas y límites configurados.
- **Energy Mesh Network**: red anónima de benchmark sectorial por rubro/zona/tarifa, señales de oportunidad y negociación colectiva (entrada vía gremios).
- **Score Energético** comparativo sectorial.
