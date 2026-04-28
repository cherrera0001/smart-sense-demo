'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Zap, AlertCircle, BarChart3, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/desglose', label: 'Desglose', icon: Zap },
  { href: '/alertas', label: 'Alertas', icon: AlertCircle },
  { href: '/reporte', label: 'Reporte', icon: BarChart3 },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around border-t pb-[env(safe-area-inset-bottom,0px)] transition-colors duration-300 backdrop-blur-sm"
      style={{ background: 'var(--surface-primary)', borderColor: 'var(--border-color)' }}
    >
      {navItems.map(item => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center w-full py-3 text-[12px] font-medium transition-colors"
            style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5 mb-1" strokeWidth={isActive ? 2.4 : 2} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
