/**
 * Schemas Zod de Installation / InstallationProfile.
 * Fuente: `specs/02-domain/domain-model.md` (Installation, InstallationProfile).
 */
import { z } from 'zod';
import { uuid } from './common.js';
import { installationSegmentValues } from '../domain/enums.js';

const segment = z.enum(installationSegmentValues as [string, ...string[]]);

export const createInstallation = z.object({
  organizationId: uuid,
  name: z.string().min(1).max(200),
  segment,
  address: z.string().max(500).optional(),
  timezone: z.string().default('America/Santiago'),
  distributorId: uuid.optional(),
  tariffId: uuid.optional(),
});
export type CreateInstallation = z.infer<typeof createInstallation>;

export const updateInstallation = createInstallation
  .partial()
  .omit({ organizationId: true })
  .extend({
    status: z.enum(['active', 'inactive']).optional(),
  });
export type UpdateInstallation = z.infer<typeof updateInstallation>;

export const upsertInstallationProfile = z.object({
  installationId: uuid,
  segment,
  occupants: z.number().int().nonnegative().optional(),
  heatingSystem: z.string().max(200).optional(),
  criticalEquipment: z.unknown().optional(),
  declaredPowerKw: z.number().nonnegative().optional(),
  operatingHours: z.unknown().optional(),
  extra: z.record(z.unknown()).optional(),
});
export type UpsertInstallationProfile = z.infer<
  typeof upsertInstallationProfile
>;
