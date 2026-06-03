import { buildApp } from './app.js';
import { config } from './config/env.js';

/** Bootstrap del servidor Fastify (Fase 2: API base auth/orgs/installations/devices/onboarding). */
async function start(): Promise<void> {
  const app = await buildApp({ logger: true });

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
