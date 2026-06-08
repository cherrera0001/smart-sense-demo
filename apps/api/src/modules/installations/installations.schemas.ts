import { z } from 'zod';

/** Perfil opcional de la instalación (1:1). El segment se hereda de la instalación. */
export const installationProfileSchema = z
  .object({
    occupants: z.number().int().min(0).optional(),
    heatingSystem: z.string().min(1).optional(),
    criticalEquipment: z.record(z.unknown()).optional(),
    declaredPowerKw: z.number().min(0).optional(),
    operatingHours: z.record(z.unknown()).optional(),
    extra: z.record(z.unknown()).optional(),
  })
  .strip();

export const createInstallationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  segment: z.enum(['home', 'smb', 'business']),
  address: z.string().min(1).optional(),
  timezone: z.string().min(1).default('America/Santiago'),
  profile: installationProfileSchema.optional(),
});

/** PATCH: no permite cambiar organizationId ni segment. Requiere al menos 1 campo. */
export const patchInstallationSchema = z
  .object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    distributorId: z.string().uuid().optional(),
    tariffId: z.string().uuid().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debe incluir al menos un campo a actualizar',
  });

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateInstallationDto = z.infer<typeof createInstallationSchema>;
export type PatchInstallationDto = z.infer<typeof patchInstallationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
