-- Fase 6 — migración aditiva (no destructiva): soporte de idempotencia y dry-run en control.
-- Solo añade 2 columnas + 1 índice único parcial a "control_actions". No altera enums ni datos.
-- Ver docs/audit/phase-6-control-data-model-audit.md.

ALTER TABLE "control_actions"
  ADD COLUMN IF NOT EXISTS "idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "dry_run" boolean NOT NULL DEFAULT true;

-- Idempotencia: una acción por (device_id, idempotency_key) cuando la clave está presente.
CREATE UNIQUE INDEX IF NOT EXISTS "control_actions_device_idem_key"
  ON "control_actions" ("device_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
