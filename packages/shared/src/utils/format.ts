/**
 * Formatters canónicos compartidos (es-CL).
 * Migrados desde `apps/web/lib/format.ts` (idénticos en comportamiento).
 * Sin dependencias de frontend ni de Next: solo `Intl`.
 */

/**
 * Formatea número a CLP con separador de miles (punto) estilo chileno.
 * Ejemplo: 42500 → "$42.500"
 */
export function formatCLP(value: number): string {
  const formatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

/**
 * Formatea kWh con separador decimal local (Chile: coma).
 * Ejemplo: 7.58 → "7,58 kWh"
 */
export function formatKwh(value: number): string {
  return `${value.toLocaleString('es-CL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} kWh`;
}

/**
 * Formatea porcentaje con signo + o -.
 * Ejemplo: -6 → "-6%", 5 → "+5%"
 */
export function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}%`;
}

/**
 * Formatea hora en formato HH:mm.
 * Ejemplo: 14 → "14:00"
 */
export function formatHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}
