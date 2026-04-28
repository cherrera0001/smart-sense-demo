'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { consumoHoy } from '@/lib/mock-data'

export function ProyeccionMes() {
  return (
    <div className="p-8">
      <div className="bg-gradient-to-br from-surface-primary to-surface-secondary rounded-lg border border-text-tertiary/15 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-8 border-b border-text-tertiary/15 space-y-1">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Consumo acumulado</h2>
          <p className="text-sm text-text-secondary">Histórico y proyección del mes</p>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={consumoHoy.serieMesAcumulada} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorCLP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF8A00" stopOpacity={0.4} />
                <stop offset="70%" stopColor="#FF8A00" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#FF8A00" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.3} />
                <stop offset="70%" stopColor="#FBBF24" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#3A4555" vertical={false} />
            <XAxis dataKey="dia" stroke="#8A94A6" style={{ fontSize: '12px', fontWeight: '500' }} />
            <YAxis stroke="#8A94A6" style={{ fontSize: '12px' }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#131D2E',
                border: '1px solid #1A2437',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                padding: '12px 16px',
              }}
              labelStyle={{ color: '#F8F9FB', fontWeight: '600', marginBottom: '4px' }}
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
              stroke="#FF8A00"
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
