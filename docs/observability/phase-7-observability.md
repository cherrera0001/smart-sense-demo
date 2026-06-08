# Fase 7 — Observabilidad (SmartSense API)

Estado actual de logging, trazabilidad, auditoría y métricas de la API Fastify, y qué
queda diferido a fases posteriores.

---

## 1. Logging estructurado (pino) con redacción

La API usa el logger de Fastify (pino) configurado en
[`apps/api/src/config/logger.ts`](../../apps/api/src/config/logger.ts). Logs en **JSON**
(una línea por evento), aptos para ingestión en cualquier agregador.

### Redacción de secretos (activa)
`logger.ts` define `redact.paths` con censura `[REDACTED]` para:

- Headers: `req.headers.authorization`, `req.headers.cookie`.
- Body: `password`, `token`, `refreshToken`, `refresh_token`.
- Campos sensibles globales: `password`, `passwordHash`, `password_hash`, `token`,
  `refreshToken`, `refresh_token`.
- Variables/secretos: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `MQTT_PASSWORD`, `SMARTSENSE_API_TOKEN`.

El serializer de `req` solo emite `method`, `url`, `id` — **no** vuelca headers/body
completos. Connection strings y tokens nunca aparecen en claro.

### Nivel de log
`LOG_LEVEL` (default `info`). En producción mantener `info`; subir a `debug` solo
temporalmente para diagnóstico (cuidado con el volumen).

---

## 2. Request ID / trazabilidad

[`apps/api/src/plugins/request-id.ts`](../../apps/api/src/plugins/request-id.ts) propaga
el `req.id` (autogenerado por Fastify) al header de respuesta `x-request-id`. Cada línea
de log de request incluye ese `id`, permitiendo correlacionar petición → logs → respuesta.

Para trazas distribuidas end-to-end (cliente → web → API), un siguiente paso es aceptar un
`x-request-id` entrante y reusarlo; hoy se genera por servidor.

---

## 3. Health / readiness

Endpoints expuestos por [`apps/api/src/health.ts`](../../apps/api/src/health.ts):

| Endpoint | Tipo | Comprueba |
|---|---|---|
| `GET /health` | Liveness | Proceso vivo (sin auth, sin DB). |
| `GET /healthz` | Liveness | Igual que `/health` (alias k8s-style). |
| `GET /readyz` | Readiness | Conectividad DB (`SELECT 1`); 503 si falla. |

Usar `/health` para liveness del orquestador y `/readyz` para readiness (incluye DB).
Ninguno expone secretos ni connection strings.

---

## 4. Auditoría de acciones críticas

La tabla `audit_logs` (append-only, trigger en SQL) registra acciones sensibles vía
[`apps/api/src/lib/audit.ts`](../../apps/api/src/lib/audit.ts) (`writeAudit`). Ya cubre,
entre otros: `auth.logout`, revisión de alertas, y acciones de control (dry-run / comandos).
Cada registro incluye `organizationId`, `userId`, `action`, `entityType`, `entityId` e `ip`.

Esto provee un rastro de auditoría persistente e inmutable a nivel de aplicación,
complementario a los logs efímeros de pino.

---

## 5. Métricas mínimas (vía logs)

Hoy las métricas operativas se derivan de los logs estructurados:

- **Request count / latencia**: cada request loguea `method`, `url`, `id`, status y
  tiempo de respuesta (pino/Fastify). Agregable por el colector (Loki/CloudWatch/Datadog).
- **Error count**: el `errorHandlerPlugin` y los logs de nivel `error`/`warn` permiten
  contar errores y tasas por endpoint.
- **Disponibilidad**: sondas externas contra `/health` y `/readyz`.

Recomendación: enviar stdout a un agregador con parsing JSON y construir dashboards/alertas
sobre status codes y latencia. No se requiere instrumentación de código adicional para esto.

---

## 6. Diferido a fase posterior

- **`/metrics` Prometheus**: endpoint de métricas (RED/USE, histogramas de latencia,
  contadores por ruta) **diferido**. Cuando se aborde, integrar un colector pino→Prometheus
  o `fastify-metrics`, exponiendo `/metrics` protegido/red interna. No implementado en Fase 7.
- **Tracing distribuido (OpenTelemetry)**: spans cliente→API→DB. Diferido.
- **Propagación de `x-request-id` entrante**: reusar el id del cliente si llega. Diferido.

---

## 7. Checklist operativo
- [ ] Logs JSON ingeridos por el agregador (parsing correcto del campo `id`).
- [ ] Verificado que `authorization`/`cookie`/tokens/connection strings salen `[REDACTED]`.
- [ ] Sondas externas a `/health` (liveness) y `/readyz` (readiness+DB).
- [ ] Alertas sobre tasa de `5xx` y picos de latencia desde logs.
- [ ] Revisión periódica de `audit_logs` para acciones críticas.
