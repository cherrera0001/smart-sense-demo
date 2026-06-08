/**
 * Branded types para identificadores de dominio.
 *
 * Cada entidad del canon (`specs/_canon.md`, tabla de 21 entidades) tiene su
 * propio tipo de ID nominal. El branding evita que un `UserId` se use por error
 * donde se espera un `DeviceId`, aunque ambos sean `string` en runtime (UUID v7,
 * salvo telemetría cuya PK lógica incluye `reading_id`).
 *
 * En runtime un ID branded ES un `string`; el `__brand` es puramente de tipos
 * (se borra al compilar). Usa `asId<B>(v)` para construirlos de forma explícita.
 */

type Brand<T, B> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type MembershipId = Brand<string, 'MembershipId'>;
export type InstallationId = Brand<string, 'InstallationId'>;
export type InstallationProfileId = Brand<string, 'InstallationProfileId'>;
export type EnergyKitId = Brand<string, 'EnergyKitId'>;
export type DeviceId = Brand<string, 'DeviceId'>;
export type DeviceCategoryId = Brand<string, 'DeviceCategoryId'>;
export type DevicePairingId = Brand<string, 'DevicePairingId'>;
export type TelemetryReadingId = Brand<string, 'TelemetryReadingId'>;
export type EnergyAggregateId = Brand<string, 'EnergyAggregateId'>;
export type ElectricityBillId = Brand<string, 'ElectricityBillId'>;
export type TariffId = Brand<string, 'TariffId'>;
export type DistributorId = Brand<string, 'DistributorId'>;
export type AlertId = Brand<string, 'AlertId'>;
export type RecommendationId = Brand<string, 'RecommendationId'>;
export type ControlActionId = Brand<string, 'ControlActionId'>;
export type ControlScheduleId = Brand<string, 'ControlScheduleId'>;
export type ConsumptionLimitId = Brand<string, 'ConsumptionLimitId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type AuditLogId = Brand<string, 'AuditLogId'>;

/**
 * Construye un ID branded a partir de un string ya validado (p. ej. UUID
 * verificado por Zod en el perímetro). No realiza validación: es un cast
 * nominal explícito que documenta la intención en el call-site.
 *
 * @example
 *   const id = asId<UserId>(row.id);
 */
export function asId<B extends Brand<string, unknown>>(v: string): B {
  return v as B;
}
