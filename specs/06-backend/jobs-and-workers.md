# Jobs y Workers — SmartSense

> Deriva de `specs/_canon.md`, `services.md` y `backend-architecture.md`.
> Ejecución en `apps/worker` (proceso separado de la API): un **scheduler cron** dispara jobs periódicos y **consumidores de cola** reaccionan a eventos de dominio del event-bus. Cola/scheduler de referencia: BullMQ + Redis (o pgmq/pg-boss sobre PostgreSQL).

## Principios transversales

- **Idempotencia obligatoria**: todo job se puede re-ejecutar sin doble efecto. UPSERT por clave natural; dedup de alertas/notificaciones; `event_hash` para telemetría.
- **Aislamiento por tenant**: cada unidad de trabajo opera sobre una `installation_id`/`organization_id`; nunca cruza tenants.
- **Manejo de fallos**: reintentos con backoff exponencial (máx. N), tras agotar → DLQ (dead-letter queue) + log `error` + alerta operacional. Un fallo por instalación no aborta el lote de las demás (procesamiento aislado por ítem).
- **Concurrencia**: lock por clave (`installation_id:granularity:bucket`) para evitar doble rollup simultáneo.
- **Observabilidad**: cada job loguea `job`, `installation_id`, `request_id`/`run_id`, `duration_ms`, resultado.

---

## 1. Agregación periódica (rollup hora/día/semana/mes)
- **Trigger:** cron. Hora: `*/5 * * * *` consolida la hora en curso/cerrada; día: `5 0 * * *`; semana: lunes `15 0 * * 1`; mes: `30 0 1 * *` (todos en UTC; presentación según `installations.timezone`).
- **Input:** continuous aggregates de Timescale (capa hora) + tarifa vigente (`BillingService`).
- **Output:** UPSERT en `energy_aggregates` por `(installation_id, device_id, category_id, granularity, bucket_start)` con `energy_kwh`, `cost_clp|null`, `peak_power_w`, `recomputed_at`. Emite `aggregate.recomputed`.
- **Idempotencia:** UPSERT por clave única; recomputar el mismo bucket sobrescribe sin duplicar.
- **Fallos:** por-instalación aislado; reintento con backoff; bucket fallido reintenta en la siguiente corrida (el job recorre buckets pendientes/recientes, no solo el actual).

## 2. Recálculo de agregados (backfill/corrección)
- **Trigger:** evento (`telemetry` tardía detectada, corrección de tarifa, `bill.confirmed` que cambia base de costo) o cola manual/operacional.
- **Input:** `installation_id`, rango `[from,to]`, granularidades afectadas.
- **Output:** recomputa y UPSERT de los buckets del rango; emite `aggregate.recomputed`.
- **Idempotencia:** misma clave única; el recálculo es la fuente de verdad sobre datos previos.
- **Fallos:** rango se subdivide; sub-rango fallido a DLQ sin bloquear el resto.

## 3. Evaluación de alertas — batch (anomalía, sobreconsumo proyectado)
- **Trigger:** cron (ej. cada 15–60 min según tipo).
- **Input:** `energy_aggregates` recientes + baseline histórico + `consumption_limits` + proyección mensual.
- **Output:** `alerts` tipo `anomaly` / `over_budget` (con `severity`, `context`, `estimated_impact_clp` vía BillingService); dedup si ya hay equivalente `open`. Emite `alert.raised`.
- **Idempotencia:** dedup por `(installation_id, device_id?, type)` mientras esté `open`; no crea duplicados por re-corrida.
- **Fallos:** por-instalación aislado + reintento.

## 4. Evaluación de alertas — streaming (dispositivo elevado, sobreconsumo por límite)
- **Trigger:** evento `telemetry.ingested` (consumidor de cola).
- **Input:** lectura ingestada + `consumption_limits` del device + ventana corta de telemetría.
- **Output:** `alerts` tipo `high_device` / `over_budget` (límite excedido); si `action_on_exceed=turn_off` → encola `ControlAction`. Emite `alert.raised`.
- **Idempotencia:** dedup mientras la alerta equivalente siga `open`; pre-alerta (`pre_alert_pct`) una sola vez por ventana.
- **Fallos:** mensaje reencolado con backoff; si el device ya no existe → descarta y loguea.

