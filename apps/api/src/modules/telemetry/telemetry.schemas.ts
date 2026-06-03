/**
 * Schemas Zod del módulo telemetry (Fase 3 IoT).
 * Reutiliza los schemas canónicos de @smartsense/shared (ingest, range) para
 * mantener un único contrato entre device/bridge/API. El shape de respuesta de
 * `latest` se define localmente (no es parte del contrato de ingesta).
 */
import { z } from 'zod';
import {
  telemetryIngestSchema,
  telemetryIngestResult,
  telemetryRangeQuerySchema,
} from '@smartsense/shared';

export {
  telemetryIngestSchema,
  telemetryIngestResult,
  telemetryRangeQuerySchema,
};
export type { TelemetryIngest, TelemetryRangeQuery, TelemetryIngestResult } from '@smartsense/shared';

/** Path param de las rutas anidadas bajo installation. */
export const installationIdParamSchema = z.object({
  installationId: z.string().uuid(),
});

/** Shape de respuesta de GET .../telemetry/latest. */
export const telemetryLatestResponseSchema = z.object({
  installationId: z.string().uuid(),
  latestReading: z.unknown().nullable(),
  deviceCount: z.number().int().nonnegative(),
  receivedTimestamp: z.string().nullable(),
});

export type InstallationIdParam = z.infer<typeof installationIdParamSchema>;
export type TelemetryLatestResponse = z.infer<typeof telemetryLatestResponseSchema>;
