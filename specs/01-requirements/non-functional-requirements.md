# Requerimientos No Funcionales — SmartSense

> Deriva de `specs/_canon.md`, `specs/02-domain/domain-model.md` y `specs/03-data-model/relational-model.md`.
> Convención de IDs: `NFR-NNN`. Stack canónico: Node.js + Fastify + TS, PostgreSQL 16 + TimescaleDB, MQTT (EMQX) → iot-bridge, Next.js, JWT + RBAC multi-tenant.
> Objetivos numéricos como metas de diseño (SLO) revisables en `08-quality`.

## Índice

| Categoría | NFR |
|---|---|
| Seguridad | NFR-001..009 |
| Privacidad y datos personales | NFR-010..012 |
| Trazabilidad y auditoría | NFR-013..015 |
| Disponibilidad y resiliencia | NFR-016..019 |
| Rendimiento y latencia | NFR-020..024 |
| Escalabilidad | NFR-025..027 |
| Integridad de datos IoT | NFR-028..032 |
| Retención de datos | NFR-033..035 |
| Observabilidad | NFR-036..038 |
| Mantenibilidad | NFR-039..041 |
| Internacionalización | NFR-042..043 |
| Compatibilidad (móvil/desktop) | NFR-044..045 |

---

## Seguridad

### NFR-001 — Aislamiento multi-tenant (no cross-tenant)
**Requisito:** Ninguna respuesta de la API debe exponer datos de una `organization_id` distinta a la del actor. Toda query con datos de tenant aplica scoping por `organization_id` (directo o derivable por FK).
**Objetivo medible:** 0 fugas cross-tenant. Test de regresión: para cada endpoint con datos de tenant, un actor de la org A recibe 403/404 (nunca 200 con datos) al solicitar recursos de la org B.
**Verificación:** suite de pruebas de autorización por endpoint + revisión de cada query Prisma (filtro de tenant obligatorio).

### NFR-002 — Autenticación robusta
**Requisito:** JWT access (corta vida, p. ej. ≤15 min) + refresh con rotación y revocación. Contraseñas con Argon2id.
**Objetivo:** access token TTL ≤ 15 min; refresh revocable y rotado en cada uso; ningún secreto en el frontend.
**Verificación:** inspección de tokens; prueba de que un refresh revocado no renueva.

### NFR-003 — Autorización RBAC efectiva
**Requisito:** Cada acción valida el rol (`owner|admin|operator|viewer`) según la matriz de FR-AUTH-009. El control remoto requiere `operator|admin|owner`.
**Objetivo:** 100% de endpoints mutadores protegidos por chequeo de rol; acción sin permiso → 403 sin mutar estado.
**Verificación:** pruebas por rol; un `viewer` no puede ejecutar control (HTTP 403, sin comando MQTT emitido).

### NFR-004 — Protección contra fuerza bruta y abuso
**Requisito:** Rate limiting y throttling en login, recuperación de contraseña, escaneo QR y endpoints de control.
**Objetivo:** login ≤ 5 intentos fallidos / 5 min por cuenta+IP antes de backoff; respuestas de recuperación siempre genéricas (anti-enumeración).
**Verificación:** prueba de carga de intentos fallidos → bloqueo temporal.

### NFR-005 — Cifrado en tránsito y en reposo
**Requisito:** TLS 1.2+ en todo el tráfico (API, WebSocket, MQTT sobre TLS). Cifrado en reposo de la base de datos y del almacenamiento de archivos de boleta.
**Objetivo:** 0 endpoints en texto plano; archivos de boleta accesibles solo mediante URLs firmadas de vida corta y scoped al tenant.
**Verificación:** escaneo TLS; prueba de que `file_url` no es accesible sin autorización del tenant.

### NFR-006 — Gestión de secretos
**Requisito:** Secretos (claves JWT, credenciales MQTT/DB, API keys) en variables de entorno / gestor de secretos; nunca en frontend ni en el repositorio.
**Objetivo:** 0 secretos hardcodeados (verificado por SAST/secret-scan en CI).
**Verificación:** secret scanning en pipeline.