## 5. Generación de recomendaciones periódicas
- **Trigger:** cron (ej. diario `0 6 * * *`) + evento al levantar ciertas alertas.
- **Input:** desglose por device/categoría, patrones de uso, `energy_aggregates`, tarifa.
- **Output:** `recommendations` (`source=periodic_analysis` o `alert`) con `estimated_saving_clp` (vía BillingService, omitido sin tarifa). Emite `recommendation.created`.
- **Idempotencia:** dedup por contenido/clave lógica para no recrear la misma recomendación `new` repetida.
- **Fallos:** por-instalación aislado + reintento.

## 6. Proyección mensual
- **Trigger:** cron (ej. cada 6 h) y al cierre de día.
- **Input:** consumo acumulado del periodo + ritmo (`energy_aggregates` day/hour) + tarifa.
- **Output:** estimación de kWh y CLP de fin de mes (cacheada para dashboard/alertas); alimenta `over_budget`.
- **Idempotencia:** sobrescribe la proyección vigente del periodo (no acumula).
- **Fallos:** reintento; ante datos insuficientes deja proyección `null` (no inventa).

## 7. Detección de dispositivos offline (last_seen)
- **Trigger:** cron (ej. `*/2 * * * *`).
- **Input:** `devices.last_seen_at` + ventana esperada de telemetría (ver `07-iot/telemetry-model.md`).
- **Output:** devices sin lectura dentro de ventana → `device.state=offline` (`DeviceService.markOffline`) + `alert` tipo `offline`. Emite `device.offline`.
- **Idempotencia:** no re-alerta si ya está `offline` con alerta `open`; al volver telemetría → `online` (`device.online`) y se puede auto-resolver/dejar la alerta para revisión.
- **Fallos:** reintento en siguiente corrida (estado derivable de `last_seen_at`).

## 8. Ejecución de control_schedules
- **Trigger:** cron de alta frecuencia (`* * * * *`) que evalúa reglas `rule` (jsonb cron/regla) próximas a vencer.
- **Input:** `control_schedules` `enabled=true` con disparo en la ventana actual.
- **Output:** crea `control_action` (`turn_on|turn_off`) vía `ControlService.requestAction` (downlink MQTT) + audit.
- **Idempotencia:** marca de ejecución por `(schedule_id, scheduled_at)` para no disparar dos veces el mismo slot; respeta `installations.timezone` al expandir la regla.
- **Fallos:** acción fallida → `control_action.status=failed` + reintento acotado; no se "acumulan" disparos perdidos por caída larga (se omiten slots vencidos fuera de tolerancia).

## 9. Despacho de notificaciones
- **Trigger:** evento (`alert.raised`, `recommendation.created`, `control.resolved`, etc.) → consumidor de cola.
- **Input:** evento + preferencias de canal del destinatario.
- **Output:** `notifications` persistida + envío por `in_app|email|push` vía puertos externos (ver `integrations.md`). Emite `notification.sent`.
- **Idempotencia:** dedup por `(related_type, related_id, channel, user_id)` para no notificar dos veces el mismo evento.
- **Fallos:** reintento con backoff por canal; in_app garantizada (persistida) aunque email/push fallen; tras agotar reintentos → DLQ + log, sin perder el registro in_app.

---

## Resumen

| Job | Trigger | Idempotencia |
|---|---|---|
| Agregación periódica | cron (5m/diario/semanal/mensual) | UPSERT clave de `energy_aggregates` |
| Recálculo agregados | evento / manual | misma clave única |
| Alertas batch | cron 15–60m | dedup mientras `open` |
| Alertas streaming | evento `telemetry.ingested` | dedup mientras `open` |
| Recomendaciones | cron diario + evento | dedup por contenido |
| Proyección mensual | cron 6h + cierre día | sobrescribe proyección vigente |
| Offline detection | cron 2m | estado derivable de `last_seen_at` |
| control_schedules | cron 1m | marca `(schedule_id, scheduled_at)` |
| Notificaciones | evento | dedup `(related_*, channel, user)` |
