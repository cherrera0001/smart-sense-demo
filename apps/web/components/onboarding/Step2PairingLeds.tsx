'use client'

import { useEffect, useState } from 'react'

interface Step2PairingLedsProps {
  onNext: () => void
}

interface Enchufe {
  id: string
  alias: string
  connected: boolean
}

const mockEnchufes: Enchufe[] = [
  { id: 'e1', alias: 'Refrigerador', connected: false },
  { id: 'e2', alias: 'Lavadora', connected: false },
  { id: 'e3', alias: 'Microondas', connected: false },
  { id: 'e4', alias: 'TV', connected: false },
]

export function Step2PairingLeds({ onNext }: Step2PairingLedsProps) {
  const [enchufes, setEnchufes] = useState<Enchufe[]>(mockEnchufes)

  useEffect(() => {
    enchufes.forEach((enc, idx) => {
      if (!enc.connected) {
        setTimeout(() => {
          setEnchufes(prev =>
            prev.map((e, i) => (i === idx ? { ...e, connected: true } : e))
          )
        }, 1500 * (idx + 1))
      }
    })
  }, [])

  const allConnected = enchufes.every(e => e.connected)

  useEffect(() => {
    if (allConnected) {
      const timer = setTimeout(onNext, 500)
      return () => clearTimeout(timer)
    }
  }, [allConnected, onNext])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ink p-4 pb-20">
      <div className="max-w-xs text-center">
        {/* Title */}
        <h1 className="text-2xl font-black text-text-on-dark mb-2">Emparejando enchufes</h1>
        <p className="text-sm text-text-dim-on-dark mb-8">
          Los LEDs deben pasar de azul (buscando) a verde (conectado).
        </p>

        {/* Enchufes */}
        <div className="space-y-3">
          {enchufes.map(enc => (
            <div
              key={enc.id}
              className="flex items-center gap-3 p-3 bg-ink-3 rounded-lg"
            >
              {/* LED */}
              <div
                className={`h-4 w-4 shrink-0 rounded-full transition-all duration-500 ${
                  enc.connected
                    ? 'bg-energy shadow-[0_0_10px_#00D87A] ring-0'
                    : 'bg-electric shadow-[0_0_6px_#5B7FFF] ring-2 ring-electric/40 animate-pulse'
                }`}
                aria-label={enc.connected ? 'Conectado' : 'Buscando red, LED azul'}
              />
              {/* Label */}
              <span className="text-sm text-text-on-dark flex-1">{enc.alias}</span>
              {/* Status */}
              <span className="text-xs text-text-dim-on-dark">
                {enc.connected ? '✓' : '…'}
              </span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-6 text-sm text-text-dim-on-dark">
          {enchufes.filter(e => e.connected).length} / {enchufes.length} conectados
        </div>
      </div>
    </div>
  )
}
