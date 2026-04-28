'use client'

import { useEffect, useState } from 'react'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { IPhoneFrame } from './IPhoneFrame'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

interface LayoutShellProps {
  children: React.ReactNode
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [showFrame, setShowFrame] = useLocalStorage('showIPhoneFrame', false)

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  if (!isDesktop) {
    return (
      <div className="flex flex-col min-h-screen w-full transition-colors duration-300" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {children}
        <div className="h-20" />
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex-1 ml-60 flex items-center justify-center p-8">
        <IPhoneFrame visible={showFrame}>
          <div className="flex flex-col min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {children}
            <div className="h-20" />
          </div>
        </IPhoneFrame>
      </div>
    </div>
  )
}
