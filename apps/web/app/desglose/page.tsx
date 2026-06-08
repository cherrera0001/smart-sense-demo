'use client'

import { useState } from 'react'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { firmaElectrica } from '@/lib/fixtures/mock-data'
import { formatCLP } from '@/lib/format'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { usePeriodo, type Periodo } from '@/lib/hooks/usePeriodo'

export default function DesglosePage() {
  const { periodo, setPeriodo } = usePeriodo()

  const pieData = firmaElectrica.map(f => ({
    name: f.nombre,
    value: f.porcentaje,
  }))

  const COLORS = firmaElectrica.map(f => f.color)

  return (
    <LayoutShell>
      <div className="pb-24">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Desglose</h1>

          {/* Toggle Período */}
          <div className="flex gap-3 pt-2">
            {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none min-h-[44px] ${
                  periodo === p
                    ? 'bg-brand-primary text-white shadow-md focus-visible:ring-brand-primary'
                    : 'bg-surface-secondary text-text-secondary border border-text-tertiary/20 hover:bg-surface-secondary/80 hover:border-text-tertiary/40 focus-visible:ring-text-secondary'
                }`}
              >
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : 'Este mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Pie Chart Card */}
        <div className="page-section">
          <div className="card-premium">
            <div className="card-header">
              <h2 className="card-title">Distribución de consumo</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value}%`}
                  outerRadius={90}
                  fill="var(--brand-primary)"
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--chart-tooltip-bg)',
                    border: '1px solid var(--chart-tooltip-border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value: any) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown */}
          <div className="space-y-3">
            {firmaElectrica.map(device => {
              const pctChange = device.tendencia === 'up' ? '+' : device.tendencia === 'down' ? '-' : ''
              const trendIcon = device.tendencia === 'up' ? <TrendingUp className="w-4 h-4 text-error" /> : device.tendencia === 'down' ? <TrendingDown className="w-4 h-4 text-success" /> : null

              return (
                <div key={device.id} className="card-premium">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="card-title">{device.nombre}</h3>
                      <p className="text-xs text-text-tertiary mt-1">{device.categoria}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {trendIcon}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-text-tertiary/15">
                    <div>
                      <p className="card-subtitle mb-1">Costo</p>
                      <p className="text-metric">{formatCLP(device.clpDia)}</p>
                    </div>
                    <div>
                      <p className="card-subtitle mb-1">Consumo</p>
                      <p className="text-metric">{device.kwhDia.toFixed(2)} kWh</p>
                    </div>
                    <div>
                      <p className="card-subtitle mb-1">% del total</p>
                      <p className="text-metric">{device.porcentaje}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </LayoutShell>
  )
}
