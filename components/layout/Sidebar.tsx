'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, AlertCircle, BarChart3, Settings } from 'lucide-react'
import { RayoSvg } from '@/components/shared/RayoSvg'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/desglose', label: 'Desglose', icon: Zap },
  { href: '/alertas', label: 'Alertas', icon: AlertCircle },
  { href: '/reporte', label: 'Reporte', icon: BarChart3 },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-ink border-r border-text-dim/20 flex flex-col p-6">
      {/* Logo - Home Energy Brand */}
      <Link href="/dashboard" className="flex items-center gap-3 mb-8 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:outline-none rounded-lg px-2 py-1 transition-all hover:opacity-80">
        <RayoSvg className="w-6 h-6 text-brand-primary" />
        <span className="text-lg font-bold text-brand-primary tracking-tight">Home Energy</span>
      </Link>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                isActive
                  ? 'bg-brand-primary/20 text-brand-primary font-semibold border border-brand-primary/40 shadow-sm'
                  : 'text-text-dim-on-dark hover:bg-ink-3 hover:text-text-on-dark border border-transparent hover:border-text-dim/20'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-text-dim/20 pt-4 space-y-3">
        <div className="text-xs font-semibold text-text-on-dark uppercase tracking-widest">Estado del kit</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-text-dim-on-dark">3/4 conectados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-xs text-text-dim-on-dark">1/4 reconectando</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
