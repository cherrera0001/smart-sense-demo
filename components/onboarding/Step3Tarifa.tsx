'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Step3TarifaProps {
  onComplete: () => void
}

export function Step3Tarifa({ onComplete }: Step3TarifaProps) {
  const [tarifa, setTarifa] = useState('BT-1')
  const [comuna, setComuna] = useState('Coquimbo')

  const comunas = [
    'Arica',
    'Iquique',
    'Antofagasta',
    'Copiapó',
    'La Serena',
    'Valparaíso',
    'Santiago',
    'Rancagua',
    'Talca',
    'Concepción',
    'Los Ángeles',
    'Temuco',
    'Valdivia',
    'Puerto Montt',
    'Coyhaique',
    'Punta Arenas',
    'Coquimbo',
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ink p-4 pb-20">
      <div className="max-w-xs w-full">
        {/* Title */}
        <h1 className="text-2xl font-black text-text-on-dark mb-2">Configura tu tarifa</h1>
        <p className="text-sm text-text-dim-on-dark mb-8">
          Selecciona tu tipo de tarifa y comuna para cálculos precisos en CLP.
        </p>

        {/* Form */}
        <div className="space-y-4">
          {/* Tarifa */}
          <div>
            <label className="block text-xs font-semibold text-text-on-dark mb-2">
              Tipo de tarifa
            </label>
            <Select
              value={tarifa}
              onChange={e => setTarifa(e.target.value)}
            >
              <option value="BT-1">BT-1 (Residencial)</option>
              <option value="BT-1A">BT-1A (Residencial con demanda)</option>
            </Select>
          </div>

          {/* Comuna */}
          <div>
            <label className="block text-xs font-semibold text-text-on-dark mb-2">
              Comuna
            </label>
            <Select
              value={comuna}
              onChange={e => setComuna(e.target.value)}
            >
              {comunas.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          {/* Info */}
          <div className="bg-ink-3 rounded-lg p-3 text-xs text-text-dim-on-dark">
            <p className="mb-2 font-semibold text-text-on-dark">Tarifa seleccionada</p>
            <p>
              {tarifa} · {comuna} · $165/kWh
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onComplete}
          className="w-full mt-6 bg-energy text-ink font-semibold py-3 rounded-lg hover:bg-energy-dk transition-colors"
        >
          Empezar
        </button>
      </div>
    </div>
  )
}
