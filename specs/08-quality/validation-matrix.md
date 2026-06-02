# Matriz de Validación — NFR e Invariantes de Canon

> Cruza cada **NFR** (`01-requirements/non-functional-requirements.md`, 45 NFR) y cada **invariante crítico del canon** (`_canon.md` §Multi-tenant y seguridad) con: cómo se valida, tipo de prueba, criterio de aceptación y estado.
> Tipos de prueba (alineados a `test-plan.md`): `unit` (Vitest), `integ` (Supertest), `db` (constraints/migraciones), `authz` (RBAC/tenant), `iot` (ingesta MQTT), `ui` (RTL), `e2e` (Playwright), `load` (k6/MQTT), `static` (lint/SAST/secret-scan).
> Estado: `PENDIENTE` (sin implementación), `EN PROGRESO`, `VALIDADO`. Todos arrancan en `PENDIENTE` (pre-implementación).

## A. Invariantes críticos de canon

| # | Invariante (canon) | Cómo se valida | Tipo | Criterio de aceptación | NFR ligado | Estado |
|---|---|---|---|---|---|---|
| INV-1 | Ninguna query expone datos de `organization_id` ajeno (no cross-tenant) | Suite parametrizada: actor org A pide recurso org B en cada endpoint con datos de tenant | authz, integ | Respuesta 403/404; nunca 200 con datos ajenos; 0 fugas | NFR-001 | PENDIENTE |
| INV-2 | Toda telemetría refiere un `device_id` válido asociado a kit/instalación | Ingesta con `device_id` inexistente/retirado | iot, integ | `ingestion_status='invalid'`, no se inserta, no contamina agregados | NFR-008, NFR-030 | PENDIENTE |
| INV-3 | Toda `control_action` queda auditada en `audit_logs` | Tras cada control (exitoso, fallido y rechazado) se cuenta el registro de auditoría | integ, unit | Exactamente 1 `audit_logs` por acción (incl. `rejected`) con actor/entidad/before-after/ip/ts | NFR-013 | PENDIENTE |
| INV-4 | Costos (CLP) calculados en backend; frontend solo renderiza | Revisión estática + unit de `BillingService`; sin tarifa → `null`+`tariff_configured=false` | static, unit, ui | Frontend no computa montos; `*_clp=null` sin tarifa; nunca valor inventado | NFR-040, NFR-023 | PENDIENTE |
| INV-5 | Control remoto requiere rol `operator\|admin\|owner` | `viewer` intenta control | authz, integ, ui | 403, sin downlink MQTT, intento `rejected` auditado; toggle deshabilitado en UI | NFR-003 | PENDIENTE |
| INV-6 | Idempotencia de telemetría por `event_hash` (UNIQUE) | Enviar la misma lectura 2 veces | iot, db | 1 fila persistida; 2ª `duplicate`; sin doble efecto en agregados | NFR-028 | PENDIENTE |
| INV-7 | Doble timestamp: `source_timestamp` (origen) vs `received_timestamp` (recepción) | Inspección de lecturas ingeridas | iot, db | Ambos presentes; `received_timestamp >= source_timestamp` en caso normal | NFR-029 | PENDIENTE |
| INV-8 | `audit_logs` append-only (sin UPDATE/DELETE) | Intento de UPDATE/DELETE sobre `audit_logs` | db | Bloqueado por trigger; 0 mutaciones posibles | NFR-014 | PENDIENTE |
| INV-9 | Secrets nunca en frontend | secret-scan + revisión de bundle | static | 0 secretos en repo/frontend | NFR-006 | PENDIENTE |
| INV-10 | UI renderiza sin datos históricos (empty states) | Instalación nueva sin telemetría | ui, e2e | Dashboard usable con `EmptyState`; 0 pantallas rotas | NFR-018 | PENDIENTE |

