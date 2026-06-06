/**
 * Vercel Serverless Function — monta la API Fastify de SmartSense (Fase 8.4: "todo en Vercel").
 * Toda ruta entrante se reescribe a /api (ver vercel.json) y se emite al servidor Fastify.
 * El handler NO lee req.body (Fastify parsea el stream crudo). App cacheada entre invocaciones.
 *
 * Runtime: Vercel Node. Prisma usa binaryTargets rhel-openssl-3.0.x (schema.prisma) y conecta a
 * Neon vía pooled URL. Rate-limit desactivado (serverless sin estado compartido; endurecer en edge).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
// server.mjs = bundle autocontenido generado por scripts/bundle-api.mjs durante el build de Vercel
// (inlinea fastify + el código TS de @smartsense/*). Ver vercel.json installCommand.
// @ts-ignore — artefacto de build, no existe en checkout/typecheck local.
import { buildApp } from './server.mjs';

let appPromise: Promise<{ ready: () => Promise<void>; server: { emit: (e: string, ...a: unknown[]) => void } }> | undefined;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await buildApp({ logger: false, rateLimit: false });
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  app.server.emit('request', req, res);
}
