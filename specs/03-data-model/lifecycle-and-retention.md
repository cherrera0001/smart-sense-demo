# Ciclo de Vida y Retención de Datos — SmartSense

> Deriva de `specs/_canon.md`, `relational-model.md`, `constraints.md` e `indexes.md`. Define retención, compresión/downsampling, soft vs hard delete, borrado por privacidad y recálculo de agregados. Las cifras son política base del MVP; ajustables por plan SaaS y por norma legal.

## Principios

- **Telemetría cruda** = caro de almacenar, valioso a corto plazo → compresión + retención acotada, downsampling a agregados antes de purgar.
- **Agregados** = barato, valioso a largo plazo → retención larga (reportes históricos, comparaciones interanuales).
- **Boletas** = documento legal/contable → retención larga, archivo original intacto.
- **Auditoría** = inmutable, no se purga dentro del periodo legal de no repudio.
- **Privacidad** = el usuario/cliente puede solicitar borrado; se distingue dato personal de dato operativo agregado anonimizable.

---

## 1. telemetry_readings (cruda — hypertable Timescale)

| Aspecto | Política base |
|---|---|
| **Retención cruda** | ≥ 90 días en la hypertable. Tras el periodo, los chunks se purgan vía política de retención de Timescale (`add_retention_policy('telemetry_readings', INTERVAL '90 days')`). |
| **Compresión** | Compresión nativa de Timescale a partir de **7 días** (`add_compression_policy('telemetry_readings', INTERVAL '7 days')`). `segmentby` por `device_id`; `orderby` por `source_timestamp DESC`. Reduce footprint 10–20x. |
| **Downsampling** | Antes de purgar la cruda, los datos se materializan en `energy_aggregates` (hour → day → week → month) vía continuous aggregates / job de recálculo. Ningún chunk se elimina sin que su agregado horario exista. |
| **Precondición de purga** | La purga de un chunk solo procede si `energy_aggregates` con `granularity='hour'` cubre íntegramente ese rango para los devices afectados (BR-025). |

Detalle por plan (sugerido, ajustable): `free` 90 días cruda · `pro` 180 días · `enterprise` ≥ 365 días.

## 2. energy_aggregates (agregados)

| Aspecto | Política base |
|---|---|
| **Retención** | `hour`: ≥ 13 meses (comparación interanual mes a mes). `day`/`week`/`month`: ≥ **24 meses**, recomendado 36–60 meses para tendencias largas (segmento business). |
| **Compresión** | No requiere Timescale; tabla relacional ordinaria de bajo volumen relativo. Indexada según `indexes.md`. |
| **Recálculo** | Idempotente por (`installation_id`, `device_id`, `category_id`, `granularity`, `bucket_start`); upsert con `recomputed_at`. Disparadores de recálculo: late-arriving telemetry, corrección de tarifa (`installation.tariff_assigned`), confirmación de boleta, cambio de categoría de un device. |
| **Costo (`cost_clp`)** | Recalculable: si cambia la `Tariff` aplicable, se recomputa `cost_clp` de los buckets afectados (BR-030/BR-031). |

## 3. electricity_bills (boletas)

| Aspecto | Política base |
|---|---|
| **Archivo original (`file_url`)** | Conservado en storage privado (URL firmada de corta vida); nunca público (BR-033). |
| **Retención legal** | ≥ **6 años** (alineado con conservación de documentos tributarios en Chile). Metadata y archivo se conservan juntos. |
| **Borrado** | No se hard-delete dentro del periodo legal aunque se borre la instalación; al cerrar cuenta, se aplica anonimización del vínculo de cliente (ver §7) conservando el documento si la ley lo exige. |
| **`raw_extraction`** | Se conserva mientras la boleta esté `uploaded`/`parsed`; puede purgarse tras `confirmed` si reduce sensibilidad, manteniendo los campos estructurados. |

## 4. audit_logs (auditoría inmutable)

| Aspecto | Política base |
|---|---|
| **Inmutabilidad** | Append-only por trigger (BR-061 / TC-004); sin UPDATE/DELETE. |
| **Retención** | ≥ **24 meses** en caliente; recomendado **≥ 5 años** para acciones de control físico y cambios de rol (no repudio). |
| **Archivado** | Pasado el periodo en caliente, exportar a almacenamiento WORM / cold storage antes de cualquier purga; la purga solo procede fuera del periodo legal y queda ella misma registrada. |

