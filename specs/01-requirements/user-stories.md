# Historias de Usuario — SmartSense

> Deriva de `functional-requirements.md`. Formato: "Como <rol> quiero <objetivo> para <beneficio>".
> Roles (enum `membership_role`): **owner**, **admin**, **operator**, **viewer**. Rol externo: **instalador IoT** (técnico de terreno).
> Cada historia referencia el/los FR que la cubren.

## Convención de roles

- **owner**: dueño del tenant; control total, plan SaaS, no se puede eliminar el último.
- **admin**: administra usuarios, instalación, dispositivos, tarifa; no gestiona plan.
- **operator**: opera (control, boletas, programación, límites); no administra usuarios ni perfil.
- **viewer**: solo lectura (dashboard, reportes, desglose, alertas).
- **instalador IoT**: provisión técnica del kit en terreno; sin acceso a datos energéticos del tenant.

---

## A. Autenticación y usuarios (AUTH)

- **US-AUTH-01** — Como **visitante** quiero registrarme con mi email y contraseña para crear mi cuenta y empezar a monitorear mi energía. → FR-AUTH-001
- **US-AUTH-02** — Como **usuario registrado** quiero iniciar sesión de forma segura para acceder a mis instalaciones. → FR-AUTH-002
- **US-AUTH-03** — Como **usuario** quiero que mi sesión se renueve sin volver a loguearme para una experiencia fluida. → FR-AUTH-003
- **US-AUTH-04** — Como **usuario** quiero cerrar sesión para proteger mi cuenta en dispositivos compartidos. → FR-AUTH-004
- **US-AUTH-05** — Como **usuario** quiero recuperar mi contraseña por email para volver a entrar si la olvido. → FR-AUTH-005
- **US-AUTH-06** — Como **usuario** quiero cambiar mi contraseña estando autenticado para mantener mi cuenta segura. → FR-AUTH-010
- **US-AUTH-07** — Como **owner/admin** quiero asignar roles a los miembros para controlar qué puede hacer cada uno. → FR-AUTH-006
- **US-AUTH-08** — Como **owner/admin** quiero invitar usuarios a mi organización para que colaboren en la gestión energética. → FR-AUTH-007
- **US-AUTH-09** — Como **owner/admin** quiero revocar el acceso de un usuario para quitar permisos cuando deja el equipo. → FR-AUTH-008
- **US-AUTH-10** — Como **sistema/owner** quiero que cada acción valide el rol del actor para que nadie haga lo que no le corresponde. → FR-AUTH-009

## B. Onboarding (ONB)

- **US-ONB-01** — Como **owner/admin** quiero escanear el QR de mi kit para identificarlo rápidamente. → FR-ONB-001
- **US-ONB-02** — Como **owner/admin** quiero reclamar (claim) el kit a mi instalación para activarlo en mi cuenta. → FR-ONB-002
- **US-ONB-03** — Como **owner/admin** quiero ver cómo el kit detecta dispositivos (scanning) para saber que está funcionando. → FR-ONB-003
- **US-ONB-04** — Como **owner/admin** quiero entender los estados de emparejamiento (paired/recommended/scanning) para decidir qué dispositivos vincular. → FR-ONB-004
- **US-ONB-05** — Como **owner/admin** quiero confirmar y nombrar mis dispositivos emparejados para identificarlos en el dashboard. → FR-ONB-005
- **US-ONB-06** — Como **owner/admin** quiero seleccionar el tipo de instalación (home/smb/business) para que la plataforma se adapte a mi caso. → FR-ONB-006
- **US-ONB-07** — Como **owner/admin** quiero retomar el onboarding donde lo dejé para no repetir pasos. → FR-ONB-007
- **US-ONB-08** — Como **owner/admin** quiero crear mi instalación (sitio) para asociar el kit a un lugar físico. → FR-ONB-008
- **US-ONB-09** — Como **owner/admin** quiero transferir un kit a otra instalación para reubicarlo sin perder histórico. → FR-ONB-009
- **US-ONB-10** — Como **instalador IoT** quiero dejar el kit emparejado y listo para claim sin ver datos del cliente para completar mi trabajo de terreno respetando su privacidad. → FR-ONB-010

## C. Perfil de instalación (PROF)

- **US-PROF-01** — Como **owner/admin** quiero registrar los datos base de mi instalación para contextualizar el análisis de consumo. → FR-PROF-001
- **US-PROF-02** — Como **owner/admin (home)** quiero indicar nº de personas y sistema de calefacción para recibir análisis acorde a mi hogar. → FR-PROF-002
- **US-PROF-03** — Como **owner/admin (smb)** quiero registrar el horario comercial y equipos del local para detectar consumos fuera de horario. → FR-PROF-003
- **US-PROF-04** — Como **owner/admin (business)** quiero declarar potencia y turnos de la planta para vigilar la demanda y el sobreconsumo. → FR-PROF-004
- **US-PROF-05** — Como **owner/admin** quiero marcar equipos críticos para que no se apaguen automáticamente. → FR-PROF-005
- **US-PROF-06** — Como **owner/admin** quiero definir horarios de operación para que las alertas consideren mi rutina. → FR-PROF-006
- **US-PROF-07** — Como **owner/admin** quiero declarar la potencia contratada para que el sistema avise si me acerco al límite. → FR-PROF-007

