'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import { LayoutShell } from '@/components/layout/LayoutShell'

export default function Page() {
  const router = useRouter()
  const { isDone, mounted } = useOnboarding()

  useEffect(() => {
    if (!mounted) return
    if (isDone) {
      router.push('/dashboard')
    } else {
      router.push('/onboarding')
    }
  }, [isDone, mounted, router])

  return (
    <LayoutShell>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-pulse text-energy text-2xl font-bold">Smart Sense</div>
        </div>
      </div>
    </LayoutShell>
  )
}
