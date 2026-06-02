'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  // Determine effective theme
  useEffect(() => {
    if (!mounted) return

    let effective: 'light' | 'dark' = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' :
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    setEffectiveTheme(effective)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(effective)
  }, [theme, mounted])

  // Load from localStorage and listen to system changes
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) setThemeState(stored)
    setMounted(true)

    if (stored === 'system' || !stored) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light')
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
