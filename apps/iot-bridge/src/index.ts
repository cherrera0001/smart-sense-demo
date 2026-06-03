/**
 * Entry point del iot-bridge (Fase 3).
 *
 * Modos (IOT_BRIDGE_MODE):
 *  - 'dry-run' (default): procesa los fixtures con normalize + dryRun. NO HTTP,
 *    NO broker. Imprime un resumen de lecturas válidas/ inválidas.
 *  - 'file': lee FIXTURES_DIR y reenvía cada lectura a la API (si hay apiUrl).
 *  - 'mqtt': crea el consumidor MQTT (normalize → validate → forward). Es el
 *    ÚNICO modo que abre conexión a broker, y solo si hay MQTT_BROKER_URL.
 *
 * Nunca se imprime el token ni credenciales (uso de maskSecret en el banner).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { config, maskSecret, type IotBridgeConfig } from './config.js';
import { normalize, NormalizationError } from './normalizer.js';
import { dryRun } from './dry-run.js';
import { forward } from './http-forwarder.js';
import { createMqttConsumer, type MqttConsumer } from './mqtt-client.js';

function resolveFixturesDir(cfg: IotBridgeConfig): string {
  return isAbsolute(cfg.fixturesDir)
    ? cfg.fixturesDir
    : join(process.cwd(), cfg.fixturesDir);
}

async function loadFixtures(
  dir: string,
): Promise<Array<{ file: string; raw: unknown }>> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    throw new Error(
      `no se pudo leer FIXTURES_DIR '${dir}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort();
  const out: Array<{ file: string; raw: unknown }> = [];
  for (const file of jsonFiles) {
    const text = await readFile(join(dir, file), 'utf8');
    out.push({ file, raw: JSON.parse(text) });
  }
  return out;
}

function logBanner(cfg: IotBridgeConfig): void {
  console.log(
    `iot-bridge starting — mode=${cfg.mode} apiUrl=${cfg.apiUrl} ` +
      `apiToken=${maskSecret(cfg.apiToken)} ` +
      `mqttBroker=${cfg.mqttBrokerUrl ?? '<unset>'} ` +
      `mqttUser=${maskSecret(cfg.mqttUsername)} topic=${cfg.mqttTopic}`,
  );
}

async function runDryRun(cfg: IotBridgeConfig): Promise<number> {
  const dir = resolveFixturesDir(cfg);
  const fixtures = await loadFixtures(dir);
  let valid = 0;
  let invalid = 0;
  for (const { file, raw } of fixtures) {
    try {
      const dto = normalize(raw);
      dryRun(dto);
      valid += 1;
    } catch (err) {
      invalid += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[dry-run] inválida (${file}): ${msg}`);
    }
  }
  console.log(
    `iot-bridge dry-run: ${valid} lecturas válidas, ${invalid} inválidas`,
  );
  return 0;
}

async function runFile(cfg: IotBridgeConfig): Promise<number> {
  const dir = resolveFixturesDir(cfg);
  const fixtures = await loadFixtures(dir);
  let sent = 0;
  let invalid = 0;
  let failed = 0;
  for (const { file, raw } of fixtures) {
    let dto;
    try {
      dto = normalize(raw);
    } catch (err) {
      invalid += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[file] inválida (${file}): ${msg}`);
      continue;
    }
    try {
      const res = await forward(dto, {
        apiUrl: cfg.apiUrl,
        token: cfg.apiToken,
      });
      sent += 1;
      console.log(
        `[file] ${file} → ${res.status} event_hash=${dto.event_hash}`,
      );
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[file] fallo de reenvío (${file}): ${msg}`);
    }
  }
  console.log(
    `iot-bridge file: ${sent} enviadas, ${invalid} inválidas, ${failed} fallidas`,
  );
  return failed > 0 ? 1 : 0;
}

async function runMqtt(cfg: IotBridgeConfig): Promise<number> {
  if (cfg.mqttBrokerUrl === undefined) {
    throw new Error(
      'modo mqtt requiere MQTT_BROKER_URL. Abortando sin conectar.',
    );
  }

  const consumer: MqttConsumer = await createMqttConsumer({
    brokerUrl: cfg.mqttBrokerUrl,
    username: cfg.mqttUsername,
    password: cfg.mqttPassword,
    topic: cfg.mqttTopic,
    onMessage: async (payload, topic) => {
      try {
        const dto = normalize(payload);
        const res = await forward(dto, {
          apiUrl: cfg.apiUrl,
          token: cfg.apiToken,
        });
        console.log(
          `[mqtt] ${topic} → ${res.status} event_hash=${dto.event_hash}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (err instanceof NormalizationError) {
          console.warn(`[mqtt] lectura inválida en ${topic}: ${msg}`);
        } else {
          console.error(`[mqtt] error procesando ${topic}: ${msg}`);
        }
      }
    },
  });

  const shutdown = async (): Promise<void> => {
    console.log('[mqtt] shutting down…');
    await consumer.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  console.log('[mqtt] consumer activo. Ctrl+C para salir.');
  // Mantiene el proceso vivo (el cliente MQTT tiene timers); no resolvemos.
  return new Promise<number>(() => {});
}

async function main(): Promise<void> {
  logBanner(config);
  let exitCode = 0;
  switch (config.mode) {
    case 'dry-run':
      exitCode = await runDryRun(config);
      break;
    case 'file':
      exitCode = await runFile(config);
      break;
    case 'mqtt':
      exitCode = await runMqtt(config);
      break;
  }
  if (exitCode !== 0) process.exitCode = exitCode;
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`iot-bridge error fatal: ${msg}`);
  process.exit(1);
});