### NFR-007 — Validación de entrada en el perímetro
**Requisito:** Validación de esquema (tipos/rangos) en todos los inputs de API y de telemetría; rechazo de payloads malformados.
**Objetivo:** 100% de endpoints con validación de esquema; inputs inválidos → 400 sin efectos colaterales.
**Verificación:** pruebas de fuzzing/contract testing.

### NFR-008 — Seguridad del canal IoT
**Requisito:** Cada device/kit se autentica ante el broker MQTT; la telemetría solo se acepta para un `device_id` válido asociado a un kit/instalación (invariante de canon).
**Objetivo:** 100% de telemetría con `device_id` resoluble a kit activo; telemetría de device desconocido/retirado → `ingestion_status='invalid'` y descarte.
**Verificación:** prueba de ingestión con device inexistente → rechazada y registrada.

### NFR-009 — Cabeceras y endurecimiento web
**Requisito:** Frontend con CSP, HSTS, anti-clickjacking; cookies/refresh con flags seguros (HttpOnly/Secure/SameSite cuando aplique).
**Objetivo:** calificación A en escáner de cabeceras de seguridad.
**Verificación:** auditoría de cabeceras en CI/CD.

---

## Privacidad y datos personales

### NFR-010 — Minimización y propósito
**Requisito:** Se recolectan solo los datos necesarios (perfil de instalación, boleta, telemetría energética). No se recolecta PII innecesaria.
**Objetivo:** inventario de datos personales documentado; cada campo PII con propósito declarado.
**Verificación:** revisión del data dictionary.

### NFR-011 — Derechos del titular y borrado
**Requisito:** Soporte a exportación y eliminación de datos personales del usuario; soft delete en `organizations`, `installations`, `energy_kits`, `devices`; telemetría histórica anonimizable.
**Objetivo:** solicitud de borrado procesable; PII eliminada/anonimizada conservando integridad referencial de series temporales.
**Verificación:** prueba de flujo de borrado.

### NFR-012 — Confidencialidad de datos de diagnóstico/energía
**Requisito:** Los datos de consumo y perfil son confidenciales del tenant; nunca visibles para otros tenants ni para el instalador IoT.
**Objetivo:** el instalador IoT no accede a datos energéticos del tenant (solo provisión técnica del kit).
**Verificación:** prueba de acceso del rol instalador → sin lecturas energéticas.

---

## Trazabilidad y auditoría

### NFR-013 — Auditoría de acciones sensibles
**Requisito:** Toda `control_action`, cambio de rol, invitación/revocación, claim/transferencia de kit y cambio de plan/tarifa queda en `audit_logs` (append-only).
**Objetivo:** 100% de acciones sensibles auditadas con actor, entidad, `before/after`, `ip`, timestamp.
**Verificación:** por cada acción sensible existe exactamente un registro de auditoría.

### NFR-014 — Inmutabilidad del log de auditoría
**Requisito:** `audit_logs` es append-only: sin UPDATE ni DELETE (trigger de protección).
**Objetivo:** 0 mutaciones/eliminaciones posibles sobre auditoría.
**Verificación:** intento de UPDATE/DELETE → bloqueado por trigger.

### NFR-015 — Trazabilidad de eventos de dominio
**Requisito:** Los eventos de dominio (`*.registered`, `kit.claimed`, `telemetry.ingested`, `control.resolved`, etc.) son rastreables con correlación (request id / event id).
**Objetivo:** todo flujo crítico reconstruible a partir de logs/eventos correlacionados.
**Verificación:** trazado end-to-end de un caso (onboarding, control).

---

## Disponibilidad y resiliencia

### NFR-016 — Disponibilidad del servicio
**Requisito:** API y dashboard con alta disponibilidad.
**Objetivo:** disponibilidad mensual ≥ 99.5% (MVP) → ≥ 99.9% (V1) para API y web.
**Verificación:** monitoreo de uptime; reporte mensual de SLO.

