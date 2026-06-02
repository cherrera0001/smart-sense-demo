# Hitos — SmartSense

> Deriva de `09-implementation-plan/roadmap.md`, `08-quality/{test-plan,validation-matrix,traceability-matrix}.md` y los specs de `01`–`07`.
> Cada hito tiene criterios **medibles**, dependencias y una definición de **"done"**. Los hitos se asocian a fases del roadmap. Estado inicial: todos `PENDIENTE`.

## Convención

- **ID:** `M-N` (N = nº de hito).
- **Done = Definición de Hecho:** condición binaria y verificable (no "debería funcionar"; requiere evidencia ejecutable: test verde / migración aplicada / matriz actualizada).
- **Medible:** métrica objetiva (cobertura, p95, conteo de gates).

---

## M-0 — Gobierno de specs y decisiones técnicas
- **Fase:** 0.
- **Dependencias:** —.
- **Criterios medibles:** specs `00`–`09` consistentes (0 IDs huérfanos entre FR/dominio/modelo/API/frontend/backend); ≥5 ADRs aprobados (enums, UUIDv7, agregados Timescale, monorepo, RBAC multi-tenant); 3 artefactos de calidad publicados (test-plan, validation-matrix con 45 NFR + 10 INV, traceability-matrix con 45 filas).
- **Done:** las matrices referencian solo IDs reales; ADRs versionados; gates de calidad definidos en CI (aún sin código).

## M-1 — Esquema y dominio operativos
- **Fase:** 1.
- **Dependencias:** M-0.
- **Criterios medibles:** 21/21 tablas en `schema.prisma`; `prisma migrate deploy` desde cero exitoso en CI; `telemetry_readings` es hypertable verificable; ≥1 test por categoría de constraint (referencial, no-negatividad, unicidad, append-only, period_end≥period_start); seeds de `device_categories`/`distributors`/`tariffs` cargan.
- **Done:** suite `db` verde; INV-6/7/8 y NFR-026/028/029/031/032/041 a `EN PROGRESO` en validation-matrix; monorepo pnpm + git inicializados.

## M-2 — Auth y RBAC multi-tenant
- **Fase:** 2.
- **Dependencias:** M-1.
- **Criterios medibles:** 4 endpoints de auth + `/organizations` operativos; access token TTL ≤15 min; refresh revocado no renueva (test); 100% endpoints mutadores con check de rol; suite cross-tenant: actor org A → 403/404 a org B en cada endpoint con datos de tenant (0 fugas).
- **Done:** integ auth/org verde; NFR-001/002/003 a `EN PROGRESO`/`VALIDADO`; throttling de login probado (NFR-004).

## M-3 — Onboarding kit→devices end-to-end (API)
- **Fase:** 2.
- **Dependencias:** M-2.
- **Criterios medibles:** scan (200/404/409), claim (happy + 409 `KIT_ALREADY_CLAIMED` + audit), pair (UNIQUE(kit_id,external_ref)), status reanudable; instalación y perfil por segmento vía PATCH.
- **Done:** integ onboarding verde; claim auditado (INV-3/NFR-013); matriz filas 7–14 a `EN PROGRESO`.

## M-4 — Ingestión IoT idempotente y agregados
- **Fase:** 3.
- **Dependencias:** M-1, M-3.
- **Criterios medibles:** `POST /iot/telemetry` accepted/duplicate/invalid; misma lectura 2× → 1 fila persistida; `device_id` inválido → invalid; rangos físicos validados; recompute de bucket determinista (mismos valores y cardinalidad); doble timestamp persistido.
- **Done:** suite `iot` verde; INV-2/6/7 y NFR-028/029/030/031/032 a `VALIDADO`; matriz fila 45 a `VALIDADO`.

## M-5 — Reportes y costo en backend
- **Fase:** 3.
- **Dependencias:** M-4.
- **Criterios medibles:** daily/weekly/monthly/last-three-months servidos desde `energy_aggregates`; `computeCost` → CLP con tarifa y `null`+`tariff_configured=false` sin tarifa (100% ramas); reporte 3 meses p95 ≤300 ms (smoke); `from>to` → 422.
- **Done:** integ reports verde; INV-4 y NFR-020/023 a `EN PROGRESO`; matriz filas 21, 23–25 a `EN PROGRESO`.

