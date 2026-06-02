/**
 * Entry point del iot-bridge.
 *
 * Fase 1: solo scaffold. NO conecta a broker MQTT, NO procesa telemetría,
 * NO levanta workers. La suscripción MQTT (EMQX) y el reenvío a
 * POST /iot/telemetry corresponden a la Fase 3.
 *
 * `config` se importa solo para validar el scaffold; no se utiliza aún.
 */
import { config } from './config.js';

void config;

function main(): void {
  console.log('iot-bridge scaffold ready — no MQTT connection in Phase 1');
}

main();
