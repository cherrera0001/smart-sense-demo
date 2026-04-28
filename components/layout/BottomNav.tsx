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
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around bg-ink-2 border-t border-text-dim pb-[env(safe-area-inset-bottom,0px)]">
      {navItems.map(item => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full py-3 text-xs transition-colors ${
              isActive ? 'text-energy' : 'text-text-dim hover:text-text-on-dark'
            }`}
          >
            <Icon className="h-6 w-6 mb-1" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
