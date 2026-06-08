# Plan de rollback — SmartSense F0–F7

> Fase 8. Procedimientos de reversión por componente. Connection strings con placeholders (`USER:PASSWORD@HOST`).
> Principio: las migraciones F0–F7 son **no destructivas**, por lo que el rollback principal es de **aplicación** (imagen/commit), no de esquema.

## 1. Web (Vercel)

- Revertir el deployment anterior (`Vercel → Deployments → Promote previous` o `vercel rollback`).
- Como la web demo es `DEMO_MODE`, el rollback no toca datos.
- Verificar tras el rollback que la web carga y que `NEXT_PUBLIC_API_URL` apunta al host correcto.

## 2. API (hosting Railway/Render/Fly)

- Redeploy de la **imagen/commit anterior** (la plataforma de hosting guarda releases previos).
- Las migraciones aditivas permiten que la API anterior funcione contra el esquema más nuevo (columnas extra ignoradas).
- Verificar `GET /healthz` → 200 y `GET /readyz` → 200 (DB ok) tras el rollback.

## 3. Base de datos (Neon)

- **No hay `down` destructivo** que aplicar: las 4 migraciones son aditivas.
- Ante corrupción de datos (no es el caso de F0–F7), **restaurar backup/branch de Neon** (punto-en-el-tiempo o branch creado antes del deploy). Ver `docs/deployment/database-migration-runbook.md §6`.
- Registrar el `branch_id`/timestamp del punto de restauración.

## 4. Secretos filtrados

Si se detecta filtración de un secreto:

- **Neon:** `ALTER ROLE … WITH PASSWORD` (rotación), actualizar `DATABASE_URL`/`DIRECT_URL` en el hosting, redeploy. (Procedimiento ya ejecutado en Fase 7 — `docs/security/phase-7-secret-rotation.md`.)
- **JWT:** regenerar `JWT_SECRET`/`JWT_REFRESH_SECRET` (invalida sesiones; los refresh tokens emitidos dejan de validar), redeploy.
- **Token iot-bridge / MQTT:** rotar `SMARTSENSE_API_TOKEN` / credenciales MQTT en el host.

## 5. Falla de seguridad

- Si un endpoint expone datos o rompe el aislamiento multi-tenant: **deshabilitar la API** (escalar a 0 réplicas / desactivar el servicio en el hosting) hasta el fix.
- La web demo (`DEMO_MODE`) puede seguir online sin la API.

## 6. Confirmar dry-run de control

- Tras cualquier rollback/redeploy, confirmar que el **control sigue en dry-run**: las acciones persisten `dry_run=true` y no hay downlink físico ni conexión a broker MQTT.
- iot-bridge debe permanecer en `IOT_BRIDGE_MODE=dry-run`.

## 7. Checklist de rollback ejecutado

- [ ] Componente revertido (web / API / DB) identificado y confirmado.
- [ ] `GET /healthz` y `/readyz` → 200.
- [ ] Smoke mínimo: login → dashboard.
- [ ] Control en dry-run confirmado.
- [ ] Secretos rotados si la causa fue filtración.
- [ ] Incidente y punto de restauración registrados.
