#!/usr/bin/env node
/**
 * bundle-api.mjs — empaqueta la API Fastify en un único ESM autocontenido para Vercel Serverless.
 * Inlinea el código fuente TS de los workspaces (@smartsense/db, @smartsense/shared) — que se
 * consumen como FUENTE .ts y que @vercel/node NO transpila — y deja node_modules (fastify, prisma,
 * zod, pino…) como EXTERNOS para que el file-tracer de Vercel los incluya normalmente.
 * Salida: api/server.mjs (exporta buildApp). Se ejecuta en el installCommand de vercel.json.
 */
import esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Bundlea TODO (fastify, plugins, zod, bcryptjs, @smartsense/*) en un solo archivo.
 * ÚNICO external: @prisma/client / .prisma/client — su engine nativo no puede inlinearse y Prisma
 * lo carga dinámicamente. Debe ser resoluble en runtime: se expone como dep en el package.json raíz.
 * Esto evita el problema de resolución pnpm (deps en .pnpm/apps, no en la raíz desde /api).
 */
const externalizePrisma = {
  name: 'externalize-prisma',
  setup(build) {
    build.onResolve({ filter: /^@prisma\/|^\.prisma\//, namespace: 'file' }, (args) => {
      if (args.kind === 'entry-point') return undefined;
      return { path: args.path, external: true };
    });
  },
};

await esbuild.build({
  entryPoints: [join(root, 'apps/api/src/app.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: join(root, 'api/server.mjs'),
  plugins: [externalizePrisma],
  logLevel: 'info',
  // Shim require() por si algún módulo externo CJS lo necesita dentro del contexto ESM.
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});

console.log('[bundle-api] OK -> api/server.mjs');
