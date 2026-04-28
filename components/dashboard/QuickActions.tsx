'use client'

import Link from 'next/link'
import { Zap, AlertCircle, BarChart3, Settings } from 'lucide-react'

const actions = [
  {
    href: '/desglose',
    label: 'Desglose',
    desc: 'Qué consume más',
    icon: Zap,
    bgClass: 'bg-brand-primary/10',
    borderClass: 'border-brand-primary/20',
    hoverClass: 'hover:bg-brand-primary/15 hover:border-brand-primary/35',
    focusClass: 'focus-visible:ring-brand-primary',
    iconClass: 'text-brand-primary'
  },
  {
    href: '/alertas',
    label: 'Alertas',
    desc: 'Acciones rápidas',
    icon: AlertCircle,
    bgClass: 'bg-severity-warning/10',
    borderClass: 'border-severity-warning/20',
    hoverClass: 'hover:bg-severity-warning/15 hover:border-severity-warning/35',
    focusClass: 'focus-visible:ring-severity-warning',
    iconClass: 'text-severity-warning'
  },
  {
    href: '/reporte',
    label: 'Reporte',
    desc: 'Semana vs semana',
    icon: BarChart3,
    bgClass: 'bg-severity-info/10',
    borderClass: 'border-severity-info/20',
    hoverClass: 'hover:bg-severity-info/15 hover:border-severity-info/35',
    focusClass: 'focus-visible:ring-severity-info',
    iconClass: 'text-severity-info'
  },
  {
    href: '/ajustes',
    label: 'Ajustes',
    desc: 'Tarifa y estado',
    icon: Settings,
    bgClass: 'bg-text-tertiary/10',
    borderClass: 'border-text-tertiary/20',
    hoverClass: 'hover:bg-text-tertiary/15 hover:border-text-tertiary/35',
    focusClass: 'focus-visible:ring-text-secondary',
    iconClass: 'text-text-secondary'
  },
]

export function QuickActions() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-text-primary tracking-tight">Acciones rápidas</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {actions.map(action => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center gap-4 p-6 rounded-lg ${action.bgClass} border ${action.borderClass} ${action.hoverClass} ${action.focusClass} focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none transition-all duration-200 cursor-pointer w-full hover:shadow-md active:scale-95 backdrop-blur-sm`}
            >
              <Icon className={`w-6 h-6 ${action.iconClass} transition-transform duration-200 hover:scale-110`} />
              <span className="text-sm font-semibold text-text-primary text-center">
                {action.label}
              </span>
              <span className="text-xs text-text-secondary text-center leading-tight">
                {action.desc}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
