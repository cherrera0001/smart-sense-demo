import type { Tarifa, ConsumoHoy, FirmaElectrica, Alerta, ReporteSemanal, Enchufe } from './types'

export const tarifa: Tarifa = {
  tipo: 'BT-1',
  clpKwh: 165,
  comuna: 'Coquimbo',
  distribuidora: 'CGE',
}

/**
 * Deck: 7,58 kWh × 165 ≈ $1.250 · proyección fin de mes $42.500
 * Serie horaria: suma exacta $1.250 (consumo del día modelado).
 */
export const consumoHoy: ConsumoHoy = {
  kwh: 7.58,
  clp: 1250,
  deltaAyerPct: -6,
  proyeccionFinMesClp: 42500,
  serieHoraria: [
    { hora: 0, clp: 23 },
    { hora: 1, clp: 21 },
    { hora: 2, clp: 19 },
    { hora: 3, clp: 17 },
    { hora: 4, clp: 16 },
    { hora: 5, clp: 18 },
    { hora: 6, clp: 26 },
    { hora: 7, clp: 37 },
    { hora: 8, clp: 46 },
    { hora: 9, clp: 55 },
    { hora: 10, clp: 59 },
    { hora: 11, clp: 66 },
    { hora: 12, clp: 69 },
    { hora: 13, clp: 73 },
    { hora: 14, clp: 74 },
    { hora: 15, clp: 76 },
    { hora: 16, clp: 80 },
    { hora: 17, clp: 77 },
    { hora: 18, clp: 82 },
    { hora: 19, clp: 86 },
    { hora: 20, clp: 83 },
    { hora: 21, clp: 68 },
    { hora: 22, clp: 47 },
    { hora: 23, clp: 32 },
  ],
  /** Acumulado mensual: día 1 → día 35 con fin en $42.500 (días >30 = proyección). */
  serieMesAcumulada: (() => {
    const out: ConsumoHoy['serieMesAcumulada'] = []
    for (let dia = 1; dia <= 35; dia++) {
      const clpAcumulado =
        dia === 35 ? 42500 : Math.round(1400 + (41100 * (dia - 1)) / 34)
      out.push({
        dia,
        clpAcumulado,
        esProyeccion: dia > 30,
      })
    }
    return out
  })(),
}

/**
 * 5 segmentos alineados al deck: Refrigeración 38%, Climatización 24%, Iluminación 12%, Electrónica 14%, Lavado 12%.
 * Porcentajes suman 100. CLP/día suman $1.250; kWh/día suman 7,58 kWh (×165).
 */
export const firmaElectrica: FirmaElectrica[] = [
  {
    id: 'sig-refri',
    nombre: 'Refrigeración',
    categoria: 'Refrigeración 24/7',
    clpDia: 475,
    kwhDia: 2.88,
    color: '#5B7FFF',
    tendencia: 'flat',
    porcentaje: 38,
  },
  {
    id: 'sig-clima',
    nombre: 'Climatización',
    categoria: 'Climatización',
    clpDia: 300,
    kwhDia: 1.82,
    color: '#00D87A',
    tendencia: 'up',
    porcentaje: 24,
  },
  {
    id: 'sig-luz',
    nombre: 'Iluminación',
    categoria: 'Iluminación',
    clpDia: 150,
    kwhDia: 0.91,
    color: '#FFC844',
    tendencia: 'flat',
    porcentaje: 12,
  },
  {
    id: 'sig-elec',
    nombre: 'Electrónica',
    categoria: 'Electrónica menor',
    clpDia: 175,
    kwhDia: 1.06,
    color: '#94A3B8',
    tendencia: 'flat',
    porcentaje: 14,
  },
  {
    id: 'sig-lavado',
    nombre: 'Lavado',
    categoria: 'Lavado/Secado',
    clpDia: 150,
    kwhDia: 0.91,
    color: '#FF6B6B',
    tendencia: 'down',
    porcentaje: 12,
  },
]

export const alertas: Alerta[] = [
  {
    id: 'alert-1',
    tipo: 'anomalia',
    titulo: 'Refrigerador +30%',
    mensaje:
      'El refrigerador consumió 30% más de lo esperado en las últimas 24h. Verifica que la puerta cierre correctamente.',
    ahorroEstimadoClp: 150,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    leida: false,
  },
  {
    id: 'alert-2',
    tipo: 'sugerencia',
    titulo: 'Mover lavado a horario valle',
    mensaje:
      'Lava entre las 22:00 y 6:00 para ahorrar hasta $4.200/mes. Tarifa es 40% más barata.',
    ahorroEstimadoClp: 4200,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    leida: false,
  },
  {
    id: 'alert-3',
    tipo: 'tip',
    titulo: 'Hervidor en stand-by consume 8 W',
    mensaje: 'Desconecta cuando no uses. Suma $180/año en consumo fantasma.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    leida: true,
  },
]

export const reporteSemanal: ReporteSemanal = {
  ahorroSemanaClp: 3850,
  huellaCarbonoKg: 42.5,
  comparativa: [
    { semana: 'Semana pasada', clp: 7400 },
    { semana: 'Esta semana', clp: 6550 },
  ],
}

export const enchufes: Enchufe[] = [
  {
    id: 'enchuf-1',
    alias: 'Refrigerador',
    estado: 'online',
    ultimoPingMs: 45,
    dispositivoAsociado: 'Refrigerador',
  },
  {
    id: 'enchuf-2',
    alias: 'Lavadora',
    estado: 'online',
    ultimoPingMs: 62,
    dispositivoAsociado: 'Lavadora',
  },
  {
    id: 'enchuf-3',
    alias: 'Microondas',
    estado: 'reconectando',
    ultimoPingMs: 1200,
    dispositivoAsociado: 'Microondas',
  },
  {
    id: 'enchuf-4',
    alias: 'TV',
    estado: 'online',
    ultimoPingMs: 38,
    dispositivoAsociado: 'TV + Streaming',
  },
]
