import { z } from 'zod';

/** Body de POST /organizations. Espejo de OrganizationCreate (openapi.yaml). */
export const createOrgSchema = z.object({
  name: z.string().min(1),
  legalId: z.string().min(1).optional(),
  segmentDefault: z.enum(['home', 'smb', 'business']).optional(),
});
export type CreateOrgInput = z.infer<typeof createOrgSchema>;

/** Param de path :id (UUID del recurso). */
export const idParamSchema = z.object({
  id: z.string().uuid(),
});
export type IdParam = z.infer<typeof idParamSchema>;
