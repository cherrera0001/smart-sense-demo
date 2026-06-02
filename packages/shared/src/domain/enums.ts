/**
 * Enums canónicos de SmartSense.
 *
 * Fuente de verdad: `specs/_canon.md` (sección "Enums canónicos").
 * Patrón: objeto `as const` + tipo union derivado + array de valores.
 * NO modificar valores sin actualizar el canon (son contrato compartido API/DB/UI).
 */

// installation_segment: home | smb | business
export const InstallationSegment = {
  Home: 'home',
  Smb: 'smb',
  Business: 'business',
} as const;
export type InstallationSegment =
  (typeof InstallationSegment)[keyof typeof InstallationSegment];
export const installationSegmentValues = Object.values(InstallationSegment);

// membership_role: owner | admin | operator | viewer
export const MembershipRole = {
  Owner: 'owner',
  Admin: 'admin',
  Operator: 'operator',
  Viewer: 'viewer',
} as const;
export type MembershipRole =
  (typeof MembershipRole)[keyof typeof MembershipRole];
export const membershipRoleValues = Object.values(MembershipRole);

// pairing_status: paired | recommended | scanning | unpaired | error
export const PairingStatus = {
  Paired: 'paired',
  Recommended: 'recommended',
  Scanning: 'scanning',
  Unpaired: 'unpaired',
  Error: 'error',
} as const;
export type PairingStatus =
  (typeof PairingStatus)[keyof typeof PairingStatus];
export const pairingStatusValues = Object.values(PairingStatus);

// device_state: online | offline | unknown
export const DeviceState = {
  Online: 'online',
  Offline: 'offline',
  Unknown: 'unknown',
} as const;
export type DeviceState = (typeof DeviceState)[keyof typeof DeviceState];
export const deviceStateValues = Object.values(DeviceState);

// control_action_type: turn_on | turn_off | set_limit
export const ControlActionType = {
  TurnOn: 'turn_on',
  TurnOff: 'turn_off',
  SetLimit: 'set_limit',
} as const;
export type ControlActionType =
  (typeof ControlActionType)[keyof typeof ControlActionType];
export const controlActionTypeValues = Object.values(ControlActionType);

// control_action_status: pending | success | failed | rejected
export const ControlActionStatus = {
  Pending: 'pending',
  Success: 'success',
  Failed: 'failed',
  Rejected: 'rejected',
} as const;
export type ControlActionStatus =
  (typeof ControlActionStatus)[keyof typeof ControlActionStatus];
export const controlActionStatusValues = Object.values(ControlActionStatus);

// alert_severity: info | warning | critical
export const AlertSeverity = {
  Info: 'info',
  Warning: 'warning',
  Critical: 'critical',
} as const;
export type AlertSeverity =
  (typeof AlertSeverity)[keyof typeof AlertSeverity];
export const alertSeverityValues = Object.values(AlertSeverity);

// alert_status: open | reviewed | dismissed
export const AlertStatus = {
  Open: 'open',
  Reviewed: 'reviewed',
  Dismissed: 'dismissed',
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];
export const alertStatusValues = Object.values(AlertStatus);

// alert_type: anomaly | high_device | over_budget | offline
export const AlertType = {
  Anomaly: 'anomaly',
  HighDevice: 'high_device',
  OverBudget: 'over_budget',
  Offline: 'offline',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];
export const alertTypeValues = Object.values(AlertType);

// recommendation_source: alert | periodic_analysis
export const RecommendationSource = {
  Alert: 'alert',
  PeriodicAnalysis: 'periodic_analysis',
} as const;
export type RecommendationSource =
  (typeof RecommendationSource)[keyof typeof RecommendationSource];
export const recommendationSourceValues = Object.values(RecommendationSource);

// bill_status: uploaded | parsed | confirmed
export const BillStatus = {
  Uploaded: 'uploaded',
  Parsed: 'parsed',
  Confirmed: 'confirmed',
} as const;
export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];
export const billStatusValues = Object.values(BillStatus);

// ingestion_status: accepted | duplicate | invalid
export const IngestionStatus = {
  Accepted: 'accepted',
  Duplicate: 'duplicate',
  Invalid: 'invalid',
} as const;
export type IngestionStatus =
  (typeof IngestionStatus)[keyof typeof IngestionStatus];
export const ingestionStatusValues = Object.values(IngestionStatus);

// aggregate_granularity: hour | day | week | month
export const AggregateGranularity = {
  Hour: 'hour',
  Day: 'day',
  Week: 'week',
  Month: 'month',
} as const;
export type AggregateGranularity =
  (typeof AggregateGranularity)[keyof typeof AggregateGranularity];
export const aggregateGranularityValues = Object.values(AggregateGranularity);

// notification_channel: in_app | email | push
export const NotificationChannel = {
  InApp: 'in_app',
  Email: 'email',
  Push: 'push',
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];
export const notificationChannelValues = Object.values(NotificationChannel);
