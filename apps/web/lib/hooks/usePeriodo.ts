'use client'

import { useState } from 'react'

export type Periodo = 'hoy' | 'semana' | 'mes'

export function usePeriodo() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy')

  return { periodo, setPeriodo }
}
