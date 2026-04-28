/**
 * Valida coherencia numérica del deck sin instalar dependencias (solo Node).
 * Debe coincidir con lib/mock-data.ts → consumoHoy + firmaElectrica.
 */

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

const CLP_PARTS = [475, 300, 150, 175, 150]
const KWH_PARTS = [2.88, 1.82, 0.91, 1.06, 0.91]
const PCT_PARTS = [38, 24, 12, 14, 12]

const clpSum = CLP_PARTS.reduce((a, b) => a + b, 0)
assert(clpSum === 1250, `CLP debe sumar 1250, obtuve ${clpSum}`)

const kwhSum = KWH_PARTS.reduce((a, b) => a + b, 0)
assert(Math.abs(kwhSum - 7.58) < 0.02, `kWh debe sumar ~7.58, obtuve ${kwhSum}`)

const pctSum = PCT_PARTS.reduce((a, b) => a + b, 0)
assert(pctSum === 100, `Porcentajes deben sumar 100, obtuve ${pctSum}`)

/** Suma horaria consumoHoy (debe ser 1250) */
const HORARIA = [23, 21, 19, 17, 16, 18, 26, 37, 46, 55, 59, 66, 69, 73, 74, 76, 80, 77, 82, 86, 83, 68, 47, 32]
const horSum = HORARIA.reduce((a, b) => a + b, 0)
assert(horSum === 1250, `Serie horaria debe sumar 1250, obtuve ${horSum}`)

console.log('verify-deck: OK', {
  clpDiaTotal: clpSum,
  kwhDiaTotal: kwhSum,
  porcentajes: pctSum,
  horariaClp: horSum,
})