## 5. Soft delete vs hard delete por entidad

| Entidad | Estrategia | Nota |
|---|---|---|
| `organizations` | **Soft** (`deleted_at`) | Cierre de tenant reversible; hard delete solo tras periodo de gracia + cumplimiento legal. |
| `installations` | **Soft** (`deleted_at`) | Conserva histórico de boletas/agregados/auditoría. |
| `energy_kits` | **Soft** (`deleted_at`) | `retired` para fin de vida; soft delete para baja administrativa. |
| `devices` | **Soft** (`deleted_at`) | Telemetría histórica referencia el device; no se hard-delete mientras existan lecturas/agregados. |
| `memberships` | **Estado** (`revoked`) | No se borra físicamente para preservar trazabilidad de quién tuvo acceso. |
| `telemetry_readings` | **Hard** (por retención Timescale) | Purga por política de chunks tras downsampling. |
| `energy_aggregates` | **Hard** (por retención) | Purga de granularidades finas vencidas. |
| `electricity_bills` | **Sin borrado** dentro del periodo legal | Documento contable. |
| `audit_logs` | **Sin borrado** dentro del periodo legal | Inmutable. |
| `alerts` / `recommendations` | **Estado** (`dismissed`) | No se borran; cambian de estado. |
| `notifications` | **Hard** por TTL | Purga de notificaciones leídas/antiguas (sugerido ≥ 90 días). |
| `control_actions` | **Sin borrado** | Trazabilidad de control; resumido en `audit_logs`. |

## 6. Recálculo de agregados (resumen operativo)

1. Telemetría tardía o corrección detectada → marcar buckets afectados como "stale".
2. Job recomputa `hour` desde la cruda (o desde cruda + continuous aggregate de Timescale), luego `day` ← `hour`, `week`/`month` ← `day`.
3. Upsert idempotente por la clave única; `recomputed_at = now()`.
4. Si cambió la tarifa/boleta base, recomputar también `cost_clp` (nunca inventar valor sin base, BR-031).
5. Emitir `aggregate.recomputed`.
6. La purga de cruda (§1) nunca precede a la materialización del agregado horario correspondiente.

## 7. Política de borrado de datos del usuario (privacidad)

Ante solicitud de borrado de datos personales (derecho del titular):

| Dato | Acción |
|---|---|
| `users.email`, `full_name`, `phone` | Anonimizar/tokenizar (p. ej. `deleted-<uuid>@anon`) tras periodo de gracia; conservar `id` para integridad referencial. |
| `organizations.legal_id`, `installations.address` | Anonimizar si ya no hay obligación legal de conservación. |
| `electricity_bills.client_number`, `file_url` | Disociar del titular; conservar el documento si la ley tributaria lo exige (§3), de lo contrario eliminar el archivo del storage. |
| `telemetry_readings`, `energy_aggregates` | Anonimizables: pierden el vínculo a persona al disociar la instalación; pueden conservarse de forma agregada/no identificable para métricas. |
| `audit_logs` | **No se borran** dentro del periodo legal de no repudio; se documenta la solicitud de borrado como un evento más. |
| `control_actions`/`control_schedules` | Conservar lo necesario para no repudio; disociar identidad del actor donde sea posible sin romper auditoría. |

Reglas:
- El borrado/anonimización se ejecuta con periodo de gracia (sugerido 30 días) y queda **registrado en `audit_logs`**.
- Prevalece la obligación legal de conservación (boletas, auditoría) sobre el borrado, informándolo al titular.
- El borrado de un tenant es soft primero; el hard delete en cascada solo tras vencer las retenciones legales aplicables.

## 8. Resumen de números

| Dato | Compresión | Retención mínima | Borrado |
|---|---|---|---|
| Telemetría cruda | desde 7 días | ≥ 90 días | hard (Timescale) tras downsampling |
| Agregados `hour` | — | ≥ 13 meses | hard por retención |
| Agregados `day/week/month` | — | ≥ 24 meses | hard por retención |
| Boletas | — | ≥ 6 años (legal) | sin borrar / disociar |
| Auditoría | — | ≥ 24 meses caliente / ≥ 5 años total | WORM, sin borrar en periodo legal |
| Notificaciones | — | ≥ 90 días | hard por TTL |
