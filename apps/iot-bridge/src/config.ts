/**
 * Configuración del iot-bridge cargada desde variables de entorno.
 * Fase 1: NO se usa todavía. La conexión MQTT real al broker (EMQX) es Fase 3.
 * Defaults son placeholders; no se establece ninguna conexión en esta fase.
 */

export interface IotBridgeConfig {
  /** URL del broker MQTT (EMQX). Placeholder en Fase 1 — no se conecta. */
  readonly MQTT_URL: string;
  /** URL base de la API SmartSense a la que se reenviará la telemetría (Fase 3). */
  readonly API_URL: string;
}

export const config: IotBridgeConfig = {
  MQTT_URL: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
  API_URL: process.env.API_URL ?? 'http://localhost:3001',
};
