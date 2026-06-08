/**
 * Schemas Zod de Device / EnergyKit / DevicePairing.
 * Fuente: `specs/02-domain/domain-model.md` (Device, EnergyKit, DevicePairing).
 */
import { z } from 'zod';
import { uuid } from './common.js';
import { deviceStateValues, pairingStatusValues } from '../domain/enums.js';

export const deviceCapabilities = z.object({
  meter: z.boolean(),
  switch: z.boolean(),
});
// Tipo inferido del schema (alias para no chocar con la interfaz
// `DeviceCapabilities` de domain/types.ts; son estructuralmente iguales).
export type DeviceCapabilitiesInput = z.infer<typeof deviceCapabilities>;

export const createDevice = z.object({
  kitId: uuid,
  installationId: uuid,
  categoryId: uuid.optional(),
  name: z.string().min(1).max(200),
  externalRef: z.string().min(1).max(200),
  capabilities: deviceCapabilities,
});
export type CreateDevice = z.infer<typeof createDevice>;

export const updateDevice = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: uuid.optional(),
  capabilities: deviceCapabilities.optional(),
  state: z.enum(deviceStateValues as [string, ...string[]]).optional(),
});
export type UpdateDevice = z.infer<typeof updateDevice>;

/** Claim de un kit por QR a una instalación. */
export const claimEnergyKit = z.object({
  qrCode: z.string().min(1),
  installationId: uuid,
});
export type ClaimEnergyKit = z.infer<typeof claimEnergyKit>;

export const updateDevicePairing = z.object({
  status: z.enum(pairingStatusValues as [string, ...string[]]),
  deviceId: uuid.optional(),
  detail: z.unknown().optional(),
});
export type UpdateDevicePairing = z.infer<typeof updateDevicePairing>;
