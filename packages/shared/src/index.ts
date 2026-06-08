/**
 * @smartsense/shared — barrel.
 * Tipos, enums, branded IDs, schemas Zod y formatters compartidos.
 * Sin lógica de frontend, sin acceso a DB, sin dependencia de Next.
 * Consumido como source vía Next transpilePackages.
 */

// Domain
export * from './domain/enums.js';
export * from './domain/ids.js';
export * from './domain/types.js';

// Schemas
export * from './schemas/common.js';
export * from './schemas/installation.js';
export * from './schemas/device.js';
export * from './schemas/telemetry.js';
export * from './schemas/billing.js';
export * from './schemas/alerts.js';
export * from './schemas/control.js';
export * from './schemas/dashboard.js';
export * from './schemas/reports.js';
export * from './schemas/breakdown.js';
export * from './schemas/recommendations.js';

// Telemetry (node:crypto — solo backend: apps/api, apps/iot-bridge; apps/web no importa shared)
export * from './telemetry/hash.js';

// Utils
export * from './utils/format.js';
