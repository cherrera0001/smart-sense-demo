-- Fase 7 (Hardening) — migración aditiva (no destructiva): refresh-token rotation.
-- Crea la tabla "refresh_tokens" para persistir refresh tokens hasheados con rotación
-- y detección de reuso (revoked_at / replaced_by_jti). No altera enums ni datos existentes.

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id"               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"          uuid        NOT NULL,
  "token_hash"       text        NOT NULL,
  "jti"              text        NOT NULL,
  "expires_at"       timestamptz NOT NULL,
  "revoked_at"       timestamptz,
  "replaced_by_jti"  text,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "refresh_tokens_jti_key" UNIQUE ("jti"),
  CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_jti_idx" ON "refresh_tokens" ("jti");
