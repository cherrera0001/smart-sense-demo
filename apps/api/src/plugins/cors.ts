import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config/env.js';

/**
 * CORS controlado: solo orígenes en CORS_ORIGINS (de CORS_ORIGIN, coma-separado).
 * Producción rechaza wildcard (validado en env.ts). Requests sin Origin (curl/health) se permiten.
 */
export async function corsPlugin(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || config.CORS_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      // Origen no permitido: no se reflejan headers CORS (el navegador bloquea). No es error 500.
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
}