### NFR-017 — Resiliencia ante pérdida de conexión IoT
**Requisito:** El sistema tolera la desconexión del kit/broker: la UI sigue operativa con datos previos; al reconectar, la telemetría en buffer se ingiere sin pérdida ni duplicación (idempotencia).
**Objetivo:** reconexión sin pérdida de lecturas en buffer; sin duplicados gracias a `event_hash`.
**Verificación:** prueba de corte de red del kit y reconexión → todas las lecturas únicas ingeridas, 0 duplicados persistidos.

### NFR-018 — Degradación elegante de la UI
**Requisito:** El dashboard y demás pantallas renderizan aun sin datos históricos suficientes o sin telemetría en vivo (empty states, FR-DASH-007).
**Objetivo:** 0 pantallas rotas por ausencia de datos; siempre estado vacío con guía.
**Verificación:** prueba de instalación nueva sin datos → dashboard usable.

### NFR-019 — Recuperación ante fallos (backups/DR)
**Requisito:** Respaldos periódicos de PostgreSQL/Timescale y del almacenamiento de boletas; plan de recuperación.
**Objetivo:** RPO ≤ 24 h, RTO ≤ 4 h (MVP); backups verificados.
**Verificación:** prueba de restauración desde backup.

---

## Rendimiento y latencia

### NFR-020 — Latencia de la API (lecturas)
**Requisito:** Endpoints de lectura (dashboard, reportes, desglose) responden rápido bajo carga normal.
**Objetivo:** p95 ≤ 300 ms, p99 ≤ 800 ms para lecturas servidas desde `energy_aggregates`.
**Verificación:** pruebas de carga con percentiles.

### NFR-021 — Latencia de ingestión de telemetría
**Requisito:** Desde que el kit publica una lectura en MQTT hasta que es persistida e idempotentemente registrada.
**Objetivo:** p95 ≤ 2 s (broker → iot-bridge → persistencia); throughput sostenido objetivo ≥ 1.000 lecturas/s por nodo de bridge (MVP), escalable horizontalmente.
**Verificación:** prueba de ingestión con generador de carga MQTT.

### NFR-022 — Latencia del dashboard en vivo (WebSocket)
**Requisito:** El consumo instantáneo (W/kW) se refleja en el dashboard con baja latencia.
**Objetivo:** p95 ≤ 2 s desde recepción de la lectura hasta render en cliente vía WebSocket.
**Verificación:** medición end-to-end de telemetría → render.

### NFR-023 — Cálculo de costos y agregados
**Requisito:** El cálculo de costos (CLP) vive en backend; los agregados se materializan en `energy_aggregates` para evitar recomputar series largas en cada request.
**Objetivo:** reportes de hasta 3 meses servidos desde agregados con p95 ≤ 300 ms; recomputación de agregados sin bloquear lecturas.
**Verificación:** prueba de reporte de 3 meses dentro del SLO.

### NFR-024 — Tiempo de carga del frontend
**Requisito:** Carga inicial del dashboard razonable en redes móviles.
**Objetivo:** LCP ≤ 2.5 s en 4G (P75); bundle optimizado.
**Verificación:** Lighthouse / Web Vitals en CI.

---

## Escalabilidad

### NFR-025 — Escalado horizontal de servicios
**Requisito:** API e iot-bridge son stateless y escalan horizontalmente; el estado vive en DB/broker.
**Objetivo:** capacidad lineal al agregar réplicas; sin estado de sesión local en la API.
**Verificación:** prueba de escalado con N réplicas.

### NFR-026 — Escalabilidad de la serie temporal
**Requisito:** `telemetry_readings` como hypertable Timescale particionada por `source_timestamp`, con compresión y políticas de retención.
**Objetivo:** soportar crecimiento de millones de lecturas/día manteniendo NFR-020/021; compresión activa en chunks antiguos.
**Verificación:** prueba de volumen con compresión habilitada.

