/**
 * Consumidor MQTT (EMQX).
 *
 * IMPORTANTE: NO se conecta en import. La conexión solo ocurre al invocar
 * `createMqttConsumer`, lo que a su vez solo sucede con IOT_BRIDGE_MODE=mqtt y
 * un `brokerUrl` definido (ver index.ts). El paquete 'mqtt' se carga por
 * import dinámico para no requerir conexión/broker en build ni en test.
 */

export interface MqttConsumerOptions {
  readonly brokerUrl: string;
  readonly username?: string | undefined;
  readonly password?: string | undefined;
  readonly topic: string;
  /** Invocado por cada mensaje con el JSON parseado (o el texto si no es JSON). */
  readonly onMessage: (payload: unknown, topic: string) => void | Promise<void>;
  /** Invocado ante errores del cliente o de parseo (opcional). */
  readonly onError?: (error: Error) => void;
}

export interface MqttConsumer {
  /** Cierra la conexión al broker. */
  stop: () => Promise<void>;
}

/**
 * Crea y conecta un consumidor MQTT. Suscribe `topic` y llama `onMessage` por
 * cada mensaje recibido. Resuelve cuando la suscripción está activa.
 *
 * @throws Error si la conexión o suscripción fallan.
 */
export async function createMqttConsumer(
  options: MqttConsumerOptions,
): Promise<MqttConsumer> {
  const { brokerUrl, username, password, topic, onMessage, onError } = options;

  // Import dinámico: 'mqtt' no se carga salvo que se invoque esta función.
  const mqtt = await import('mqtt');

  const client = mqtt.connect(brokerUrl, {
    username,
    password,
    reconnectPeriod: 5_000,
    connectTimeout: 30_000,
  });

  const reportError = (error: Error): void => {
    if (onError) onError(error);
    else console.error(`[mqtt] error: ${error.message}`);
  };

  client.on('message', (msgTopic: string, payload: Buffer) => {
    let parsed: unknown;
    const text = payload.toString('utf8');
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    void Promise.resolve(onMessage(parsed, msgTopic)).catch((err: unknown) => {
      reportError(err instanceof Error ? err : new Error(String(err)));
    });
  });

  client.on('error', (err: Error) => reportError(err));

  await new Promise<void>((resolve, reject) => {
    client.on('connect', () => {
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          reject(
            err instanceof Error
              ? err
              : new Error(`fallo al suscribir topic '${topic}'`),
          );
          return;
        }
        console.log(`[mqtt] conectado y suscrito a '${topic}'`);
        resolve();
      });
    });
    client.once('error', reject);
  });

  return {
    stop: () =>
      new Promise<void>((resolve) => {
        client.end(false, {}, () => resolve());
      }),
  };
}
