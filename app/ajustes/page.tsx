'use client'

import { LayoutShell } from '@/components/layout/LayoutShell'
import { Badge } from '@/components/ui/badge'
import { enchufes as mockEnchufes, tarifa } from '@/lib/mock-data'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function AjustesPage() {
  return (
    <LayoutShell>
      <div className="pb-24">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Ajustes</h1>
          <p className="page-subtitle">Configura tu experiencia</p>
        </div>

        {/* Content Section */}
        <div className="page-section">
          {/* Tarifa */}
          <div className="card-premium">
            <div className="card-header">
              <h2 className="card-title">Tarifa actual</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="card-subtitle mb-2">Tipo</p>
                <p className="text-sm font-semibold text-text-primary">{tarifa.tipo}</p>
              </div>
              <div>
                <p className="card-subtitle mb-2">Costo</p>
                <p className="text-sm font-semibold text-severity-warning">${tarifa.clpKwh}/kWh</p>
              </div>
              <div>
                <p className="card-subtitle mb-2">Comuna</p>
                <p className="text-sm font-semibold text-text-primary">{tarifa.comuna}</p>
              </div>
              <div>
                <p className="card-subtitle mb-2">Distribuidora</p>
                <p className="text-sm font-semibold text-text-primary">{tarifa.distribuidora}</p>
              </div>
            </div>
            <button className="w-full mt-4 btn-primary btn-small hover:bg-brand-primary-dark">
              Cambiar tarifa
            </button>
          </div>

          {/* Estado del Kit */}
          <div className="card-premium">
            <div className="card-header">
              <h2 className="card-title">Estado de enchufes</h2>
            </div>
            <div className="space-y-3">
              {mockEnchufes.map(enc => {
                const isOnline = enc.estado === 'online'
                const isReconnecting = enc.estado === 'reconectando'
                const bgColor = isOnline ? 'bg-success/10' : isReconnecting ? 'bg-warning/10' : 'bg-error/10'
                const borderColor = isOnline ? 'border-success/40' : isReconnecting ? 'border-warning/40' : 'border-error/40'
                const iconColor = isOnline ? 'text-success' : isReconnecting ? 'text-warning animate-spin' : 'text-error'
                const badgeVariant = isOnline ? 'success' : isReconnecting ? 'warning' : 'error'

                return (
                  <div
                    key={enc.id}
                    className={`flex items-center justify-between p-4 ${bgColor} rounded-lg border ${borderColor} hover:shadow-sm transition-all duration-200`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isOnline ? (
                        <Wifi className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
                      ) : isReconnecting ? (
                        <RefreshCw className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
                      ) : (
                        <WifiOff className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {enc.alias}
                        </p>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {enc.dispositivoAsociado}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <Badge variant={badgeVariant as any} className="text-xs font-bold">
                        {isOnline ? 'Online' : isReconnecting ? 'Reconectando' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notificaciones */}
          <div className="card-premium">
            <div className="card-header">
              <h2 className="card-title">Notificaciones</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Alertas', desc: 'Notificaciones de anomalías detectadas' },
                { label: 'Recomendaciones', desc: 'Tips personalizados de ahorro' },
                { label: 'Tips de ahorro', desc: 'Consejos semanales' }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-surface-secondary/40 rounded-lg border border-text-tertiary/20 hover:border-text-tertiary/40 transition-all duration-200">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded cursor-pointer accent-success"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  )
}