## D. Boleta eléctrica (BILL)

- **US-BILL-01** — Como **operator/admin/owner** quiero cargar la imagen/PDF de mi boleta para tenerla en la plataforma. → FR-BILL-001
- **US-BILL-02** — Como **operator/admin/owner** quiero ingresar los datos de la boleta para que el sistema calcule costos. → FR-BILL-002
- **US-BILL-03** — Como **operator/admin/owner** quiero registrar mi distribuidora y nº de cliente para identificar mi suministro. → FR-BILL-003
- **US-BILL-04** — Como **operator/admin/owner** quiero asociar la tarifa para que los costos en CLP sean correctos. → FR-BILL-004
- **US-BILL-05** — Como **operator/admin/owner** quiero registrar el periodo y consumo en kWh para comparar con mi medición real. → FR-BILL-005
- **US-BILL-06** — Como **operator/admin/owner** quiero registrar montos, cargos y vencimiento para llevar control de mi gasto y no atrasarme en el pago. → FR-BILL-006
- **US-BILL-07** — Como **operator/admin/owner** quiero confirmar la boleta para usarla como base de comparación y proyección. → FR-BILL-007
- **US-BILL-08** — Como **operator/admin/owner** quiero que el sistema pre-rellene los datos desde el archivo (OCR) para ahorrar tiempo. → FR-BILL-008

## E. Dashboard (DASH)

- **US-DASH-01** — Como **viewer+** quiero ver mi consumo instantáneo en W/kW para saber cuánta energía uso ahora. → FR-DASH-001
- **US-DASH-02** — Como **viewer+** quiero ver el consumo del día en kWh para controlar mi uso diario. → FR-DASH-002
- **US-DASH-03** — Como **viewer+** quiero ver el costo estimado del día en CLP para dimensionar mi gasto. → FR-DASH-003
- **US-DASH-04** — Como **viewer+** quiero comparar con el periodo anterior para saber si estoy gastando más o menos. → FR-DASH-004
- **US-DASH-05** — Como **viewer+** quiero ver el estado del kit y dispositivos para saber si todo está conectado. → FR-DASH-005
- **US-DASH-06** — Como **viewer+** quiero ver mis alertas pendientes en el dashboard para atender lo importante primero. → FR-DASH-006
- **US-DASH-07** — Como **viewer+** quiero que el dashboard funcione aunque aún no tenga datos para no encontrarme con una pantalla rota al empezar. → FR-DASH-007

## F. Reportes (REP)

- **US-REP-01** — Como **viewer+** quiero ver el reporte por día para entender mi consumo diario. → FR-REP-001
- **US-REP-02** — Como **viewer+** quiero ver el reporte por semana para ver tendencias semanales. → FR-REP-002
- **US-REP-03** — Como **viewer+** quiero ver el reporte por mes para evaluar mi consumo mensual. → FR-REP-003
- **US-REP-04** — Como **viewer+** quiero ver los últimos 3 meses para identificar tendencias de mediano plazo. → FR-REP-004
- **US-REP-05** — Como **viewer+** quiero elegir un rango personalizado para analizar un periodo específico. → FR-REP-005
- **US-REP-06** — Como **viewer+** quiero exportar el reporte a CSV para analizarlo fuera de la plataforma. → FR-REP-006

## G. Desglose (BRK)

- **US-BRK-01** — Como **viewer+** quiero ver el consumo por dispositivo para saber qué gasta más. → FR-BRK-001
- **US-BRK-02** — Como **viewer+** quiero ver el consumo por categoría para entender en qué se va mi energía. → FR-BRK-002
- **US-BRK-03** — Como **viewer+** quiero ver la proporción porcentual para visualizar el peso de cada consumo. → FR-BRK-003
- **US-BRK-04** — Como **viewer+** quiero ver el ranking de consumo para priorizar dónde ahorrar. → FR-BRK-004
- **US-BRK-05** — Como **viewer+** quiero ver el total por periodo para tener el panorama completo. → FR-BRK-005
- **US-BRK-06** — Como **viewer+** quiero ver el detalle de un dispositivo para investigar su comportamiento. → FR-BRK-006

## H. Control (CTRL)

