import { z } from 'zod';

/**
 * POST /onboarding/kit/scan — acepta `code` o `qrCode`; se normaliza a `qrCode`.
 * Requiere al menos uno de los dos.
 */
export const kitScanSchema = z
  .object({
    code: z.string().min(1).optional(),
    qrCode: z.string().min(1).optional(),
  })
  .strip()
  .transform((v) => ({ qrCode: v.qrCode ?? v.code }))
  .refine((v): v is { qrCode: string } => typeof v.qrCode === 'string' && v.qrCode.length > 0, {
    message: 'Debe incluir `qrCode` o `code`',
  });

/**
 * POST /onboarding/kit/claim — resuelve el kit por kitId o qrCode. Requiere installationId.
 */
export const kitClaimSchema = z
  .object({
    qrCode: z.string().min(1).optional(),
    kitId: z.string().uuid().optional(),
    installationId: z.string().uuid(),
  })
  .strip()
  .refine((v) => Boolean(v.kitId || v.qrCode), {
    message: 'Debe incluir `kitId` o `qrCode`',
  });

/** Dispositivo a emparejar. `externalRef` obligatorio (min 1). */
export const pairDeviceItemSchema = z
  .object({
    externalRef: z.string().min(1),
    name: z.string().min(1).optional(),
    categoryKey: z.string().min(1).optional(),
  })
  .strip();

/**
 * POST /onboarding/devices/pair — empareja N dispositivos contra un kit.
 */
export const devicePairSchema = z
  .object({
    kitId: z.string().uuid(),
    devices: z.array(pairDeviceItemSchema).min(1),
  })
  .strip();

/** GET /onboarding/status?installationId=uuid */
export const onboardingStatusQuerySchema = z.object({
  installationId: z.string().uuid(),
});

export type KitScanDto = z.infer<typeof kitScanSchema>;
export type KitClaimDto = z.infer<typeof kitClaimSchema>;
export type PairDeviceItem = z.infer<typeof pairDeviceItemSchema>;
export type DevicePairDto = z.infer<typeof devicePairSchema>;
export type OnboardingStatusQuery = z.infer<typeof onboardingStatusQuerySchema>;
