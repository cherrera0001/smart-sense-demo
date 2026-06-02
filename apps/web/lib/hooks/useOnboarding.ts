'use client'

import { useEffect, useState } from 'react'

export function useOnboarding() {
  const [isDone, setIsDone] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('onboardingDone') === 'true'
    setIsDone(done)
    setMounted(true)
  }, [])

  const markComplete = () => {
    localStorage.setItem('onboardingDone', 'true')
    setIsDone(true)
  }

  const reset = () => {
    localStorage.removeItem('onboardingDone')
    setIsDone(false)
  }

  return { isDone, mounted, markComplete, reset }
}
