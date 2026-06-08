# Glosario — SmartSense

> Términos del dominio energético chileno y del producto. Consistente con `specs/_canon.md` (entidades, enums, convenciones). Definiciones de 1–3 líneas.

## Energía y potencia

- **kWh (kilowatt-hora)** — Unidad de energía consumida: 1 kW sostenido durante 1 hora. Es la base de cobro del componente de energía en la boleta. En el canon se almacena como `kwh` (`numeric(14,4)`) o `wh` entero.
- **Wh (watt-hora)** — Subunidad de energía (1 kWh = 1.000 Wh). La telemetría reporta `energy_wh_delta` por lectura.
- **kW (kilowatt)** — Unidad de potencia: tasa instantánea de consumo. La potencia se modela como `w` (`numeric(12,2)`); `active_power_w` en la telemetría.
- **Demanda máxima** — Mayor potencia (kW) registrada en un intervalo de medición dentro del período de facturación. Determina el cargo por demanda en tarifas AT.
- **Cargo por demanda / cargo por potencia** — Componente de la factura proporcional a la demanda máxima o potencia contratada (CLP/kW), independiente de la energía consumida. Puede ser 20–40% de una factura AT.
- **Factor de potencia** — Razón entre potencia activa (W) y aparente (VA); un valor bajo penaliza la factura. Reportado como `power_factor` en la telemetría.
- **Potencia activa** — Potencia real que produce trabajo útil, medida en W. Es la base del consumo facturable de energía.
- **Voltaje (V) / Corriente (A)** — Magnitudes eléctricas instantáneas reportadas por la telemetría (`voltage_v`, `current_a`) para diagnóstico y cálculo de potencia.

## Tarifas y facturación eléctrica (Chile)

- **Tarifa BT (Baja Tensión)** — Tarifa para suministros conectados en baja tensión (típicamente hogares y PyMEs). Modelada en `Tariff` con `segment`.
- **Tarifa AT (Alta Tensión)** — Tarifa para suministros en alta tensión (clientes mayores/industriales); suele incluir cargo por demanda/potencia. Relevante para el segmento `business`.
- **Cargo fijo** — Monto mensual constante de la boleta, independiente del consumo (`fixed_charge_clp`).
- **Cargo variable / por energía** — Componente proporcional a los kWh consumidos (`energy_price_clp_kwh` × consumo). Campo `variable_charge_clp` en la boleta.
- **Distribuidora** — Empresa que distribuye electricidad y emite la boleta (Enel, CGE, Frontel, etc.). Entidad `Distributor`.
- **Boleta / factura eléctrica** — Documento mensual de cobro. Entidad `ElectricityBill`; base de tarifa y comparación. Estados `uploaded|parsed|confirmed`.
- **Número de cliente** — Identificador del suministro ante la distribuidora (`client_number` en la boleta).
- **Ley 21.305** — Ley chilena de Eficiencia Energética que obliga a Consumidores con Capacidad de Gestión de Energía (CCGE) sobre cierto umbral; promueve trazabilidad de gestión energética (no obliga aún a medianos).
- **CNE** — Comisión Nacional de Energía; fija y regula la estructura tarifaria chilena.

## IoT y telemetría

- **Kit / Kit energético** — Conjunto de hardware IoT identificado por un código QR único, que agrupa los dispositivos de una instalación. Entidad `EnergyKit`; estados `unclaimed|active|transferring|retired`.
- **QR del kit** — Código impreso en el kit (`qr_code`, único) que se escanea en el onboarding para *claim* del kit a una instalación.
- **Claim (reclamar kit)** — Acción de asociar un kit `unclaimed` a una `Installation` de la organización, dejándolo `active`.
- **Enchufe inteligente** — Dispositivo que mide consumo y permite conmutar carga (on/off). En `Device.capabilities` se expresa como `{meter, switch}`. El control básico requiere `capabilities.switch`.
- **Sensor / medidor de circuito** — Dispositivo de medición sin capacidad de conmutación (`capabilities.meter` sin `switch`).
- **Dispositivo (Device)** — Unidad física dentro de un kit: enchufe, sensor o medidor. Estados `online|offline|unknown`.
- **Emparejamiento (pairing)** — Proceso de descubrir y asociar dispositivos al kit. Entidad `DevicePairing`; estados `paired|recommended|scanning|unpaired|error`.
- **Telemetría** — Flujo de lecturas energéticas instantáneas emitidas por los dispositivos. Entidad `TelemetryReading` (hypertable Timescale).
- **MQTT** — Protocolo de mensajería pub/sub usado por el IoT; broker EMQX → iot-bridge → API.
- **iot-bridge** — Servicio (`apps/iot-bridge`) que traduce mensajes MQTT a ingesta de telemetría en la API.
- **source_timestamp vs received_timestamp** — Momento en que el dispositivo generó la lectura vs momento en que la API la recibió; se distinguen para manejar latencia y desorden.
- **event_hash** — Hash único por lectura que garantiza idempotencia: lecturas duplicadas se rechazan (`ingestion_status: duplicate`).
- **Ingestion status** — Resultado de procesar una lectura: `accepted|duplicate|invalid`.