### NFR-027 — Multi-tenant a escala
**Requisito:** El modelo soporta miles de organizaciones e instalaciones sin degradación, con scoping eficiente por índices `(organization_id)` / `(installation_id, granularity, bucket_start)`.
**Objetivo:** consultas de tenant usan índices (no full scan); plan de query verificado.
**Verificación:** EXPLAIN de queries críticas.

---

## Integridad de datos IoT

### NFR-028 — Idempotencia de telemetría (anti-duplicado)
**Requisito:** Cada lectura porta un `event_hash` único (`UNIQUE`). El backend tolera reenvíos/duplicados: un `event_hash` repetido se marca `ingestion_status='duplicate'` y no se inserta dos veces.
**Objetivo:** 0 lecturas duplicadas persistidas; reenvío del mismo evento → `duplicate` sin efecto en agregados.
**Verificación:** enviar la misma lectura 2 veces → 1 fila persistida, 2ª clasificada `duplicate`.

### NFR-029 — Doble timestamp (origen vs recepción)
**Requisito:** Toda lectura almacena `source_timestamp` (origen, dispositivo) y `received_timestamp` (recepción, backend).
**Objetivo:** ambos timestamps presentes y `received_timestamp >= source_timestamp` en el caso normal; clock skew tolerado y observado.
**Verificación:** inspección de lecturas; alerta interna ante skew excesivo.

### NFR-030 — Validez referencial de la telemetría
**Requisito:** Toda lectura debe referir un `device_id` válido asociado a un kit/instalación activos (invariante de canon).
**Objetivo:** telemetría de device inexistente/retirado → `invalid` y no contamina agregados.
**Verificación:** prueba de ingestión con `device_id` inválido → rechazada.

### NFR-031 — Rangos físicos válidos
**Requisito:** Magnitudes con CHECK de dominio: consumos/potencias no negativos; `power_factor` ∈ [-1, 1]; `source_timestamp` no excesivamente futuro.
**Objetivo:** lecturas fuera de rango → `invalid` (no se agregan).
**Verificación:** pruebas de valores límite.

### NFR-032 — Consistencia de agregados
**Requisito:** `energy_aggregates` es idempotente por `(installation_id, device_id, category_id, granularity, bucket_start)` y recalculable desde telemetría.
**Objetivo:** recomputar un bucket produce el mismo resultado (determinista); la recomputación no duplica filas.
**Verificación:** recompute repetido → mismos valores, misma cardinalidad.

---

## Retención de datos

### NFR-033 — Retención de telemetría cruda
**Requisito:** La telemetría de alta resolución se conserva un periodo acotado; los agregados se conservan más tiempo.
**Objetivo:** telemetría cruda ≥ 90 días (MVP) con compresión; agregados `day/week/month` ≥ 24 meses.
**Verificación:** política de retención Timescale activa y auditada.

### NFR-034 — Retención de auditoría
**Requisito:** `audit_logs` se conserva por un periodo legal/operacional amplio.
**Objetivo:** retención de `audit_logs` ≥ 12 meses (revisable por cumplimiento).
**Verificación:** verificación de la política de archivado.

### NFR-035 — Retención de archivos de boleta
**Requisito:** El archivo original de la boleta se conserva mientras la instalación esté activa, accesible solo por el tenant.
**Objetivo:** boletas disponibles durante la vida de la instalación; al borrar instalación → archivos eliminados según política de privacidad (NFR-011).
**Verificación:** prueba de ciclo de vida del archivo.

---

## Observabilidad

### NFR-036 — Logging estructurado y correlación
**Requisito:** Logs estructurados (JSON) con request id / correlation id en API, iot-bridge y jobs.
**Objetivo:** todo error crítico rastreable por correlation id end-to-end.
**Verificación:** trazado de un request a través de los servicios.

