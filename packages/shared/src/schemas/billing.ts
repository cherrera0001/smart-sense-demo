/**
 * Schemas Zod de Tariff / ElectricityBill / Distributor.
 * Fuente: `specs/02-domain/domain-model.md` (Tariff, ElectricityBill, Distributor).
 * Montos CLP enteros >=0; period_end >= period_start.
 */
import { z } from 'zod';
import { clpAmount, isoTimestamp, kwh, uuid } from './common.js';
import { billStatusValues, installationSegmentValues } from '../domain/enums.js';

export const createTariff = z.object({
  distributorId: uuid.optional(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  segment: z
    .enum(installationSegmentValues as [string, ...string[]])
    .optional(),
  energyPriceClpKwh: z.number().nonnegative(), // numeric(12,4)
  fixedChargeClp: clpAmount.optional(),
  demandChargeClpKw: z.number().nonnegative().optional(),
  validFrom: isoTimestamp.optional(),
  validTo: isoTimestamp.optional(),
});
export type CreateTariff = z.infer<typeof createTariff>;

export const createDistributor = z.object({
  name: z.string().min(1).max(200),
  country: z.string().length(2).default('CL'),
  code: z.string().max(50).optional(),
});
export type CreateDistributor = z.infer<typeof createDistributor>;

export const createElectricityBill = z
  .object({
    installationId: uuid,
    distributorId: uuid.optional(),
    tariffId: uuid.optional(),
    clientNumber: z.string().max(100).optional(),
    periodStart: isoTimestamp,
    periodEnd: isoTimestamp,
    consumptionKwh: kwh,
    totalClp: clpAmount,
    fixedChargeClp: clpAmount.optional(),
    variableChargeClp: clpAmount.optional(),
    dueDate: isoTimestamp.optional(),
    fileUrl: z.string().url(),
    rawExtraction: z.unknown().optional(),
  })
  .refine((b) => b.periodEnd >= b.periodStart, {
    message: 'period_end must be >= period_start',
    path: ['periodEnd'],
  });
export type CreateElectricityBill = z.infer<typeof createElectricityBill>;

export const updateBillStatus = z.object({
  status: z.enum(billStatusValues as [string, ...string[]]),
});
export type UpdateBillStatus = z.infer<typeof updateBillStatus>;
