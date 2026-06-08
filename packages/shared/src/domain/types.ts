/**
 * Interfaces DTO de dominio (en inglés), alineadas con
 * `specs/02-domain/domain-model.md` y `specs/_canon.md`.
 *
 * Son contratos de transporte/compartidos (API <-> web), sin lógica de negocio
 * ni acoplamiento a la DB. Los montos en CLP son enteros (salvo precios de
 * tarifa, `numeric`); energía en kWh; potencia en W.
 *
 * Correspondencia con los tipos demo en español de `apps/web/lib/types.ts`
 * (NO se redefinen aquí, solo se documenta el mapeo para la migración):
 *   - Tarifa            -> Tariff
 *   - Enchufe           -> Device (estado 'reconectando' del demo ~ DeviceState.Unknown)
 *   - FirmaElectrica    -> desglose por DeviceCategory + EnergyAggregate (no es una entidad)
 *   - Alerta            -> Alert / Recommendation (el demo mezcla ambos: 'tip'/'sugerencia' -> Recommendation)
 *   - ConsumoHoy        -> proyección sobre EnergyAggregate (granularity hour/day)
 *   - ReporteSemanal    -> EnergyAggregate (granularity week)
 */

import type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  AggregateGranularity,
  BillStatus,
  ControlActionStatus,
  ControlActionType,
  DeviceState,
  InstallationSegment,
  MembershipRole,
  NotificationChannel,
  PairingStatus,
  RecommendationSource,
} from './enums.js';
import type {
  AlertId,
  AuditLogId,
  ConsumptionLimitId,
  ControlActionId,
  ControlScheduleId,
  DeviceCategoryId,
  DeviceId,
  DevicePairingId,
  DistributorId,
  ElectricityBillId,
  EnergyAggregateId,
  EnergyKitId,
  InstallationId,
  InstallationProfileId,
  MembershipId,
  NotificationId,
  OrganizationId,
  RecommendationId,
  TariffId,
  UserId,
} from './ids.js';

/** ISO-8601 timestamp string (UTC). Serialización de `timestamptz`. */
export type IsoTimestamp = string;

