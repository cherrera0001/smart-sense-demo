# Plan de Pruebas — SmartSense

> Deriva de `specs/_canon.md`, `specs/01-requirements/functional-requirements.md` (87 FR), `specs/01-requirements/non-functional-requirements.md` (45 NFR), `specs/03-data-model/relational-model.md`, `specs/04-api/api-overview.md`, `specs/05-frontend/{routes,components}.md` y `specs/06-backend/services.md`.
> Objetivo: garantizar que toda implementación respeta los invariantes de canon (no cross-tenant, telemetría con `device_id` válido, control auditado, doble timestamp, idempotencia por `event_hash`, costos en backend) antes de aceptar cualquier entrega.

## 1. Herramientas y stack de pruebas

| Capa | Herramienta | Uso |
|---|---|---|
| Unitarias (TS, servicios de dominio) | **Vitest** | Lógica de `*Service` aislada (mocks de repos/event-bus); rápido, ESM-native. |
| Integración API | **Supertest** + Vitest, Fastify `inject()` | Levanta la app Fastify contra Postgres+Timescale de test (Testcontainers); valida status, contrato y scoping. |
| Contrato OpenAPI | **Vitest** + `@apidevtools/swagger-parser` + validador de respuestas contra `04-api/openapi.yaml` | Cada respuesta de endpoint valida contra el schema declarado. |
| Modelo relacional / migraciones | **Vitest** + Prisma Client contra DB efímera (Testcontainers Postgres 16 + Timescale) | Aplica migraciones desde cero; prueba constraints, triggers, hypertable. |
| Frontend componentes | **Vitest** + **@testing-library/react** + MSW (mock de API) | Estados loading/empty/error/offline por componente. |
| End-to-end | **Playwright** | Flujos completos en navegador (onboarding, dashboard, control) contra entorno levantado. |
| Carga / SLO (NFR) | **k6** (API/reportes), generador MQTT (ingesta) | Percentiles p95/p99; throughput de ingesta. |
| Seguridad estática | **ESLint**, **Semgrep**, secret-scan (gitleaks) en CI | NFR-006/039. |

Entornos: DB efímera por suite vía **Testcontainers** (Postgres 16 con extensión TimescaleDB); broker MQTT (EMQX) en contenedor para integración IoT; MSW para aislar el frontend de la red.

## 2. Cobertura objetivo

| Ámbito | Cobertura objetivo | Bloqueo CI |
|---|---|---|
| Servicios de dominio (`apps/api/.../*Service`) | ≥ 85% líneas / ≥ 80% ramas | Sí |
| Endpoints críticos (auth, onboarding, telemetría, control, dashboard) | 100% de endpoints con ≥1 happy path + ≥1 caso de error + ≥1 caso de autorización | Sí |
| Lógica de costo (`BillingService.computeCost`) | 100% ramas (con/sin tarifa) | Sí |
| Componentes frontend de datos | 100% renderizan estados loading/empty/error | Sí |
| Migraciones Prisma | aplican desde cero en CI (NFR-041) | Sí |
| E2E flujos clave | onboarding, dashboard, control (≥1 escenario c/u) | Sí (gate de release) |

## 3. Criterios mínimos de aceptación de calidad (gates de CI)

Estos gates son **bloqueantes**; ningún merge a la rama base los puede saltar.

1. **No se acepta implementación sin tests para endpoints críticos.** Auth, onboarding (scan/claim/pair), `POST /iot/telemetry`, dashboard, control y `/alerts/{id}/review` requieren suite de integración (happy + error + authz) antes de merge.
2. **No se acepta modelo de datos sin migración.** Todo cambio de esquema entra como migración Prisma versionada que aplica desde cero en CI (NFR-041). PR que toque tablas sin migración → rechazado.
3. **No se acepta endpoint sin contrato OpenAPI.** Cada endpoint nuevo/modificado debe estar en `04-api/openapi.yaml` y pasar la validación de contrato (request/response). Endpoint sin operationId en OpenAPI → rechazado.
4. **No se acepta pantalla sin estado empty/error/loading.** Toda página de datos (`/dashboard`, `/reports`, `/breakdown`, `/control`, `/alerts`, etc.) debe renderizar `Skeleton`, `EmptyState` y `ErrorState` (NFR-018, FR-DASH-007). Test de RTL que cubra los tres estados → obligatorio.
5. **No se acepta control de dispositivo sin auditoría.** Toda `control_action` (incluida la `rejected`) debe producir exactamente un `audit_logs` (NFR-013). Test que verifique el registro de auditoría → obligatorio para CTRL.
6. **No se acepta cálculo de CLP fuera de backend.** Lint/revisión: el frontend nunca computa montos; con `tariff_configured=false` los `*_clp` van `null` (canon, NFR-040).
7. Lint + typecheck + secret-scan en verde (NFR-039, NFR-006).