## B. Seguridad (NFR-001..009)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-001 | Aislamiento multi-tenant | Test cross-tenant por endpoint (ver INV-1) | authz, integ | 403/404 a recursos ajenos; 0 fugas | PENDIENTE |
| NFR-002 | Auth robusta (JWT access≤15min + refresh rotado, Argon2id) | Inspección de TTL; refresh revocado no renueva | integ, unit | access ≤15 min; refresh rotado/revocable; sin secreto en frontend | PENDIENTE |
| NFR-003 | RBAC efectiva | Pruebas por rol contra matriz FR-AUTH-009 | authz, integ | 100% endpoints mutadores con check de rol; sin permiso → 403 sin mutar | PENDIENTE |
| NFR-004 | Anti fuerza bruta / abuso | Carga de intentos fallidos de login | integ, load | ≤5 fallos/5min por cuenta+IP → backoff; recuperación genérica | PENDIENTE |
| NFR-005 | Cifrado tránsito/reposo + URLs firmadas de boleta | Escaneo TLS; acceso a `file_url` sin auth | static, integ | 0 endpoints en claro; `file_url` no accesible sin autorización del tenant | PENDIENTE |
| NFR-006 | Gestión de secretos | secret-scan en CI | static | 0 secretos hardcodeados | PENDIENTE |
| NFR-007 | Validación de entrada en el perímetro | Fuzzing / contract testing de inputs | integ | 100% endpoints con schema; inválido → 400 sin efectos | PENDIENTE |
| NFR-008 | Seguridad del canal IoT | Ingesta con device desconocido/retirado | iot | `invalid` y descarte; auth de kit ante broker | PENDIENTE |
| NFR-009 | Cabeceras / endurecimiento web | Escáner de cabeceras en CI | static | Calificación A (CSP/HSTS/anti-clickjacking; cookies seguras) | PENDIENTE |

## C. Privacidad (NFR-010..012)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-010 | Minimización de datos | Revisión del data dictionary | static | Cada PII con propósito declarado | PENDIENTE |
| NFR-011 | Borrado / derechos del titular (soft delete) | Flujo de borrado; soft delete en org/installation/kit/device | integ, db | PII eliminada/anonimizada conservando integridad de series | PENDIENTE |
| NFR-012 | Confidencialidad energética / instalador IoT | Acceso del rol instalador a datos energéticos | authz | Instalador no lee datos energéticos del tenant | PENDIENTE |

## D. Trazabilidad y auditoría (NFR-013..015)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-013 | Auditoría de acciones sensibles | Control, cambio de rol, claim/transfer kit, cambio tarifa/plan → audit | integ, unit | 1 registro por acción con actor/entidad/before-after/ip/ts | PENDIENTE |
| NFR-014 | Inmutabilidad del audit log | Intento UPDATE/DELETE en `audit_logs` | db | Bloqueado por trigger | PENDIENTE |
| NFR-015 | Trazabilidad de eventos de dominio | Trazado e2e de onboarding y control por correlation id | e2e, integ | Flujo reconstruible por correlation/event id | PENDIENTE |

## E. Disponibilidad y resiliencia (NFR-016..019)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-016 | Disponibilidad ≥99.5% (MVP) | Monitoreo de uptime | load | SLO mensual reportado | PENDIENTE |
| NFR-017 | Resiliencia pérdida IoT | Corte y reconexión del kit | iot, load | Lecturas en buffer ingeridas 1 vez; 0 duplicados | PENDIENTE |
| NFR-018 | Degradación elegante UI | Instalación nueva sin datos | ui, e2e | 0 pantallas rotas; empty state con guía | PENDIENTE |
| NFR-019 | Backups / DR | Restauración desde backup | manual/ops | RPO ≤24h, RTO ≤4h; backup verificado | PENDIENTE |

## F. Rendimiento y latencia (NFR-020..024)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-020 | Latencia lecturas API | k6 sobre dashboard/reportes/desglose | load | p95 ≤300ms, p99 ≤800ms (desde agregados) | PENDIENTE |
| NFR-021 | Latencia ingestión telemetría | Generador de carga MQTT | load, iot | p95 broker→persistencia ≤2s; ≥1.000 lecturas/s por bridge | PENDIENTE |
| NFR-022 | Latencia dashboard en vivo | Medición lectura→render WebSocket | load, e2e | p95 ≤2s | PENDIENTE |
| NFR-023 | Cálculo costos/agregados | Reporte 3 meses desde agregados | load, unit | p95 ≤300ms; recompute sin bloquear lecturas | PENDIENTE |
| NFR-024 | Tiempo de carga frontend | Lighthouse/Web Vitals en CI | load, static | LCP ≤2.5s en 4G (P75) | PENDIENTE |

