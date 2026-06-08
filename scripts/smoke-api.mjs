#!/usr/bin/env node
/**
 * scripts/smoke-api.mjs — Smoke test E2E contra la API SmartSense ya levantada.
 *
 * REQUISITOS:
 *   - La API corriendo (por defecto http://localhost:3001). Levántala con: pnpm dev:api
 *   - Base de datos accesible y migrada (DATABASE_URL + migrate:deploy + seed).
 *
 * VARIABLES:
 *   - API_BASE_URL        (default http://localhost:3001)
 *   - SMOKE_EMAIL_PREFIX  (default "smoke")
 *
 * FLUJO:
 *   1. GET  /health                                   → status "ok"
 *   2. POST /auth/register                            → token + organization.id
 *   3. POST /auth/login                               → token
 *   4. POST /installations                            → installation.id
 *   5. GET  /installations/:id/dashboard              → 200
 *   6. GET  /installations/:id/alerts                 → 200 (lista vacía)
 *   7. GET  /installations/:id/recommendations        → 200
 *
 * Exit 0 si todos los pasos pasan; exit 1 al primer fallo.
 * NUNCA imprime tokens/secretos completos: se enmascaran.
 */
import { randomUUID } from 'node:crypto';

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const EMAIL_PREFIX = process.env.SMOKE_EMAIL_PREFIX ?? 'smoke';
const PASSWORD = 'Passw0rd!23';

const uid = randomUUID().replace(/-/g, '').slice(0, 12);
const EMAIL = `${EMAIL_PREFIX}+${uid}@smartsense.test`;

let passed = 0;
let failed = 0;

function mask(value) {
  if (!value || typeof value !== 'string') return '<none>';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

function pass(step, detail = '') {
  passed++;
  console.log(`  PASS  ${step}${detail ? `  — ${detail}` : ''}`);
}

function fail(step, detail = '') {
  failed++;
  console.error(`  FAIL  ${step}${detail ? `  — ${detail}` : ''}`);
}

/** fetch con manejo explícito de errores de red (API caída). */
async function call(method, path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const e = new Error(
      `No se pudo conectar a ${API_BASE_URL}${path} (${err.cause?.code ?? err.message}). ` +
        '¿Está la API levantada? Ejecuta: pnpm dev:api',
    );
    e.networkError = true;
    throw e;
  }
  let json = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text.slice(0, 200) };
    }
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`[smoke] API_BASE_URL = ${API_BASE_URL}`);
  console.log(`[smoke] email de prueba = ${EMAIL}\n`);

  // 1) Health
  {
    const { status, json } = await call('GET', '/health');
    if (status === 200 && json?.status === 'ok') pass('GET /health', `status=${json.status}`);
    else {
      fail('GET /health', `http=${status} status=${json?.status ?? '?'}`);
      return;
    }
  }

  // 2) Register
  let token;
  let organizationId;
  {
    const { status, json } = await call('POST', '/auth/register', {
      body: {
        email: EMAIL,
        password: PASSWORD,
        fullName: 'Smoke Test User',
        organizationName: `Smoke Org ${uid}`,
      },
    });
    if (status === 201 && json?.token && json?.organization?.id) {
      token = json.token;
      organizationId = json.organization.id;
      pass('POST /auth/register', `token=${mask(token)} org=${mask(organizationId)}`);
    } else {
      fail('POST /auth/register', `http=${status} body=${JSON.stringify(json)?.slice(0, 200)}`);
      return;
    }
  }

  // 3) Login (refresca token; valida credenciales recién creadas)
  {
    const { status, json } = await call('POST', '/auth/login', {
      body: { email: EMAIL, password: PASSWORD },
    });
    if (status === 200 && json?.token) {
      token = json.token;
      pass('POST /auth/login', `token=${mask(token)}`);
    } else {
      fail('POST /auth/login', `http=${status} body=${JSON.stringify(json)?.slice(0, 200)}`);
      return;
    }
  }

  // 4) Create installation
  let installationId;
  {
    const { status, json } = await call('POST', '/installations', {
      token,
      body: {
        organizationId,
        name: `Smoke Installation ${uid}`,
        segment: 'home',
      },
    });
    if (status === 201 && json?.installation?.id) {
      installationId = json.installation.id;
      pass('POST /installations', `id=${mask(installationId)}`);
    } else {
      fail('POST /installations', `http=${status} body=${JSON.stringify(json)?.slice(0, 200)}`);
      return;
    }
  }

  // 5) Dashboard
  {
    const { status } = await call('GET', `/installations/${installationId}/dashboard`, { token });
    if (status === 200) pass('GET /installations/:id/dashboard', 'http=200');
    else {
      fail('GET /installations/:id/dashboard', `http=${status}`);
      return;
    }
  }

  // 6) Alerts (lista vacía esperada)
  {
    const { status, json } = await call('GET', `/installations/${installationId}/alerts`, { token });
    const items = json?.alerts ?? json?.items ?? json?.data;
    const empty = Array.isArray(items) ? items.length === 0 : true;
    if (status === 200) pass('GET /installations/:id/alerts', `http=200 empty=${empty}`);
    else {
      fail('GET /installations/:id/alerts', `http=${status}`);
      return;
    }
  }

  // 7) Recommendations
  {
    const { status } = await call('GET', `/installations/${installationId}/recommendations`, { token });
    if (status === 200) pass('GET /installations/:id/recommendations', 'http=200');
    else {
      fail('GET /installations/:id/recommendations', `http=${status}`);
      return;
    }
  }
}

main()
  .then(() => {
    console.log(`\n[smoke] Resultado: ${passed} pasos OK, ${failed} fallidos.`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((err) => {
    if (err.networkError) {
      console.error(`\n[smoke] ERROR DE RED: ${err.message}`);
    } else {
      console.error(`\n[smoke] ERROR inesperado: ${err.message}`);
    }
    console.log(`\n[smoke] Resultado: ${passed} pasos OK, ${failed + 1} fallidos.`);
    process.exit(1);
  });