### NFR-037 — Métricas y alertas operativas
**Requisito:** Métricas de latencia (API/ingestión/WebSocket), tasa de duplicados/invalid, dispositivos offline, errores 5xx.
**Objetivo:** dashboards de operación; alertas al superar umbrales (p. ej. tasa `invalid` > 2%, p95 ingestión > SLO).
**Verificación:** disparo de alerta simulado.

### NFR-038 — Trazas distribuidas
**Requisito:** Instrumentación de trazas en los flujos críticos (ingestión, control, login).
**Objetivo:** trazas con spans por servicio para diagnóstico de latencia.
**Verificación:** inspección de una traza de ingestión.

---

## Mantenibilidad

### NFR-039 — Calidad y consistencia del código/datos
**Requisito:** Convenciones del canon (snake_case, UUIDv7, CLP entero, energía en wh/kwh) aplicadas consistentemente; linting y typecheck en CI.
**Objetivo:** CI bloquea merge con errores de lint/types; 0 violaciones de convención de nombres en DB.
**Verificación:** pipeline de CI.

### NFR-040 — Modularidad del monorepo
**Requisito:** Separación clara `apps/api`, `apps/web`, `apps/iot-bridge`, `packages/shared`, `packages/db`; lógica de negocio en service layer, acceso a datos por repositorios.
**Objetivo:** dependencias entre paquetes explícitas; sin lógica de costos en frontend.
**Verificación:** revisión de límites de módulo.

### NFR-041 — Migraciones reproducibles
**Requisito:** Esquema gestionado con migraciones Prisma versionadas; cambios reversibles donde sea posible.
**Objetivo:** migraciones idempotentes en entornos limpios; seed de desarrollo disponible.
**Verificación:** aplicar migraciones desde cero en CI.

---

## Internacionalización (futura)

### NFR-042 — i18n preparado
**Requisito:** La UI usa claves de traducción (no strings hardcodeados); `locale` por usuario (default `es-CL`).
**Objetivo:** estructura i18n lista para agregar idiomas sin refactor mayor; idioma base `es-CL`.
**Verificación:** auditoría de strings; cambio de locale refleja textos.

### NFR-043 — Formatos regionales y moneda
**Requisito:** Moneda en CLP (entero, sin decimales) con formato local; fechas/zonas en `America/Santiago` por defecto (configurable por instalación).
**Objetivo:** montos siempre en CLP entero; fechas en la zona de la instalación.
**Verificación:** prueba de formato CLP y de zona horaria por instalación.

---

## Compatibilidad (móvil/desktop)

### NFR-044 — Responsive y compatibilidad de navegadores
**Requisito:** La web es responsive (móvil y desktop) y compatible con navegadores modernos (últimas 2 versiones de Chrome, Edge, Safari, Firefox).
**Objetivo:** flujos clave (onboarding, dashboard, control, boleta) usables en viewport móvil y desktop.
**Verificación:** pruebas en breakpoints móvil/desktop.

### NFR-045 — Coherencia con app móvil (futuro)
**Requisito:** La API es agnóstica del cliente, permitiendo una futura app móvil nativa (Android) sin cambios de contrato mayores.
**Objetivo:** contrato API estable y documentado (`04-api`) consumible por web y móvil.
**Verificación:** revisión del contrato API.

---

## Resumen

**Total NFR: 45.** Categorías: Seguridad (9), Privacidad (3), Trazabilidad/Auditoría (3), Disponibilidad/Resiliencia (4), Rendimiento/Latencia (5), Escalabilidad (3), Integridad IoT (5), Retención (3), Observabilidad (3), Mantenibilidad (3), i18n (2), Compatibilidad (2).

Invariantes de canon cubiertos explícitamente: no cross-tenant (NFR-001), telemetría con `device_id` válido (NFR-008/030), control auditado (NFR-013), doble timestamp (NFR-029), UI sin datos históricos (NFR-018), idempotencia por `event_hash` (NFR-028).