## M-6 — Shell, dashboard en vivo y estados UI
- **Fase:** 4.
- **Dependencias:** M-2, M-5.
- **Criterios medibles:** layouts y `AppSidebar`/`InstallationSwitcher` operativos; dashboard con gauge/costo/estado kit/alertas; WebSocket lectura→render p95 ≤2 s; 100% pantallas de datos con loading/empty/error/offline (RTL).
- **Done:** RTL estados verde; e2e dashboard en vivo; INV-10 y NFR-018/022/024 a `EN PROGRESO`/`VALIDADO`; matriz filas 19–22 a `EN PROGRESO`.

## M-7 — Onboarding y boleta (frontend) completo
- **Fase:** 4.
- **Dependencias:** M-3, M-6.
- **Criterios medibles:** wizard completo (scan→pair→tipo→perfil→boleta) con OnboardingStepper y reanudación; BillUploader bloqueado offline; CLP nunca calculado en cliente.
- **Done:** e2e onboarding completo → redirige a `/dashboard`; matriz filas 7–18 con cobertura UI.

## M-8 — Desglose, alertas y recomendaciones
- **Fase:** 5.
- **Dependencias:** M-5, M-6.
- **Criterios medibles:** breakdown total=Σitems y Σ%≈100; alertas con dedup y orden por severidad; review baja contador dashboard; recomendaciones sin CLP cuando no hay tarifa.
- **Done:** unit/integ verdes; matriz filas 26–31 a `VALIDADO`; FR-BRK/ALRT/REC cubiertos.

## M-9 — Control auditado y validado
- **Fase:** 6.
- **Dependencias:** M-3, M-4, M-8.
- **Criterios medibles:** `operator|admin|owner` → 202 pending + audit; `viewer` → 403 sin downlink MQTT + rejected auditado; resolveAction idempotente ante ACK duplicado; schedules sin solapamiento; límites positivos con pre_alert_pct 1..100; equipo crítico no se apaga automáticamente.
- **Done:** authz/integ/unit verdes; INV-3/5 y NFR-003/013/014 a `VALIDADO`; matriz filas 32–37 a `VALIDADO`.

## M-10 — Hardening y release candidate
- **Fase:** 7.
- **Dependencias:** M-1..M-9.
- **Criterios medibles:** 45/45 NFR e INV-1..10 en `VALIDADO`; cabeceras seguridad calificación A; secret-scan/SAST en verde; SLO de carga (NFR-020/021/022/023) dentro de objetivo; backups verificados (NFR-019); E2E suite completa verde.
- **Done:** todos los gates de `test-plan.md §3` cumplidos; documentación de despliegue lista; RC desplegable.

---

## Dependencias entre hitos (orden topológico)

```
M-0 → M-1 → M-2 → M-3
                M-1 ─┐
                M-3 ─┴→ M-4 → M-5 → M-6 → M-7
                                    M-5 ─┐
                                    M-6 ─┴→ M-8 → M-9 → M-10
```

- M-4 requiere M-1 (hypertable) y M-3 (devices reclamados).
- M-6 requiere M-2 (auth) y M-5 (datos de reportes/dashboard).
- M-9 requiere M-3/M-4 (devices/telemetría) y M-8 (alertas para pre-alerta/over_budget).
- M-10 cierra todos.

## Asociación hito ↔ fase

| Hito | Fase | Entregable núcleo |
|---|---|---|
| M-0 | 0 | specs/ADRs/matrices/plan de pruebas |
| M-1 | 1 | esquema + migraciones + seeds + tests integridad |
| M-2 | 2 | auth + RBAC + cross-tenant |
| M-3 | 2 | onboarding API |
| M-4 | 3 | ingestión IoT idempotente + agregados |
| M-5 | 3 | reportes + costeo backend |
| M-6 | 4 | shell + dashboard vivo + estados UI |
| M-7 | 4 | onboarding/boleta frontend |
| M-8 | 5 | desglose + alertas + recomendaciones |
| M-9 | 6 | control auditado |
| M-10 | 7 | hardening + RC |