## G. Escalabilidad (NFR-025..027)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-025 | Escalado horizontal stateless | Prueba con N réplicas | load | Capacidad lineal; sin sesión local en API | PENDIENTE |
| NFR-026 | Escalabilidad serie temporal | Volumen con compresión Timescale | db, load | Hypertable particionada; compresión en chunks antiguos | PENDIENTE |
| NFR-027 | Multi-tenant a escala | EXPLAIN de queries de tenant | db | Uso de índices `(organization_id)`/`(installation_id,granularity,bucket_start)`; sin full scan | PENDIENTE |

## H. Integridad de datos IoT (NFR-028..032)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-028 | Idempotencia (`event_hash`) | Misma lectura 2 veces | iot, db | 1 fila; 2ª `duplicate`; agregados sin doble efecto | PENDIENTE |
| NFR-029 | Doble timestamp | Inspección de lecturas | iot, db | source y received presentes; received ≥ source (normal) | PENDIENTE |
| NFR-030 | Validez referencial telemetría | Ingesta `device_id` inválido | iot | `invalid`; no agrega | PENDIENTE |
| NFR-031 | Rangos físicos válidos | Valores límite (negativos, PF fuera de rango, ts futuro) | iot, db | Fuera de rango → `invalid`; CHECK de dominio activos | PENDIENTE |
| NFR-032 | Consistencia de agregados | Recompute repetido de un bucket | unit, db | Mismo resultado y cardinalidad (idempotente por clave) | PENDIENTE |

## I. Retención (NFR-033..035)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-033 | Retención telemetría cruda | Política de retención Timescale | db, ops | Cruda ≥90 días (comprimida); agregados ≥24 meses | PENDIENTE |
| NFR-034 | Retención auditoría | Política de archivado | ops | `audit_logs` ≥12 meses | PENDIENTE |
| NFR-035 | Retención archivos boleta | Ciclo de vida del archivo | integ, ops | Disponible durante vida de instalación; borrado según NFR-011 | PENDIENTE |

## J. Observabilidad (NFR-036..038)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-036 | Logging estructurado + correlación | Trazado de un request entre servicios | static, integ | Logs JSON con correlation id end-to-end | PENDIENTE |
| NFR-037 | Métricas y alertas operativas | Disparo de alerta simulado | ops | Alerta al superar umbral (invalid >2%, p95 ingesta > SLO) | PENDIENTE |
| NFR-038 | Trazas distribuidas | Inspección de traza de ingestión | ops | Spans por servicio en flujos críticos | PENDIENTE |

## K. Mantenibilidad (NFR-039..041)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-039 | Calidad/consistencia código y datos | Lint + typecheck + revisión de nombres DB en CI | static | CI bloquea lint/types; 0 violaciones de convención | PENDIENTE |
| NFR-040 | Modularidad del monorepo | Revisión de límites de módulo | static | Dependencias explícitas; sin lógica de costos en frontend | PENDIENTE |
| NFR-041 | Migraciones reproducibles | `prisma migrate deploy` desde cero en CI | db | Migraciones idempotentes; seed disponible | PENDIENTE |

## L. i18n y compatibilidad (NFR-042..045)

| NFR | Requisito | Cómo se valida | Tipo | Criterio de aceptación | Estado |
|---|---|---|---|---|---|
| NFR-042 | i18n preparado | Auditoría de strings; cambio de locale | static, ui | Sin strings hardcodeados; base `es-CL` | PENDIENTE |
| NFR-043 | Formatos regionales/moneda | Formato CLP y zona horaria por instalación | unit, ui | CLP entero; fechas en zona de la instalación | PENDIENTE |
| NFR-044 | Responsive / navegadores | Pruebas en breakpoints móvil/desktop | ui, e2e | Flujos clave usables en móvil y desktop | PENDIENTE |
| NFR-045 | Coherencia con app móvil futura | Revisión del contrato API | static | Contrato estable consumible por web/móvil | PENDIENTE |

## Resumen de cobertura

- **Invariantes de canon:** 10/10 con prueba asignada.
- **NFR:** 45/45 con método de validación, tipo y criterio.
- Estado global: **PENDIENTE** (pre-implementación). Cada fase del roadmap actualiza esta matriz en su criterio de cierre.
