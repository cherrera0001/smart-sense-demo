#!/usr/bin/env node
/**
 * verify-staging.mjs — verificación remota de una API SmartSense desplegada.
 * Uso: STAGING_API_URL=https://... node scripts/verify-staging.mjs
 * (o `STAGING_API_URL=... pnpm verify:staging`)
 *
 * Comprueba: GET /health (status ok), GET /readyz (ready + db ok), y luego ejecuta el
 * smoke E2E (scripts/smoke-api.mjs) contra esa URL. NO imprime tokens/secretos. Exit 1 si falla.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const base = (process.env.STAGING_API_URL ?? process.env.API_BASE_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.error('[verify-staging] Falta STAGING_API_URL. Uso: STAGING_API_URL=https://... pnpm verify:staging');
  process.exit(1);
}
console.log(`[verify-staging] objetivo = ${base}`);

let failures = 0;
function ok(label, cond, detail = '') {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
}

async function getJson(path) {
  const res = await fetch(`${base}${path}`, { headers: { accept: 'application/json' } });
  let body = {};
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

try {
  const health = await getJson('/health');
  ok('GET /health 200 + status ok', health.status === 200 && health.body.status === 'ok',
    `http=${health.status} status=${health.body.status ?? '?'}`);

  const ready = await getJson('/readyz');
  ok('GET /readyz ready + db ok', ready.status === 200 && ready.body.status === 'ready' && ready.body.db === 'ok',
    `http=${ready.status} db=${ready.body.db ?? '?'}`);
} catch (err) {
  ok('Conectividad a la API', false, err instanceof Error ? err.message : 'error de red');
}

// Smoke E2E completo (register/login/installation/dashboard/alerts/recommendations).
const __dirname = dirname(fileURLToPath(import.meta.url));
console.log('[verify-staging] ejecutando smoke E2E…');
const smoke = spawnSync(process.execPath, [join(__dirname, 'smoke-api.mjs')], {
  env: { ...process.env, API_BASE_URL: base },
  stdio: 'inherit',
});
ok('smoke E2E', smoke.status === 0, `exit=${smoke.status}`);

if (failures > 0) {
  console.error(`[verify-staging] ${failures} gate(s) fallaron.`);
  process.exit(1);
}
console.log('[verify-staging] OK — health/readyz/smoke en verde contra la API desplegada.');
