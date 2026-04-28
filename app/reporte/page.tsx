'use client'

import { LayoutShell } from '@/components/layout/LayoutShell'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { reporteSemanal } from '@/lib/mock-data'
import { formatCLP } from '@/lib/format'
import { Leaf, TrendingDown } from 'lucide-react'

export default function ReportePage() {
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
          <div className="bg-gradient-to-br from-brand-primary/8 to-brand-primary/4 border border-brand-primary/20 rounded-lg p-6 space-y-3">
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
          <div className="bg-gradient-to-br from-severity-info/8 to-severity-info/4 border border-severity-info/20 rounded-lg p-6 space-y-3">
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={reporteSemanal.comparativa} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="0" stroke="#3A4555" vertical={false} />
                <XAxis dataKey="semana" stroke="#8A94A6" style={{ fontSize: '12px', fontWeight: '500' }} />
                <YAxis stroke="#8A94A6" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#131D2E',
                    border: '1px solid #1A2437',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    padding: '12px 16px',
                  }}
                  labelStyle={{ color: '#F8F9FB', fontWeight: '600', marginBottom: '4px' }}
                  formatter={(value: any) => `$${value.toLocaleString('es-CL')}`}
                  cursor={{ fill: 'rgba(255, 138, 0, 0.08)' }}
                />
                <Bar
                  dataKey="clp"
                  fill="#FF8A00"
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
