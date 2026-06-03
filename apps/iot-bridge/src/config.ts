/**
 * Configuración del iot-bridge cargada desde variables de entorno.
 *
 * Defaults seguros: por defecto opera en modo `dry-run` (no abre conexiones de
 * red ni a broker MQTT). La conexión real al broker (EMQX) solo ocurre con
 * IOT_BRIDGE_MODE=mqtt y MQTT_BROKER_URL definido.
 *
 * NUNCA se imprimen secretos: usar `maskSecret` para cualquier log.
 */

/** Modo de operación del bridge. */
export type IotBridgeMode = 'dry-run' | 'mqtt' | 'file';

const MODES: readonly IotBridgeMode[] = ['dry-run', 'mqtt', 'file'] as const;

export interface IotBridgeConfig {
  /** Modo de operación. Default: 'dry-run' (sin red, sin broker). */
  readonly mode: IotBridgeMode;
  /** URL del broker MQTT (EMQX). Solo se usa en modo 'mqtt'. */
  readonly mqttBrokerUrl: string | undefined;
  /** Usuario MQTT (secreto). */
  readonly mqttUsername: string | undefined;
  /** Clave MQTT (secreto). */
  readonly mqttPassword: string | undefined;
  /** Topic/patrón de suscripción MQTT. */
  readonly mqttTopic: string;
  /** URL base de la API SmartSense. */
  readonly apiUrl: string;
  /** Token de servicio (scope telemetry:ingest) — secreto. */
  readonly apiToken: string | undefined;
  /** Directorio de fixtures para modos 'dry-run' y 'file'. */
  readonly fixturesDir: string;
}

/**
 * Enmascara un secreto para logging seguro. Nunca devuelve el valor en claro.
 * - undefined/empty → '<unset>'
 * - cadenas cortas (<=4) → '****'
 * - resto → primeros 2 + '****' + últimos 2 (sin revelar el cuerpo).
 */
export function maskSecret(value: string | undefined | null): string {
  if (value === undefined || value === null || value.length === 0) {
    return '<unset>';
  }
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function parseMode(raw: string | undefined): IotBridgeMode {
  if (raw === undefined) return 'dry-run';
  const normalized = raw.trim().toLowerCase();
  if ((MODES as readonly string[]).includes(normalized)) {
    return normalized as IotBridgeMode;
  }
  throw new Error(
    `IOT_BRIDGE_MODE inválido: '${raw}'. Valores permitidos: ${MODES.join(', ')}.`,
  );
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): IotBridgeConfig {
  return {
    mode: parseMode(env.IOT_BRIDGE_MODE),
    mqttBrokerUrl: emptyToUndefined(env.MQTT_BROKER_URL),
    mqttUsername: emptyToUndefined(env.MQTT_USERNAME),
    mqttPassword: emptyToUndefined(env.MQTT_PASSWORD),
    mqttTopic: emptyToUndefined(env.MQTT_TOPIC) ?? 'smartsense/+/+/telemetry',
    apiUrl: emptyToUndefined(env.SMARTSENSE_API_URL) ?? 'http://localhost:3001',
    apiToken: emptyToUndefined(env.SMARTSENSE_API_TOKEN),
    fixturesDir: emptyToUndefined(env.FIXTURES_DIR) ?? 'fixtures',
  };
}

export const config: IotBridgeConfig = loadConfig();
