'use client'

import { LayoutShell } from '@/components/layout/LayoutShell'
import { HeroNumerico } from '@/components/dashboard/HeroNumerico'
import { ProyeccionMes } from '@/components/dashboard/ProyeccionMes'
import { AlertasStrip } from '@/components/dashboard/AlertasStrip'
import { QuickActions } from '@/components/dashboard/QuickActions'

export default function DashboardPage() {
  return (
    <LayoutShell>
      <div className="pb-24 space-y-0">
        {/* Header - Estandarizado */}
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de tu consumo y alertas</p>
        </div>

        {/* Main content sections */}
        <div className="page-section space-y-0">
          <div className="animate-in fade-in duration-500 border-b border-text-tertiary/15"><HeroNumerico /></div>
          <div className="animate-in fade-in duration-500 delay-100 border-b border-text-tertiary/15"><ProyeccionMes /></div>
          <div className="animate-in fade-in duration-500 delay-200"><AlertasStrip /></div>
          <div className="animate-in fade-in duration-500 delay-300 border-t border-text-tertiary/15"><QuickActions /></div>
        </div>
      </div>
    </LayoutShell>
  )
}
