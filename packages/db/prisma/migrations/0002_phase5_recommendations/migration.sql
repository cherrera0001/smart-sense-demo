-- Fase 5 — migración aditiva (no destructiva): soporte de recomendaciones enriquecidas.
-- Solo añade 2 columnas NULL a "recommendations". No altera enums ni datos existentes.
-- Ver docs/audit/phase-5-spec-readiness.md (reconciliación de divergencia).

ALTER TABLE "recommendations"
  ADD COLUMN IF NOT EXISTS "type" text,
  ADD COLUMN IF NOT EXISTS "estimated_saving_kwh" numeric(14,4);

-- CHECK no-negatividad del ahorro estimado en kWh (coherente con constraints del canon).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recommendations_saving_kwh_nonneg'
  ) THEN
    ALTER TABLE "recommendations"
      ADD CONSTRAINT "recommendations_saving_kwh_nonneg"
      CHECK ("estimated_saving_kwh" IS NULL OR "estimated_saving_kwh" >= 0);
  END IF;
END $$;
