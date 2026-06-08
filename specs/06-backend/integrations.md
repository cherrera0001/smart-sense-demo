# Integraciones Externas — SmartSense

> Deriva de `specs/_canon.md`, `backend-architecture.md` y `services.md`.
> Toda integración externa se expone tras un **puerto** (interfaz) con un **adaptador** intercambiable (patrón hexagonal). Credenciales solo en variables de entorno del backend/worker — **nunca en frontend** (canon). Resiliencia: reintentos con backoff, timeouts, circuit breaker donde aplique.

## Principios

- **Secrets server-side**: claves de MQTT, S3/GCS, email/push y futuras distribuidoras viven en env (`.env`/secret manager GCP). El frontend nunca las ve ni las usa.
- **Mínimo privilegio**: cada integración con credenciales de scope acotado (ej. token de kit solo `telemetry:ingest`; clave S3 solo el bucket de boletas).
- **Aislamiento**: el adaptador encapsula el SDK/protocolo; el servicio de dominio depende del puerto, no del proveedor → testeable con mocks.
- **Resiliencia**: timeouts explícitos; reintentos idempotentes con backoff exponencial + jitter; DLQ para envíos fallidos; degradación elegante (ej. in_app garantizada aunque email falle).

---

## 1. Broker MQTT (EMQX)
- **Propósito:** transporte bidireccional con kits IoT — uplink de telemetría y downlink de comandos de control.
- **Protocolo:** MQTT 3.1.1/5 sobre TLS (mTLS o user/pass por kit). Topics y QoS en `07-iot/mqtt-or-ingestion-contract.md`.
- **Datos intercambiados:**
  - Uplink: telemetría (`smartsense/{kit_qr}/{device_ref}/telemetry`) consumida por `apps/iot-bridge`.
  - Downlink: comandos (`smartsense/{kit_qr}/{device_ref}/command`) publicados por `ControlService`; ack en topic de ack.
- **Credenciales:** por kit, emitidas en el provisioning (ver `device-provisioning.md`); rotables; revocables al `retire`/`transfer`. Scope `telemetry:ingest` para el bridge hacia la API.
- **Resiliencia:** reconexión automática con backoff; suscripción persistente (clean session=false / sesión MQTT5); QoS 1 para telemetría y comandos; buffering offline en el dispositivo (no en el broker indefinidamente); el bridge encola hacia la API y reintenta ante caída de la API.

## 2. Almacenamiento de archivos de boleta (S3 / GCS)
- **Propósito:** persistir el archivo original de la `electricity_bill` (PDF/imagen) referenciado por `file_url`.
- **Protocolo:** API S3-compatible (GCS o S3) sobre HTTPS. Subida vía **URL prefirmada** generada por el backend (el cliente sube directo al storage, el backend nunca recibe el binario completo ni expone credenciales).
- **Datos intercambiados:** binario de boleta (subida); `file_url` (referencia almacenada en DB). Acceso de lectura también vía URL prefirmada temporal.
- **Credenciales:** clave de servicio en env, scope solo al bucket de boletas; bucket privado (sin acceso público); cifrado en reposo.
- **Resiliencia:** reintento de generación de URL; validación de `content-type`/tamaño antes de prefirmar; el registro de boleta queda `uploaded` solo tras confirmar la subida.

## 3. Email / Push para notificaciones
- **Propósito:** entregar `notifications` por canales `email` y `push` (canal `in_app` es interno, sin proveedor externo).
- **Protocolo:**
  - Email: API HTTPS de proveedor transaccional (ej. SES/SendGrid) o SMTP autenticado.
  - Push: FCM/APNs (web/móvil) sobre HTTPS.
- **Datos intercambiados:** destinatario, asunto/título, cuerpo, metadatos `related_type/related_id`. No se envía PII sensible innecesaria.
- **Credenciales:** API keys/credenciales del proveedor en env; tokens de push asociados al dispositivo del usuario, almacenados server-side.
- **Resiliencia:** despacho desde el worker (job de notificaciones) con reintentos + backoff; dedup por evento; `in_app` siempre persistida aunque email/push fallen; tras agotar reintentos → DLQ + log.

## 4. OCR de boletas (futura — V1/V2)
- **Propósito:** extraer automáticamente consumo, total, periodo y distribuidora desde el archivo de boleta (`raw_extraction`), pasando la boleta de `uploaded` a `parsed`.
- **Protocolo:** API HTTPS de OCR/IDP (ej. Document AI / Textract) — invocada por job tras la subida.
- **Datos intercambiados:** referencia/binario de la boleta (vía URL prefirmada) → JSON estructurado a `electricity_bills.raw_extraction`. El usuario confirma (`parsed`→`confirmed`); nunca se confirma automático sin validación (no se inventan valores).
- **Credenciales:** API key del proveedor OCR en env.
- **Resiliencia:** asíncrono y opcional; fallo de OCR deja la boleta en `uploaded` para captura manual (sin bloquear el flujo).

## 5. Integración con distribuidoras (futura — V2)
- **Propósito:** obtener tarifas vigentes y/o datos de consumo oficiales directo de la distribuidora (Enel, CGE, etc.) para enriquecer `tariffs`/`electricity_bills`.
- **Protocolo:** API HTTPS de la distribuidora (cuando exista) o scraping autorizado; sincronización por job periódico.
- **Datos intercambiados:** catálogo de tarifas, periodos de facturación, consumo oficial; mapeados a `distributors`/`tariffs`/`electricity_bills`.
- **Credenciales:** por distribuidora en env; scope de solo lectura.
- **Resiliencia:** sincronización idempotente (UPSERT por `UNIQUE(distributor_id, code, valid_from)`); fallo no afecta operación (los datos manuales/boleta siguen siendo la base de costo).

---

## Resumen

| Integración | Protocolo | Credenciales | Estado |
|---|---|---|---|
| EMQX (MQTT) | MQTT/TLS | por kit (env/provisioning) | MVP |
| Boletas S3/GCS | HTTPS + URL prefirmada | clave servicio (env), bucket privado | MVP |
| Email/Push | HTTPS (SES/FCM/APNs) | API keys (env) | MVP |
| OCR boletas | HTTPS (Document AI/Textract) | API key (env) | V1/V2 |
| Distribuidoras | HTTPS / sync | por distribuidora (env) | V2 |