- **US-CTRL-01** — Como **operator/admin/owner** quiero encender un dispositivo de forma remota para gestionarlo sin estar presente. → FR-CTRL-001
- **US-CTRL-02** — Como **operator/admin/owner** quiero apagar un dispositivo de forma remota para reducir consumo innecesario. → FR-CTRL-002
- **US-CTRL-03** — Como **viewer+** quiero ver el estado de control de un dispositivo para saber si está encendido o apagado. → FR-CTRL-003
- **US-CTRL-04** — Como **operator/admin/owner** quiero programar horarios de encendido/apagado para automatizar mi consumo. → FR-CTRL-004
- **US-CTRL-05** — Como **operator/admin/owner** quiero definir un límite de consumo para no excederme. → FR-CTRL-005
- **US-CTRL-06** — Como **operator/admin/owner** quiero recibir una pre-alerta antes de alcanzar el límite para reaccionar a tiempo. → FR-CTRL-006
- **US-CTRL-07** — Como **admin/owner** quiero ver el registro de acciones de control para auditar quién hizo qué. → FR-CTRL-007
- **US-CTRL-08** — Como **operator/admin/owner** quiero saber si mi acción de control se ejecutó (éxito/fallo) para confiar en el sistema. → FR-CTRL-008
- **US-CTRL-09** — Como **viewer** quiero que se me impida ejecutar control (y quede registrado) para respetar mis permisos de solo lectura. → FR-CTRL-009

## I. Alertas (ALRT)

- **US-ALRT-01** — Como **viewer+** quiero recibir alertas por consumo anómalo para detectar problemas a tiempo. → FR-ALRT-001
- **US-ALRT-02** — Como **viewer+** quiero alertas cuando un dispositivo consume de más para identificar el equipo problemático. → FR-ALRT-002
- **US-ALRT-03** — Como **viewer+** quiero alertas de sobreconsumo respecto a mi presupuesto para no llevarme sorpresas en la boleta. → FR-ALRT-003
- **US-ALRT-04** — Como **viewer+** quiero saber si un dispositivo se desconectó para revisarlo. → FR-ALRT-004
- **US-ALRT-05** — Como **operator/admin/owner** quiero marcar alertas como revisadas/descartadas para gestionar mi bandeja. → FR-ALRT-005
- **US-ALRT-06** — Como **viewer+** quiero que las alertas se prioricen por severidad para atender primero lo crítico. → FR-ALRT-006

## J. Recomendaciones (REC)

- **US-REC-01** — Como **viewer+** quiero recibir recomendaciones a partir de mis alertas para saber cómo actuar. → FR-REC-001
- **US-REC-02** — Como **viewer+** quiero recomendaciones de ahorro de un análisis periódico para mejorar continuamente. → FR-REC-002
- **US-REC-03** — Como **viewer+** quiero ver el ahorro estimado en CLP de cada recomendación para priorizar las más rentables. → FR-REC-003
- **US-REC-04** — Como **operator/admin/owner** quiero marcar una recomendación como aplicada o descartada para gestionarlas. → FR-REC-004
- **US-REC-05** — Como **viewer+** quiero que las recomendaciones se prioricen por impacto para enfocarme en lo que más ahorra. → FR-REC-005

## K. Proyecciones (PROJ)

- **US-PROJ-01** — Como **viewer+** quiero ver el consumo proyectado del mes para anticipar mi uso. → FR-PROJ-001
- **US-PROJ-02** — Como **viewer+** quiero ver el costo proyectado en CLP para planificar mi gasto. → FR-PROJ-002
- **US-PROJ-03** — Como **viewer+** quiero comparar la proyección con mi boleta anterior para saber si voy mejor o peor. → FR-PROJ-003
- **US-PROJ-04** — Como **viewer+** quiero conocer mi riesgo de sobreconsumo para tomar medidas a tiempo. → FR-PROJ-004
- **US-PROJ-05** — Como **viewer+** quiero ver la proyección por dispositivo/categoría para saber qué impulsará mi gasto. → FR-PROJ-005

## L. Ajustes (SET)

- **US-SET-01** — Como **usuario** quiero editar mi perfil (nombre, teléfono, idioma) para mantener mis datos al día. → FR-SET-001
- **US-SET-02** — Como **admin/owner** quiero editar los datos de la instalación para mantenerlos correctos. → FR-SET-002
- **US-SET-03** — Como **admin/owner** quiero gestionar mis dispositivos y kits (renombrar, categorizar, retirar) para mantener el inventario ordenado. → FR-SET-003
- **US-SET-04** — Como **admin/owner** quiero configurar tarifa y distribuidora para que los costos sean exactos. → FR-SET-004
- **US-SET-05** — Como **usuario** quiero configurar mis notificaciones (in-app/email/push) para recibir solo lo que me importa. → FR-SET-005
- **US-SET-06** — Como **usuario** quiero gestionar mi seguridad (contraseña, sesiones) para proteger mi cuenta. → FR-SET-006
- **US-SET-07** — Como **admin/owner** quiero acceder a la gestión de usuarios y roles desde Ajustes para administrar mi equipo. → FR-SET-007
- **US-SET-08** — Como **owner** quiero gestionar el plan SaaS de mi organización para ajustar mi suscripción. → FR-SET-008

---

## Resumen

**Total historias: 87**, una por FR, agrupadas por los 12 módulos. Cobertura de roles: owner, admin, operator, viewer e instalador IoT. Trazabilidad directa US → FR → entidad/pantalla (ver `functional-requirements.md`).