/** Campos de auditoría comunes a entidades raíz. */
export interface Timestamps {
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** JSON arbitrario (columnas jsonb). */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

// --- User ---
export type UserStatus = 'active' | 'suspended';
export interface User extends Timestamps {
  id: UserId;
  email: string;
  fullName: string;
  phone?: string | null;
  locale: string; // default 'es-CL'
  status: UserStatus;
  lastLoginAt?: IsoTimestamp | null;
  // password_hash NUNCA viaja en un DTO de salida.
}

// --- Organization ---
export type OrganizationPlan = 'free' | 'pro' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended';
export interface Organization extends Timestamps {
  id: OrganizationId;
  name: string;
  legalId?: string | null; // RUT
  segmentDefault?: InstallationSegment | null;
  plan: OrganizationPlan;
  status: OrganizationStatus;
}

// --- Membership ---
export type MembershipStatus = 'active' | 'invited' | 'revoked';
export interface Membership extends Timestamps {
  id: MembershipId;
  userId: UserId;
  organizationId: OrganizationId;
  role: MembershipRole;
  status: MembershipStatus;
  invitedAt?: IsoTimestamp | null;
  acceptedAt?: IsoTimestamp | null;
}

// --- Installation ---
export type InstallationStatus = 'active' | 'inactive';
export interface Installation extends Timestamps {
  id: InstallationId;
  organizationId: OrganizationId;
  name: string;
  segment: InstallationSegment;
  address?: string | null;
  timezone: string; // default 'America/Santiago'
  distributorId?: DistributorId | null;
  tariffId?: TariffId | null;
  status: InstallationStatus;
}

// --- InstallationProfile ---
export interface InstallationProfile extends Timestamps {
  id: InstallationProfileId;
  installationId: InstallationId;
  segment: InstallationSegment;
  occupants?: number | null;
  heatingSystem?: string | null;
  criticalEquipment?: JsonValue | null; // jsonb
  declaredPowerKw?: number | null;
  operatingHours?: JsonValue | null; // jsonb
  extra?: JsonObject | null; // jsonb específico por segmento
}

// --- EnergyKit ---
export type EnergyKitStatus =
  | 'unclaimed'
  | 'active'
  | 'transferring'
  | 'retired';
export interface EnergyKit extends Timestamps {
  id: EnergyKitId;
  installationId?: InstallationId | null; // NULL hasta claim
  qrCode: string;
  serial: string;
  model: string;
  firmwareVersion?: string | null;
  status: EnergyKitStatus;
  claimedAt?: IsoTimestamp | null;
}

// --- Device (demo: Enchufe) ---
export interface DeviceCapabilities {
  meter: boolean;
  switch: boolean;
}
export interface Device extends Timestamps {
  id: DeviceId;
  kitId: EnergyKitId;
  installationId: InstallationId; // denormalizado para scoping
  categoryId?: DeviceCategoryId | null;
  name: string;
  externalRef: string; // id en el kit/broker
  capabilities: DeviceCapabilities; // jsonb
  state: DeviceState;
  lastSeenAt?: IsoTimestamp | null;
}

// --- DeviceCategory (catálogo global) ---
export interface DeviceCategory {
  id: DeviceCategoryId;
  key: string;
  name: string;
  icon?: string | null;
  typicalPowerW?: number | null;
}

// --- DevicePairing ---
export interface DevicePairing extends Timestamps {
  id: DevicePairingId;
  kitId: EnergyKitId;
  deviceExternalRef: string;
  status: PairingStatus;
  deviceId?: DeviceId | null;
  detail?: JsonValue | null; // jsonb
}

// --- EnergyAggregate ---
export interface EnergyAggregate {
  id: EnergyAggregateId;
  installationId: InstallationId;
  deviceId?: DeviceId | null;
  categoryId?: DeviceCategoryId | null;
  granularity: AggregateGranularity;
  bucketStart: IsoTimestamp;
  energyKwh: number;
  costClp: number; // entero CLP, calculado en backend
  peakPowerW?: number | null;
  recomputedAt: IsoTimestamp;
}

// --- ElectricityBill ---
export interface ElectricityBill extends Timestamps {
  id: ElectricityBillId;
  installationId: InstallationId;
  distributorId?: DistributorId | null;
  tariffId?: TariffId | null;
  clientNumber?: string | null;
  periodStart: IsoTimestamp;
  periodEnd: IsoTimestamp;
  consumptionKwh: number;
  totalClp: number; // entero CLP
  fixedChargeClp?: number | null;
  variableChargeClp?: number | null;
  dueDate?: IsoTimestamp | null;
  fileUrl: string;
  status: BillStatus;
  rawExtraction?: JsonValue | null; // jsonb
}

// --- Tariff (demo: Tarifa) ---
export interface Tariff extends Timestamps {
  id: TariffId;
  distributorId?: DistributorId | null;
  code: string;
  name: string;
  segment?: InstallationSegment | null;
  energyPriceClpKwh: number; // numeric(12,4)
  fixedChargeClp?: number | null;
  demandChargeClpKw?: number | null;
  validFrom?: IsoTimestamp | null;
  validTo?: IsoTimestamp | null;
}

// --- Distributor ---
export interface Distributor extends Timestamps {
  id: DistributorId;
  name: string;
  country: string; // default 'CL'
  code?: string | null;
}

// --- Alert (demo: Alerta tipo 'anomalia') ---
export interface Alert extends Timestamps {
  id: AlertId;
  installationId: InstallationId;
  deviceId?: DeviceId | null;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  context?: JsonValue | null; // jsonb
  estimatedImpactClp?: number | null;
  reviewedBy?: UserId | null;
  reviewedAt?: IsoTimestamp | null;
}

// --- Recommendation (demo: Alerta tipo 'sugerencia'/'tip') ---
export type RecommendationStatus = 'new' | 'applied' | 'dismissed';
export interface Recommendation extends Timestamps {
  id: RecommendationId;
  installationId: InstallationId;
  alertId?: AlertId | null;
  source: RecommendationSource;
  title: string;
  description: string;
  estimatedSavingClp?: number | null; // se omite si no hay base tarifaria
  priority: number;
  status: RecommendationStatus;
}

// --- ControlAction ---
export interface ControlAction extends Timestamps {
  id: ControlActionId;
  deviceId: DeviceId;
  userId: UserId;
  type: ControlActionType;
  status: ControlActionStatus;
  payload?: JsonValue | null; // jsonb
  result?: JsonValue | null; // jsonb
  requestedAt: IsoTimestamp;
  resolvedAt?: IsoTimestamp | null;
}

// --- ControlSchedule ---
export type ControlScheduleAction = Extract<
  ControlActionType,
  'turn_on' | 'turn_off'
>;
export interface ControlSchedule extends Timestamps {
  id: ControlScheduleId;
  deviceId: DeviceId;
  action: ControlScheduleAction;
  cronOrRule: JsonValue; // jsonb
  enabled: boolean;
  createdBy: UserId;
}

// --- ConsumptionLimit ---
export type ConsumptionLimitWindow = 'day' | 'month';
export type ConsumptionLimitAction = 'alert' | 'turn_off';
export interface ConsumptionLimit extends Timestamps {
  id: ConsumptionLimitId;
  deviceId: DeviceId;
  limitKwh?: number | null;
  limitPowerW?: number | null;
  window: ConsumptionLimitWindow;
  preAlertPct?: number | null;
  actionOnExceed: ConsumptionLimitAction;
  enabled: boolean;
}

// --- Notification ---
export interface Notification extends Timestamps {
  id: NotificationId;
  organizationId: OrganizationId;
  installationId?: InstallationId | null;
  userId?: UserId | null;
  channel: NotificationChannel;
  title: string;
  body: string;
  readAt?: IsoTimestamp | null;
  relatedType?: string | null;
  relatedId?: string | null;
}

// --- AuditLog (append-only) ---
export interface AuditLog {
  id: AuditLogId;
  organizationId: OrganizationId;
  userId?: UserId | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: JsonValue | null; // jsonb
  after?: JsonValue | null; // jsonb
  ip?: string | null;
  createdAt: IsoTimestamp;
}
