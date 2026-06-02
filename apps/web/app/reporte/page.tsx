'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { reporteSemanal } from '@/lib/fixtures/mock-data'
import { formatCLP } from '@/lib/format'
import { Leaf, TrendingDown } from 'lucide-react'
import { useTheme } from '@/lib/context/ThemeContext'

function ReportePageContent() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [chartColors, setChartColors] = useState({
    gridColor: '#3A4555',
    axisColor: '#8A94A6',
    tooltipBg: '#131D2E',
    tooltipBorder: '#1A2437',
    barColor: '#FF8A00',
    textColor: '#F8F9FB'
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const styles = getComputedStyle(root)

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    setChartColors({
      gridColor: styles.getPropertyValue('--chart-grid-color').trim() || (isDark ? '#3A4555' : '#E5E7EB'),
      axisColor: styles.getPropertyValue('--chart-axis-color').trim() || (isDark ? '#8A94A6' : '#6B7280'),
      tooltipBg: styles.getPropertyValue('--chart-tooltip-bg').trim() || (isDark ? '#131D2E' : '#FFFFFF'),
      tooltipBorder: styles.getPropertyValue('--chart-tooltip-border').trim() || (isDark ? '#1A2437' : '#F3F4F6'),
      barColor: styles.getPropertyValue('--brand-primary').trim() || '#FF8A00',
      textColor: styles.getPropertyValue('--text-primary').trim() || (isDark ? '#F8F9FB' : '#0F172A')
    })
  }, [theme, mounted])

  return (
    <LayoutShell>
      <div className="pb-24">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Reporte</h1>
          <p className="page-subtitle">Comparación semanal</p>
        </div>

        {/* Content Section */}
        <div className="page-section">
          {/* Ahorro Card */}
          <div className="alert-modal-highlight">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-brand-primary" />
              <h2 className="card-subtitle">Ahorro esta semana</h2>
            </div>
            <div className="space-y-1">
              <p className="text-5xl font-bold text-brand-primary tabular">
                {formatCLP(reporteSemanal.ahorroSemanaClp)}
              </p>
              <p className="text-xs text-text-secondary">vs semana pasada</p>
            </div>
          </div>

          {/* Huella de carbono Card */}
          <div className="border rounded-lg p-6 space-y-3" style={{
            background: `linear-gradient(135deg, var(--severity-info-gradient-from), var(--severity-info-gradient-to))`,
            borderColor: 'var(--severity-info-ring)'
          }}>
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-severity-info" />
              <h2 className="card-subtitle">Huella de carbono</h2>
            </div>
            <div className="space-y-1">
              <p className="text-5xl font-bold text-severity-info tabular">
                {reporteSemanal.huellaCarbonoKg}
              </p>
              <p className="text-xs text-text-secondary">kg CO₂ esta semana</p>
            </div>
          </div>

          {/* Chart */}
          <div className="card-premium">
            <div className="card-header">
              <h2 className="card-title">Comparativa semanal</h2>
            </div>
            <ResponsiveContainer width="100%" height={280} minHeight={250}>
              <BarChart data={reporteSemanal.comparativa} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="0" stroke={chartColors.gridColor} vertical={false} />
                <XAxis dataKey="semana" stroke={chartColors.axisColor} style={{ fontSize: '12px', fontWeight: '500' }} />
                <YAxis stroke={chartColors.axisColor} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    padding: '12px 16px',
                  }}
                  labelStyle={{ color: chartColors.textColor, fontWeight: '600', marginBottom: '4px' }}
                  formatter={(value: any) => `$${value.toLocaleString('es-CL')}`}
                  cursor={{ fill: 'rgba(255, 138, 0, 0.08)' }}
                />
                <Bar
                  dataKey="clp"
                  fill={chartColors.barColor}
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </LayoutShell>
  )
}

export default dynamic(() => Promise.resolve(ReportePageContent), {
  ssr: false,
})