## 4. Pruebas unitarias (servicios de dominio)

Por cada servicio de `06-backend/services.md`, con repos y event-bus mockeados:

- **AuthService:** hash Argon2id; email existente → error genérico; login inválido → 401 genérico; rotación/revocación de refresh; throttling (NFR-004).
- **OrganizationService:** no degradar/revocar último `owner`; unicidad `(user_id, organization_id)`.
- **InstallationService:** `segment` determina shape de perfil; cambio de tarifa/estado emite audit.
- **OnboardingService:** `scanKit` (unclaimed→ok / inexistente→404 / retired→409); `claimKit` rechaza kit ya `active` en otra instalación; `pairDevice` respeta `UNIQUE(kit_id, external_ref)`.
- **DeviceService:** `markSeen` actualiza `last_seen_at`+`state=online`; `markOffline`.
- **TelemetryIngestionService:** validación de no-negativos, `power_factor ∈ [-1,1]`, `source_timestamp` no futuro; `event_hash` idempotente (accepted/duplicate/invalid); device inválido → invalid.
- **EnergyAggregationService:** rollup determinista; recompute idempotente por clave de agregado.
- **BillingService:** `computeCost` → `cost_clp` con tarifa, `null` + `tariff_configured=false` sin tarifa; `period_end ≥ period_start`; no-negativos.
- **TariffService:** `getEffectiveTariff` por `valid_from/valid_to`; precios no negativos.
- **AlertService:** dedup mientras `open`; severidad obligatoria; `estimated_impact_clp` solo vía BillingService.
- **RecommendationService:** `estimated_saving_clp` omitido sin tarifa; orden por prioridad.
- **ControlService:** `viewer` → `rejected`+403+audit; `operator|admin|owner` → `pending`; `resolveAction` idempotente ante ACK duplicado; validación de solapamiento en `createSchedule`; límites positivos.
- **AuditService:** solo INSERT (interfaz no expone update/delete).
- **NotificationService:** canal del enum; despacho tras puerto.

## 5. Pruebas de integración API (Supertest)

Por grupo de endpoints de `04-api/api-overview.md`. Cada endpoint: happy path + casos de error + caso de autorización/tenant.

- **Auth:** `POST /auth/register` (nuevo→user+org+owner; existente→409); `POST /auth/login` (válido→tokens; inválido→401; N fallos→throttle); `POST /auth/logout` (refresh no renueva); `GET /auth/me`.
- **Organizations / Installations:** `GET /organizations` solo orgs con membership; `POST /installations` solo admin/owner; `GET/PATCH /installations/{id}` ajena→403/404; PATCH de tarifa/estado → audit.
- **Onboarding:** `POST /onboarding/kit/scan`, `/kit/claim` (409 `KIT_ALREADY_CLAIMED`), `/devices/pair`, `GET /onboarding/status`.
- **Devices:** list/create/get/patch con scoping y `UNIQUE(kit_id, external_ref)`.
- **Telemetry:** `POST /iot/telemetry` (token de kit; accepted/duplicate/invalid; `Idempotency-Key`); `telemetry/latest`; `telemetry/range` (`from>to` → 422 `INVALID_RANGE`).
- **Dashboard:** `GET .../dashboard` (datos vivos; sin datos → empty payload con `tariff_configured`).
- **Reports / Breakdown:** daily/weekly/monthly/last-three-months; breakdown `groupBy=device|category` (total = Σ items; %≈100).
- **Bills:** `POST .../bills` (`period_end ≥ period_start`, `file_url`); `GET .../bills` filtro `status`.
- **Alerts / Recommendations:** list con filtros y orden por severidad; `PATCH /alerts/{id}/review` (open→reviewed/dismissed, `reviewed_by/at`); recommendations sin CLP sin tarifa.
- **Control:** `POST /devices/{deviceId}/control-actions` (202 pending / viewer 403+audit); `/control-schedules` (solapamiento); `/consumption-limits` (positivos, `pre_alert_pct` 1..100); `GET /control-state`.

## 6. Validación de modelo relacional (constraints / migraciones)

Contra DB efímera con migraciones aplicadas desde cero:

- **Integridad referencial:** FKs `ON DELETE RESTRICT`/`CASCADE` según `relational-model.md`; insertar `devices` con `kit_id` inexistente → error.
- **No-negatividad / dominio:** `CHECK >= 0` en `consumption_kwh`, `total_clp`, `active_power_w`, `energy_kwh`, `energy_price_clp_kwh`; `power_factor BETWEEN -1 AND 1`; `pre_alert_pct BETWEEN 1 AND 100`; `limit_kwh > 0`, `limit_power_w > 0`.
- **Unicidad:** `users.email` (citext); `memberships(user_id, organization_id)`; `energy_kits.qr_code`; `devices(kit_id, external_ref)`; `telemetry_readings.event_hash`; `energy_aggregates(installation_id, device_id, category_id, granularity, bucket_start)`; `tariffs(distributor_id, code, valid_from)`.
- **Coherencia de fechas:** `electricity_bills CHECK(period_end >= period_start)`.
- **Kit único activo:** a lo sumo una fila `energy_kits.status='active'` por `serial` (constraint parcial).
- **Hypertable Timescale:** `telemetry_readings` es hypertable particionada por `source_timestamp`; políticas de compresión/retención presentes (NFR-026/033).
- **Append-only audit:** trigger que bloquea UPDATE/DELETE en `audit_logs` (NFR-014); intento → error.
- **Migraciones reproducibles:** `prisma migrate deploy` desde cero en CI sin error (NFR-041); seed de desarrollo aplica.

## 7. Autorización (RBAC + no cross-tenant)

- **Matriz RBAC (FR-AUTH-009 / NFR-003):** por cada capacidad de la matriz, un rol sin permiso → 403 sin mutar estado. Casos clave: `viewer` no controla (FR-CTRL-009), no carga boleta, no edita perfil; `operator` no gestiona usuarios; solo `owner` cambia plan.
- **No cross-tenant (NFR-001):** por cada endpoint con datos de tenant, actor de org A solicita recurso de org B → 403/404 (nunca 200 con datos ajenos). Suite parametrizada por endpoint.
- **Confidencialidad instalador IoT (NFR-012):** rol instalador no obtiene lecturas energéticas del tenant.
- **Secretos (NFR-006):** ningún secreto en frontend; `file_url` de boleta solo accesible con autorización del tenant (NFR-005).

## 8. Ingestión IoT (idempotencia, validación, duplicados)

Contra `POST /iot/telemetry` (token de kit) y `TelemetryIngestionService`:

- **Idempotencia (NFR-028):** misma lectura (mismo `event_hash`) enviada 2 veces → 1 fila persistida, 2ª respuesta `ingestion_status=duplicate` (`duplicate=true`), sin impacto en agregados. `Idempotency-Key` repetida → mismo resultado sin re-ejecutar.
- **Validación / rangos (NFR-031):** consumo/potencia negativos, `power_factor` fuera de `[-1,1]`, `source_timestamp` excesivamente futuro → `422` `ingestion_status=invalid`, no se inserta.
- **Validez referencial (NFR-030):** `device_id` inexistente/retirado → `invalid`, no contamina agregados.
- **Doble timestamp (NFR-029):** toda lectura persiste `source_timestamp` y `received_timestamp`; `received_timestamp >= source_timestamp` en caso normal; skew excesivo observable.
- **Resiliencia / reconexión (NFR-017):** corte y reconexión del kit → todas las lecturas en buffer ingeridas una sola vez (0 duplicados).
- **markSeen:** ingesta exitosa actualiza `devices.last_seen_at` y `state=online`.

## 9. Dashboard

- `GET .../dashboard`: con telemetría reciente → `live_power_w`, `energy_today_kwh`, `kit_state`, `open_alerts`; con tarifa → `cost_today_clp`, sin tarifa → `null` + `tariff_configured=false` (FR-DASH-001/002/003/005/006).
- WebSocket en vivo (NFR-022): lectura ingerida se refleja en el stream del dashboard.
- Empty state (FR-DASH-007 / NFR-018): instalación nueva sin datos → payload vacío usable; UI muestra `EmptyState`, no error.
- `energy_today_kwh` = suma de agregados `day` del día (consistencia).

## 10. Reportes

- daily/weekly/monthly/last-three-months: serie de buckets con `energy_kwh` y `cost_clp` (CLP solo con tarifa).
- last-three-months con < 3 meses de historial → devuelve los disponibles (no inventa).
- Rango inválido (`from>to`) → 422 `INVALID_RANGE`.
- Servido desde `energy_aggregates` dentro de SLO (NFR-020/023): reporte de 3 meses p95 ≤ 300 ms.
- ReportChart renderiza serie y estados loading/empty.

## 11. Desglose (breakdown)

- `groupBy=device` y `groupBy=category`: items con `energy_kwh`/`cost_clp` y `pct`.
- Total = suma de items (FR-BRK-005); Σ pct ≈ 100 ±redondeo (FR-BRK-003).
- Ranking desc por kWh (FR-BRK-004).
- `total=0` → `DeviceBreakdownChart` delega a `EmptyState`.