## Agregación, costos y análisis

- **Agregado energético (EnergyAggregate)** — Consumo y costo precalculados por instalación (y opcionalmente device/categoría) en buckets de `hour|day|week|month`; base de reportes y desglose.
- **Granularidad de agregado** — Ventana temporal del agregado: `hour|day|week|month` (`aggregate_granularity`).
- **Desglose (breakdown)** — Atribución del consumo/costo total entre dispositivos y categorías. Módulo `BRK` de la maqueta (Desglose).
- **Categoría de dispositivo (DeviceCategory)** — Catálogo global de tipos para desglose (refrigeración, climatización, iluminación, etc.).
- **NILM (Non-Intrusive Load Monitoring)** — Técnica de desagregación que estima el consumo por dispositivo a partir de la señal agregada, sin medidor por aparato. Fase V2 (fuera de MVP).
- **Proyección** — Estimación de la factura del período en curso a partir de agregados y tarifa/boleta. Módulo Proyecciones (V1 básica, V2 sofisticada).

## Producto, control y seguridad

- **OIMSAE** — Operador Industrial Mediano Sin Área Energética: empresa 20–500 empleados, factura $3M–$40M CLP/mes, sin energy manager. Segmento estratégico `business`.
- **Segmento de instalación** — Clasificación de la instalación: `home|smb|business` (`installation_segment`).
- **Organization (tenant)** — Raíz multi-tenant que agrupa instalaciones, usuarios y facturación SaaS. En `home` es implícita y de un usuario.
- **Installation** — Sitio físico monitoreado (hogar, local, planta). Una organización puede tener varias (multisede en `business`).
- **InstallationProfile** — Caracterización de la instalación según su segmento (ocupantes, equipos críticos, potencia declarada, horarios), con `extra` (jsonb) por segmento.
- **Membership / RBAC** — Vínculo User↔Organization con rol `owner|admin|operator|viewer`; gobierna permisos multi-tenant.
- **Control action** — Acción puntual sobre un dispositivo: `turn_on|turn_off|set_limit` (`control_action_type`); estado `pending|success|failed|rejected`. Siempre auditada.
- **Control schedule** — Programación horaria de on/off de un dispositivo (`ControlSchedule`). Módulo Control inteligente (V1).
- **Consumption limit** — Límite de consumo por dispositivo con pre-alerta y acción al exceder (`alert|turn_off`).
- **Alerta (Alert)** — Aviso por consumo anómalo, dispositivo elevado, sobreconsumo o dispositivo offline. Tipos `anomaly|high_device|over_budget|offline`; severidad `info|warning|critical`.
- **Recomendación (Recommendation)** — Sugerencia de ahorro con impacto estimado en CLP (`estimated_saving_clp`); origen `alert|periodic_analysis`. No inventa CLP sin base tarifaria.
- **Alerta pre-factura** — Aviso anticipado de que el gasto del período tiende a superar un umbral, antes de que llegue la boleta. Visión de producto (predictiva en V2).
- **Energy Autopilot** — Visión de control autónomo: el sistema ejecuta acciones operacionales sin intervención humana. Fase V2.
- **Energy Mesh Network** — Red anónima de benchmark energético sectorial por rubro/zona/tarifa. Fase V2 (fuera de alcance MVP).
- **Score Energético** — Indicador comparativo de desempeño energético frente al sector. Fase V2.
- **AuditLog** — Bitácora append-only de acciones sensibles (control, cambio de rol, claim de kit).
- **CLP** — Peso chileno; moneda del producto, modelada como entero (sin decimales) salvo tarifas (`numeric(12,4)`).
- **Tenant scoping** — Invariante de seguridad: toda query se filtra por `organization_id`; no se exponen datos cross-tenant.
