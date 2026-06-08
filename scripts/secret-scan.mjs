#!/usr/bin/env node
/**
 * scripts/secret-scan.mjs — Escáner de secretos sobre archivos VERSIONADOS.
 *
 * Recorre la salida de `git ls-files` (solo lo que está bajo control de versiones,
 * NUNCA node_modules/dist/.next) y busca patrones de credenciales filtradas.
 *
 * Salida:
 *   - Exit 1 + listado enmascarado (archivo:línea) si encuentra al menos un hit.
 *   - Exit 0 si está limpio.
 *
 * Diseñado para correr en CI (pnpm security:scan-secrets) y como pre-commit manual.
 * Nunca imprime el secreto completo: se enmascara dejando solo un prefijo corto.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

/** Patrones de detección. `name` describe el hallazgo; `re` es la regex (global, por línea). */
const PATTERNS = [
  { name: 'Neon Postgres password (npg_)', re: /npg_[A-Za-z0-9]{6,}/ },
  { name: 'DATABASE_URL con credenciales', re: /DATABASE_URL\s*=\s*postgres(?:ql)?:\/\/[^\s"']+/i },
  { name: 'DIRECT_URL con credenciales', re: /DIRECT_URL\s*=\s*postgres(?:ql)?:\/\/[^\s"']+/i },
  { name: 'JWT_SECRET con valor', re: /JWT_SECRET\s*=\s*\S+/i },
  { name: 'MQTT_PASSWORD con valor', re: /MQTT_PASSWORD\s*=\s*\S+/i },
  { name: 'SMARTSENSE_API_TOKEN con valor', re: /SMARTSENSE_API_TOKEN\s*=\s*\S+/i },
  { name: 'Authorization Bearer hardcodeado', re: /Authorization:\s*Bearer\s+\S+/i },
];

/**
 * Placeholders explícitos que NO son secretos reales. Si la línea contiene cualquiera
 * de estos, se ignora (cubre las plantillas tipo USER:PASSWORD del .env.example).
 */
const PLACEHOLDER_TOKENS = [
  'USER:PASSWORD',
  'user:password',
  'change_me',
  'change-me',
  'changeme',
  'change-in-production',
  'change_in_production',
  'change-it',
  'dev_only_change_me',
  'test-secret',
  'test_secret',
  'your_',
  'YOUR_',
  '<',
  '${',
  'example',
  'placeholder',
  'xxxxx',
  'XXXXX',
  'REDACTED',
  'redacted',
];

/** Archivos/segmentos de ruta ignorados aunque estén versionados. */
const IGNORED_PATH_SEGMENTS = [
  'node_modules/',
  '.git/',
  'dist/',
  '.next/',
  'coverage/',
];

/** Sufijos de archivo ignorados (plantillas y ejemplos). */
const IGNORED_SUFFIXES = ['.example', '.env.example'];

/** Extensiones binarias que no tiene sentido escanear (evita ruido y falsos positivos). */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.pdf', '.zip', '.gz', '.woff', '.woff2', '.ttf', '.eot',
  '.lockb', '.wasm',
]);

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB: evita escanear blobs grandes.

function isIgnored(file) {
  if (IGNORED_PATH_SEGMENTS.some((seg) => file.includes(seg))) return true;
  if (IGNORED_SUFFIXES.some((suf) => file.endsWith(suf))) return true;
  const dot = file.lastIndexOf('.');
  if (dot !== -1 && BINARY_EXTENSIONS.has(file.slice(dot).toLowerCase())) return true;
  // Ignora cualquier .env.example aunque tenga sufijos extra (ej: .env.example.local).
  if (/\.example(\.|$)/.test(file)) return true;
  return false;
}

function hasPlaceholder(line) {
  return PLACEHOLDER_TOKENS.some((tok) => line.includes(tok));
}

/** Enmascara el secreto: deja los primeros 4 chars y oculta el resto. */
function mask(value) {
  const trimmed = value.trim();
  if (trimmed.length <= 6) return '****';
  return `${trimmed.slice(0, 4)}…${'*'.repeat(Math.min(8, trimmed.length - 4))}`;
}

function gitTrackedFiles() {
  const out = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function main() {
  let files;
  try {
    files = gitTrackedFiles();
  } catch (err) {
    console.error('[secret-scan] No se pudo ejecutar `git ls-files`. ¿Estás dentro de un repo git?');
    console.error(`[secret-scan] ${err.message}`);
    process.exit(1);
  }

  const hits = [];

  for (const file of files) {
    if (isIgnored(file)) continue;

    let size;
    try {
      size = statSync(file).size;
    } catch {
      continue; // archivo listado pero ausente (submódulo, etc.)
    }
    if (size > MAX_FILE_BYTES) continue;

    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue; // binario o ilegible
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (hasPlaceholder(line)) continue;
      for (const { name, re } of PATTERNS) {
        const m = line.match(re);
        if (m) {
          hits.push({ file, line: i + 1, name, masked: mask(m[0]) });
        }
      }
    }
  }

  if (hits.length === 0) {
    console.log('[secret-scan] OK — no se detectaron secretos en archivos versionados.');
    process.exit(0);
  }

  console.error(`[secret-scan] FALLO — ${hits.length} posible(s) secreto(s) en archivos versionados:\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  [${h.name}]  ${h.masked}`);
  }
  console.error('\n[secret-scan] Acción requerida:');
  console.error('  1. Elimina el secreto del archivo versionado (usa variables de entorno).');
  console.error('  2. Rota la credencial expuesta (asume que está comprometida).');
  console.error('  3. Si es un placeholder legítimo, usa USER:PASSWORD / change_me o muévelo a *.example.');
  process.exit(1);
}

main();
