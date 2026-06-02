# Fuera de Alcance — SmartSense

> Qué queda explícitamente **fuera de alcance**, del MVP y/o del producto en su estado actual. Consistente con `specs/_canon.md` (prioridades `MVP · V1 · V2`) y con la visión de producto. Cada ítem indica razón y posible fase futura.
>
> El propósito de este documento es evitar *scope creep*: si algo aquí debe entrar, primero se justifica y se registra el cambio en `assumptions.md`.

## 1. Fuera del MVP (planificado para fases futuras)

| ID | Ítem | Razón | Fase futura |
|---|---|---|---|
| OOS-01 | **NILM avanzado por desagregación de señal** | Estimar consumo por dispositivo desde la señal agregada requiere modelos de alta precisión y datos de entrenamiento; alto riesgo de imprecisión y reclamos. El MVP atribuye consumo por medición directa (`Device`/`DeviceCategory`). | V2 |
| OOS-02 | **Predicción ML sofisticada de factura/picos** | Modelos predictivos robustos exigen historial y validación; el MVP no proyecta y V1 hace proyección básica determinística (agregados + tarifa). | V1 (proyección básica) / V2 (predicción ML, alerta pre-factura) |
| OOS-03 | **Control autónomo completo (sin humano en el loop)** | "Energy Autopilot" ejecutando acciones sin confirmación implica riesgo operacional sobre equipos críticos. El MVP solo hace control manual (`ControlAction`) auditado; V1 añade programación (`ControlSchedule`) con reglas explícitas. | V2 |
| OOS-04 | **Energy Mesh / benchmark sectorial** | Red anónima de comparación por rubro/zona/tarifa requiere masa crítica de clientes (50+) y acuerdos con gremios; depende de privacidad/anonimización avanzada. No aporta al MVP de un solo cliente. | V2 (Fase 3 de la estrategia) |
| OOS-05 | **Score Energético comparativo sectorial** | Depende del Energy Mesh (OOS-04); sin red de pares no hay base de comparación. | V2 |
| OOS-06 | **Carga de boleta por OCR / extracción automática** | El MVP usa carga manual/asistida (SUP-003). OCR sube alcance y costo; el campo `ElectricityBill.raw_extraction` queda reservado. | V1 |
| OOS-07 | **Notificaciones email/push** | El MVP entrega alertas `in_app`. Email/push exigen proveedor y consentimiento; el canal está modelado (`notification_channel`) pero no implementado en MVP. | V1 |
| OOS-08 | **App móvil nativa (Android/iOS)** | El MVP es web Next.js responsive (cubre uso móvil). Una app nativa duplica esfuerzo y mantención. (SUP-015) | Post-MVP, según demanda |
| OOS-09 | **Multisede y RBAC ampliado completo** | El MVP soporta el modelo multi-tenant base (`Organization`/`Membership`), pero la gestión avanzada multisede y roles `admin`/`viewer` ricos para `business` se profundiza después. | V1 |

## 2. Fuera del producto (no planificado salvo justificación posterior)

| ID | Ítem | Razón | Posible fase futura |
|---|---|---|---|
| OOS-10 | **Facturación SaaS / cobros / pasarela de pagos** | `Organization.plan` es informativo en MVP (SUP-014). Integrar billing, impuestos y conciliación es un dominio completo aparte. | Cuando se monetice formalmente; requiere decisión de negocio |
| OOS-11 | **Integración con generación solar / baterías / autoconsumo** | SmartSense mide y gestiona consumo, no generación. Net billing, inversores y BESS son otro dominio (medición bidireccional, normativa de net billing). | Solo si se justifica con demanda real; requiere extender modelo de telemetría y tarifas |
| OOS-12 | **Negociación colectiva / monetización de datos sectoriales** | Depende del Energy Mesh (OOS-04) y de marcos legales de uso de datos; modelo de negocio B2B2B aún no validado. | V2+ (Fase 4 de la estrategia) |
| OOS-13 | **Integración con BMS/EMS/SCADA industriales existentes** | SmartSense se posiciona como alternativa simple a esas soluciones para OIMSAE; integrarlas contradice la propuesta de "sin expertos" y añade complejidad. | Evaluación caso a caso post-PMF |
| OOS-14 | **Cumplimiento certificado de Ley 21.305 (CCGE)** | La ley obliga a grandes consumidores; los medianos no están obligados aún. SmartSense **apoya la trazabilidad**, no certifica cumplimiento. | Si el marco regulatorio amplía el universo obligado |
| OOS-15 | **Garantía de % de ahorro** | Sin línea base verificable no se puede prometer un porcentaje (riesgo reputacional, RSK-05). Se comunican "oportunidades de reducción típicas 10–25%". | No aplica; postura permanente de honestidad técnica |
| OOS-16 | **Soporte multi-país / multimoneda** | El producto es Chile-first: CLP, tarifas chilenas, `America/Santiago`, distribuidoras locales (SUP-005/006/007). | Si hay expansión regional; requiere abstraer tarifas y moneda |