## 12. Alertas

- Generación: `anomaly`, `high_device` (con `device_id`), `over_budget` (con `estimated_impact_clp` solo si hay tarifa), `offline`.
- Dedup mientras `open` (AlertService.raise).
- Orden por severidad (critical→info); filtros status/severity/type.
- `PATCH /alerts/{id}/review`: open→reviewed/dismissed, `reviewed_by/at`; baja el contador del dashboard (FR-DASH-006).
- `AlertList`/`SeverityBadge` ordenan por severidad; estados loading/empty.

## 13. Recomendaciones

- `fromAlert` (source=alert) y `runPeriodicAnalysis` (source=periodic_analysis).
- `estimated_saving_clp` solo con tarifa; sin tarifa el campo se omite (no se inventa) → `RecommendationCard` oculta CLP.
- Orden por prioridad/impacto; apply/dismiss desde `new`.

## 14. Control remoto (con auditoría)

- `operator|admin|owner` → `control_actions` `pending`, downlink MQTT, **audit_logs registrado** (NFR-013); resolución async `success|failed` (`resolveAction` idempotente ante ACK duplicado, FR-CTRL-008).
- `viewer` → 403, **sin comando MQTT**, intento `rejected` **auditado** (FR-CTRL-009, NFR-003).
- `ControlSchedule`: valida solapamientos; ejecuciones generan `ControlAction` auditada.
- `ConsumptionLimit`: positivos, `pre_alert_pct` 1..100; al exceder → `Alert` y/o `turn_off` (salvo equipo crítico, FR-PROF-005).
- `ControlToggle`: optimistic update, estado `pending` hasta `control.resolved`, rollback en `failed`; deshabilitado para `viewer`.
- `ControlActionLog`: append-only, muestra actor/tipo/estado/timestamps.

## 15. Frontend UI (loading / empty / error / offline)

Por cada página de datos y componente conectado:

- **loading:** `Skeleton` mientras la query está `pending`.
- **empty:** `EmptyState` con CTA cuando no hay datos (dashboard nuevo, breakdown total=0, sin alertas).
- **error:** `ErrorState` que distingue `unauthorized|forbidden|server|network` con reintento.
- **offline:** `OfflineBanner` persistente; mutaciones (control, carga de boleta) bloqueadas offline (NFR-018).
- **RBAC en UI:** controles de `/control` y `/smart-control` deshabilitados para `viewer`; secciones de `/settings` según rol.
- **CLP:** `CostCard`/`RecommendationCard` con `tariff_configured=false` o `*_clp=null` → CTA/oculta, nunca un valor inventado.

## 16. End-to-end (Playwright)

- **Onboarding completo:** register → scan-kit → claim → pair-devices → installation-type → profile (home/smb/business) → bill-upload → redirección a `/dashboard`; reanudación vía `GET /onboarding/status` (FR-ONB-007).
- **Dashboard en vivo:** instalación con kit activo emitiendo telemetría → gauge y kWh/CLP actualizan vía WebSocket.
- **Control:** `operator` enciende/apaga un device → estado refleja `pending`→`success` y aparece en la bitácora; `viewer` ve el toggle deshabilitado y recibe 403 al forzar.
- **Cross-tenant:** usuario de org A no puede navegar a recursos de org B (403/404).
- **Empty/offline:** instalación nueva muestra empty states; simular offline muestra banner y bloquea control.

## 17. Pruebas no funcionales (SLO)

- **Latencia lecturas (NFR-020/023):** k6 sobre dashboard/reportes/desglose; p95 ≤ 300 ms, p99 ≤ 800 ms.
- **Ingesta (NFR-021):** generador MQTT; p95 broker→persistencia ≤ 2 s; ≥ 1.000 lecturas/s por nodo bridge.
- **WebSocket (NFR-022):** lectura→render p95 ≤ 2 s.
- **Frontend (NFR-024):** Lighthouse LCP ≤ 2.5 s en 4G.
- **Escalado (NFR-025/027):** stateless; queries de tenant usan índices (EXPLAIN sin full scan).
- **Cabeceras (NFR-009):** escáner de seguridad calificación A.

## 18. Trazabilidad

Cada caso de prueba referencia su FR/NFR. La cobertura FR↔prueba y NFR↔prueba se mantiene en `validation-matrix.md` (NFR/invariantes) y `traceability-matrix.md` (pantalla→FR→entidad→tabla→endpoint→componente→servicio→prueba). El criterio de cierre de cada fase (`09-implementation-plan/roadmap.md`) exige actualizar estas matrices.
