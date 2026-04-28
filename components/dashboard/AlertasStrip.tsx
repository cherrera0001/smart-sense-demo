'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { alertas } from '@/lib/mock-data'
import { formatCLP } from '@/lib/format'
import { AlertCircle, Lightbulb, AlertTriangle, ChevronRight, Zap, Eye, EyeOff } from 'lucide-react'

export function AlertasStrip() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const alert = alertas.find(a => a.id === selectedAlert)
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set(alertas.filter(a => a.leida).map(a => a.id)))

  const getAlertStyle = (tipo: string) => {
    if (tipo === 'anomalia') {
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        badgeVariant: 'warning' as const,
        severityLabel: 'Anomalía detectada',
        accentColor: 'var(--severity-warning)',
      }
    }
    if (tipo === 'sugerencia') {
      return {
        icon: <Lightbulb className="w-5 h-5" />,
        badgeVariant: 'info' as const,
        severityLabel: 'Sugerencia',
        accentColor: 'var(--severity-info)',
      }
    }
    return {
      icon: <AlertCircle className="w-5 h-5" />,
      badgeVariant: 'critical' as const,
      severityLabel: 'Crítica',
      accentColor: 'var(--severity-critical)',
    }
  }

  const handleToggleRead = (id: string) => {
    const newRead = new Set(readAlerts)
    if (newRead.has(id)) {
      newRead.delete(id)
    } else {
      newRead.add(id)
    }
    setReadAlerts(newRead)
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Alertas predictivas</h2>
          <p className="text-sm text-text-secondary">Recomendaciones inteligentes para optimizar tu consumo</p>
        </div>

        {/* Alert Cards Grid */}
        <div className="grid grid-cols-1 gap-4 pt-2">
          {alertas.map(a => {
            const styles = getAlertStyle(a.tipo)
            const isRead = readAlerts.has(a.id)
            const isNew = !isRead && a.leida === false

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAlert(a.id)}
                className="group alert-card hover:border-text-tertiary/30 focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2"
              >
                <div className="space-y-4">
                  {/* Top Row: Badge + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant={styles.badgeVariant} className="gap-2 px-3 py-1.5">
                      <div style={{color: styles.accentColor}}>{styles.icon}</div>
                      <span>{styles.severityLabel}</span>
                    </Badge>
                    <div className="flex items-center gap-2">
                      {isNew && <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />}
                      <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-base font-semibold text-text-primary leading-snug">
                      {a.titulo}
                    </h3>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                    {a.mensaje}
                  </p>

                  {/* Impact + Estimated Savings */}
                  {a.ahorroEstimadoClp && (
                    <div className="flex items-baseline gap-3 pt-2 border-t border-text-tertiary/10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-caption font-medium">Ahorro estimado:</span>
                        <span className="text-lg font-bold tabular" style={{color: styles.accentColor}}>
                          {formatCLP(a.ahorroEstimadoClp)}
                        </span>
                      </div>
                      <span className="text-xs text-text-tertiary">/mes</span>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex gap-2 pt-1">
                    <span className="flex-1 text-xs font-semibold text-brand-primary group-hover:underline py-2 px-3 rounded-md transition-colors duration-200">
                      Ver detalle →
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleRead(a.id)
                      }}
                      className="p-2 hover:bg-text-tertiary/8 rounded-md transition-colors"
                      title={isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                      type="button"
                    >
                      {isRead ? (
                        <Eye className="w-4 h-4 text-text-tertiary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Premium */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        {alert && (() => {
          const styles = getAlertStyle(alert.tipo)
          const isRead = readAlerts.has(alert.id)

          return (
            <div className="space-y-8">
              {/* Header Section */}
              <div className="space-y-4 pb-6 border-b border-text-tertiary/15">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-full bg-gradient-to-br" style={{
                      background: `linear-gradient(135deg, var(--severity-${alert.tipo === 'anomalia' ? 'warning' : alert.tipo === 'sugerencia' ? 'info' : 'critical'}-gradient-from), var(--severity-${alert.tipo === 'anomalia' ? 'warning' : alert.tipo === 'sugerencia' ? 'info' : 'critical'}-gradient-to))`
                    }}>
                      <div style={{color: styles.accentColor}}>{styles.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 border" style={{...styles.badgeStyle, borderWidth: '1px'}}>
                        <span>{styles.severityLabel}</span>
                        {!isRead && <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                        {alert.titulo}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <p className="text-base text-text-secondary leading-relaxed">
                  {alert.mensaje}
                </p>
              </div>

              {/* Savings Highlight */}
              {alert.ahorroEstimadoClp && (
                <div className="alert-modal-highlight">
                  <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">💡 Potencial de ahorro</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-brand-primary tabular">
                      {formatCLP(alert.ahorroEstimadoClp)}
                    </p>
                    <p className="text-sm text-text-secondary font-medium">/mes</p>
                  </div>
                  <p className="text-xs text-text-tertiary pt-2">Si implementas esta recomendación hoy</p>
                </div>
              )}

              {/* Action Section */}
              <div className="flex gap-3 pt-4 border-t border-text-tertiary/15">
                <button
                  onClick={() => {
                    handleToggleRead(alert.id)
                    setSelectedAlert(null)
                  }}
                  className="flex-1 btn-primary shadow-md hover:shadow-lg text-sm"
                  type="button"
                >
                  Marcar como leído
                </button>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="btn-secondary px-6 text-sm"
                  type="button"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )
        })()}
      </Dialog>
    </>
  )
}
