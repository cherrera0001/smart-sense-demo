'use client'

import { RayoSvg } from '@/components/shared/RayoSvg'

interface Step1QRProps {
  onNext: () => void
}

export function Step1QR({ onNext }: Step1QRProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ink p-4 pb-20">
      <div className="max-w-xs text-center">
        {/* Icon */}
        <div className="mb-6">
          <RayoSvg className="w-16 h-16 text-energy mx-auto" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-text-on-dark mb-2">Kit recibido</h1>
        <p className="text-sm text-text-dim-on-dark mb-8">
          Escanea el código QR en la caja para emparejar tus enchufes inteligentes.
        </p>

        {/* Mock QR */}
        <div className="bg-white rounded-lg p-6 mb-8 w-48 h-48 mx-auto flex items-center justify-center">
          <div className="w-40 h-40 bg-ink-3 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-black text-gold mb-2">SS</div>
              <p className="text-xs text-text-dim">Smart Sense</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onNext}
          className="w-full bg-energy text-ink font-semibold py-3 rounded-lg hover:bg-energy-dk transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
