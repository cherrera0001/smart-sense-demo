export interface Tarifa {
  tipo: 'BT-1' | 'BT-1A'
  clpKwh: number
  comuna: string
  distribuidora: string
}

export interface ConsumoHoy {
  kwh: number
  clp: number
  deltaAyerPct: number
  proyeccionFinMesClp: number
  serieHoraria: Array<{ hora: number; clp: number }>
  serieMesAcumulada: Array<{ dia: number; clpAcumulado: number; esProyeccion: boolean }>
}

export interface FirmaElectrica {
  id: string
  nombre: string
  categoria: string
  clpDia: number
  kwhDia: number
  color: string
  tendencia: 'up' | 'down' | 'flat'
  porcentaje: number
}

export interface Alerta {
  id: string
  tipo: 'anomalia' | 'sugerencia' | 'tip'
  titulo: string
  mensaje: string
  ahorroEstimadoClp?: number
  timestamp: Date
  leida: boolean
}

export interface ReporteSemanal {
  ahorroSemanaClp: number
  huellaCarbonoKg: number
  comparativa: Array<{ semana: string; clp: number }>
}

export interface Enchufe {
  id: string
  alias: string
  estado: 'online' | 'offline' | 'reconectando'
  ultimoPingMs: number
  dispositivoAsociado: string
}

export interface AppState {
  tarifa: Tarifa
  consumoHoy: ConsumoHoy
  firmaElectrica: FirmaElectrica[]
  alertas: Alerta[]
  reporteSemanal: ReporteSemanal
  enchufes: Enchufe[]
  onboardingDone: boolean
}
