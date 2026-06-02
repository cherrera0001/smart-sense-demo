import Fastify from 'fastify';
import { config } from './config.js';
import { healthPlugin } from './health.js';

/**
 * Bootstrap del servidor Fastify.
 * Fase 1: solo health. Endpoints de negocio = Fase 2.
 */
async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(healthPlugin);

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.error(err, 'failed to start server');
    process.exit(1);
  }
}

void start();
