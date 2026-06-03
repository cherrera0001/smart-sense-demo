/**
 * Hashing de contraseñas. Fase 2 usa bcryptjs (puro JS, sin build nativo → robusto
 * cross-plataforma). El canon prefiere Argon2id; migrar a @node-rs/argon2 es trivial
 * cuando se requiera (interfaz hash/verify estable). Documentado en phase-2-summary.
 */
import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
