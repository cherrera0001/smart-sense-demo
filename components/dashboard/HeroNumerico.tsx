'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, BarChart3 } from 'lucide-react'
import { formatCLP, formatDelta, formatKwh } from '@/lib/format'
import { consumoHoy } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'

const TECHO_CLP_LIVE = 1450

export function HeroNumerico() {
  const [clpActual, setClpActual] = useState(consumoHoy.clp)
  const isSaving = consumoHoy.deltaAyerPct < 0

  useEffect(() => {
    const interval = setInterval(() => {
      setClpActual(prev => {
        if (prev >= TECHO_CLP_LIVE) return prev
        const increment = 8 + Math.floor(Math.random() * 8)
        return Math.min(prev + increment, TECHO_CLP_LIVE)
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Consumo de hoy</h1>
          <p className="text-sm text-text-secondary">{formatKwh(consumoHoy.kwh)} kWh</p>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">Demo</Badge>
      </div>

      {/* Main metric card - Premium design */}
      <div className={`relative overflow-hidden rounded-lg border backdrop-blur-sm transition-all duration-200 ${
        isSaving
          ? 'bg-gradient-to-br from-surface-primary to-surface-secondary border-text-tertiary/15 hover:border-text-tertiary/30 hover:shadow-md'
          : 'bg-gradient-to-br from-surface-primary to-surface-secondary border-text-tertiary/15 hover:border-text-tertiary/30 hover:shadow-md'
      }`}>
        {/* Subtle accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${isSaving ? 'bg-success/30' : 'bg-error/30'}`} />

        <div className="relative p-4 sm:p-8 space-y-6">
          {/* Status badge - Refined */}
          <div className="flex items-center gap-2">
            {isSaving ? (
              <>
                <TrendingDown className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">Vas ahorrando</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 text-error" />
                <span className="text-sm font-medium text-error">Consumes más</span>
              </>
            )}
          </div>

          {/* Large number - Clear hierarchy */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-text-tertiary font-semibold">Costo actual</p>
            <div className="text-4xl sm:text-6xl font-bold text-text-primary tabular tracking-tight">
              {formatCLP(clpActual)}
            </div>
          </div>

          {/* Comparison - Refined spacing */}
          <div className="flex items-center justify-between pt-4 border-t border-text-tertiary/15">
            <span className="text-sm text-text-secondary">Comparado a ayer</span>
            <span className={`text-lg font-bold ${isSaving ? 'text-success' : 'text-error'}`}>
              {formatDelta(consumoHoy.deltaAyerPct)}
            </span>
          </div>
        </div>
      </div>

      {/* Projection card - Brand Focus, Refined */}
      <div className="rounded-xl border border-brand-primary/15 bg-gradient-to-br from-brand-primary/6 to-brand-primary/3 backdrop-blur-sm p-4 sm:p-7 space-y-4 hover:border-brand-primary/25 hover:shadow-sm transition-all duration-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-brand-primary/80">Si continúas así</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl sm:text-5xl font-bold text-brand-primary tabular">{formatCLP(consumoHoy.proyeccionFinMesClp)}</p>
          <p className="text-xs text-text-secondary">Proyectado para fin de mes</p>
        </div>
      </div>

      {/* CTA - Premium Brand Primary Action */}
      <Link href="/desglose" className="w-full group relative inline-flex bg-brand-primary text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl hover:bg-brand-primary-dark focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary focus-visible:outline-none transition-all duration-200 active:scale-95 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-center justify-center gap-2 w-full">
          <BarChart3 className="w-5 h-5" />
          <span>Ver desglose</span>
        </div>
      </Link>
    </div>
  )
}
