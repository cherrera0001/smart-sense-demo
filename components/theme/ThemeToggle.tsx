'use client'

import { useTheme } from '@/lib/context/ThemeContext'
import { Sun, Moon, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Tema de la aplicación
        </label>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Elige cómo prefieres ver Smart Sense
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Light mode */}
        <button
          onClick={() => setTheme('light')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 min-h-[100px] justify-center ${
            theme === 'light'
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <Sun className="w-5 h-5" />
          <span className="text-xs font-semibold">Claro</span>
        </button>

        {/* Dark mode */}
        <button
          onClick={() => setTheme('dark')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 min-h-[100px] justify-center ${
            theme === 'dark'
              ? 'border-orange-500 bg-blue-900 text-white'
              : 'border-gray-700 bg-gray-900 text-gray-200 hover:border-gray-600'
          }`}
        >
          <Moon className="w-5 h-5" />
          <span className="text-xs font-semibold">Oscuro</span>
        </button>

        {/* System mode */}
        <button
          onClick={() => setTheme('system')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 min-h-[100px] justify-center ${
            theme === 'system'
              ? 'border-orange-500 bg-gradient-to-br from-gray-100 to-gray-900'
              : 'border-gray-600 bg-gradient-to-br from-gray-200 to-gray-700 hover:border-gray-500'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs font-semibold">Sistema</span>
        </button>
      </div>
    </div>
  )
}
