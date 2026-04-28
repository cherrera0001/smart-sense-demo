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

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Claro',
      icon: Sun,
      activeStyle: {
        borderColor: 'var(--brand-primary)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      },
      inactiveStyle: {
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--surface-secondary)',
        color: 'var(--text-secondary)',
      },
    },
    {
      value: 'dark' as const,
      label: 'Oscuro',
      icon: Moon,
      activeStyle: {
        borderColor: 'var(--brand-primary)',
        backgroundColor: 'var(--surface-primary)',
        color: 'var(--text-primary)',
      },
      inactiveStyle: {
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--surface-secondary)',
        color: 'var(--text-secondary)',
      },
    },
    {
      value: 'system' as const,
      label: 'Sistema',
      icon: Settings,
      activeStyle: {
        borderColor: 'var(--brand-primary)',
        backgroundColor: 'var(--surface-primary)',
        color: 'var(--text-primary)',
      },
      inactiveStyle: {
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--surface-secondary)',
        color: 'var(--text-secondary)',
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
          Tema de la aplicación
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Elige cómo prefieres ver Smart Sense
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.value
          const style = isActive ? option.activeStyle : option.inactiveStyle

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '2px solid',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 150ms ease-in-out',
                ...style,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.opacity = '0.8'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.opacity = '1'
                }
              }}
            >
              <Icon style={{ width: '1.25rem', height: '1.25rem' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
