'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { Step1QR } from '@/components/onboarding/Step1QR'
import { Step2PairingLeds } from '@/components/onboarding/Step2PairingLeds'
import { Step3Tarifa } from '@/components/onboarding/Step3Tarifa'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const router = useRouter()
  const { markComplete } = useOnboarding()

  const handleStep1Next = () => setStep(2)
  const handleStep2Next = () => setStep(3)

  const handleStep3Complete = () => {
    markComplete()
    router.push('/dashboard')
  }

  return (
    <LayoutShell>
      {step === 1 && <Step1QR onNext={handleStep1Next} />}
      {step === 2 && <Step2PairingLeds onNext={handleStep2Next} />}
      {step === 3 && <Step3Tarifa onComplete={handleStep3Complete} />}
    </LayoutShell>
  )
}
