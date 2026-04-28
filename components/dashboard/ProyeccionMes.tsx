'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { consumoHoy } from '@/lib/mock-data'
import { useTheme } from '@/lib/context/ThemeContext'

export function ProyeccionMes() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [chartColors, setChartColors] = useState({
    gridColor: '#3A4555',
    axisColor: '#8A94A6',
    tooltipBg: '#131D2E',
    tooltipBorder: '#1A2437',
    areaColor: '#FF8A00',
    areaColor2: '#FBBF24',
    textColor: '#F8F9FB'
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const styles = getComputedStyle(root)

    setChartColors({
      gridColor: styles.getPropertyValue('--chart-grid-color').trim() || '#3A4555',
      axisColor: styles.getPropertyValue('--chart-axis-color').trim() || '#8A94A6',
      tooltipBg: styles.getPropertyValue('--chart-tooltip-bg').trim() || '#131D2E',
      tooltipBorder: styles.getPropertyValue('--chart-tooltip-border').trim() || '#1A2437',
      areaColor: styles.getPropertyValue('--brand-primary').trim() || '#FF8A00',
      areaColor2: styles.getPropertyValue('--warning').trim() || '#FBBF24',
      textColor: styles.getPropertyValue('--text-primary').trim() || '#F8F9FB',
    })
  }, [theme, mounted])
  return (
    <div className="p-8">
      <div className="bg-gradient-to-br from-surface-primary to-surface-secondary rounded-lg border border-text-tertiary/15 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-8 border-b border-text-tertiary/15 space-y-1">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Consumo acumulado</h2>
          <p className="text-sm text-text-secondary">Histórico y proyección del mes</p>
        </div>

        <ResponsiveContainer width="100%" height={300} minHeight={250}>
          <AreaChart data={consumoHoy.serieMesAcumulada} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorCLP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.areaColor} stopOpacity={0.4} />
                <stop offset="70%" stopColor={chartColors.areaColor} stopOpacity={0.1} />
                <stop offset="100%" stopColor={chartColors.areaColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.areaColor2} stopOpacity={0.3} />
                <stop offset="70%" stopColor={chartColors.areaColor2} stopOpacity={0.05} />
                <stop offset="100%" stopColor={chartColors.areaColor2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke={chartColors.gridColor} vertical={false} />
            <XAxis dataKey="dia" stroke={chartColors.axisColor} style={{ fontSize: '12px', fontWeight: '500' }} />
            <YAxis stroke={chartColors.axisColor} style={{ fontSize: '12px' }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                padding: '12px 16px',
              }}
              labelStyle={{ color: chartColors.textColor, fontWeight: '600', marginBottom: '4px' }}
              formatter={(value: number, name: string, props) => {
                const isProjection = props.payload.esProyeccion
                return [
                  `$${value.toLocaleString('es-CL')}`,
                  isProjection ? 'Proyección' : 'Real',
                ]
              }}
              cursor={{ fill: 'rgba(255, 138, 0, 0.08)' }}
            />
            <Area
              type="monotone"
              dataKey="clpAcumulado"
              stroke={chartColors.areaColor}
              fillOpacity={1}
              fill="url(#colorCLP)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-8 justify-center text-sm py-5 px-8 border-t border-text-tertiary/15 bg-surface-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-brand-primary rounded-full"></div>
            <span className="text-text-secondary font-medium">Real</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span className="text-text-secondary font-medium">Proyección</span>
          </div>
        </div>
      </div>
    </div>
  )
}
