import { z } from 'zod';

/** Capabilities libres (objeto). Por defecto {} si no se envía. */
const capabilitiesSchema = z.record(z.unknown());

export const createDeviceSchema = z.object({
  installationId: z.string().uuid(),
  kitId: z.string().uuid(),
  name: z.string().min(1),
  externalRef: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  categoryKey: z.string().min(1).optional(),
  capabilities: capabilitiesSchema.optional().default({}),
});

/** PATCH: no control remoto, no cambia kitId/installationId. Requiere al menos 1 campo. */
export const patchDeviceSchema = z
  .object({
    name: z.string().min(1).optional(),
    categoryId: z.string().uuid().optional(),
    state: z.enum(['online', 'offline', 'unknown']).optional(),
    capabilities: capabilitiesSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debe incluir al menos un campo a actualizar',
  });

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const installationIdParamSchema = z.object({
  installationId: z.string().uuid(),
});

export type CreateDeviceDto = z.infer<typeof createDeviceSchema>;
export type PatchDeviceDto = z.infer<typeof patchDeviceSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type InstallationIdParam = z.infer<typeof installationIdParamSchema>;
