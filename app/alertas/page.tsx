'use client'

import { useState } from 'react'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogClose } from '@/components/ui/dialog'
import { alertas as mockAlertas } from '@/lib/mock-data'
import { formatCLP } from '@/lib/format'
import { AlertTriangle, Lightbulb, AlertCircle, Check, Eye } from 'lucide-react'

export default function AlertasPage() {
  const [alertas, setAlertas] = useState(mockAlertas)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const getAlertStyle = (tipo: string) => {
    if (tipo === 'anomalia') {
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        badgeVariant: 'warning' as const,
        severityLabel: 'Anomalía',
        accentColor: 'var(--severity-warning)',
        iconColor: 'text-severity-warning',
      }
    }
    if (tipo === 'sugerencia') {
      return {
        icon: <Lightbulb className="w-5 h-5" />,
        badgeVariant: 'info' as const,
        severityLabel: 'Sugerencia',
        accentColor: 'var(--severity-info)',
        iconColor: 'text-severity-info',
      }
    }
    return {
      icon: <AlertCircle className="w-5 h-5" />,
      badgeVariant: 'critical' as const,
      severityLabel: 'Crítica',
      accentColor: 'var(--severity-critical)',
      iconColor: 'text-severity-critical',
    }
  }

  const handleAcknowledge = (id: string) => {
    setAlertas(prev => prev.map(a => (a.id === id ? { ...a, leida: true } : a)))
    setSelectedId(null)
  }

  const selected = alertas.find(a => a.id === selectedId)
  const sin_leer = alertas.filter(a => !a.leida)

  return (
    <LayoutShell>
      <div className="pb-24">
        {/* Header */}
        <div className="page-header space-y-3">
          <h1 className="page-title">Alertas predictivas</h1>
          <p className="page-subtitle">
            {sin_leer.length} nuevas alertas sin revisar
          </p>
        </div>

        {/* Alertas Grid - Estandarizado */}
        <div className="page-section">
          {alertas.length === 0 ? (
            <div className="text-center py-12">
              <Check className="w-12 h-12 text-success mx-auto mb-4 opacity-60" />
              <p className="text-text-secondary">Todas las alertas han sido revisadas</p>
            </div>
          ) : (
            alertas.map(alerta => {
              const styles = getAlertStyle(alerta.tipo)
              const isNew = !alerta.leida

              return (
                <div
                  key={alerta.id}
                  onClick={() => setSelectedId(alerta.id)}
                  className={`alert-card ${
                    isNew
                      ? 'alert-card-new hover:border-text-tertiary/30'
                      : 'hover:border-text-tertiary/30 opacity-80'
                  } focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2`}
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
                        {alerta.leida && <Eye className="w-4 h-4 text-text-tertiary" />}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-base font-semibold text-text-primary leading-snug">
                        {alerta.titulo}
                      </h3>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                      {alerta.mensaje}
                    </p>

                    {/* Impact + Estimated Savings */}
                    {alerta.ahorroEstimadoClp && (
                      <div className="flex items-baseline gap-3 pt-2 border-t border-text-tertiary/10">
                        <div className="flex items-baseline gap-1">
                        <span className="text-caption font-medium">Ahorro estimado:</span>
                          <span className="text-lg font-bold tabular" style={{color: styles.accentColor}}>
                            {formatCLP(alerta.ahorroEstimadoClp)}
                          </span>
                        </div>
                        <span className="text-xs text-text-tertiary">/mes</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Premium */}
      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        {selected && (() => {
          const styles = getAlertStyle(selected.tipo)

          return (
            <div className="space-y-8">
              {/* Header Section */}
              <div className="space-y-4 pb-6 border-b border-text-tertiary/15">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-full bg-gradient-to-br" style={{
                      background: `linear-gradient(135deg, var(--severity-${selected.tipo === 'anomalia' ? 'warning' : selected.tipo === 'sugerencia' ? 'info' : 'critical'}-gradient-from), var(--severity-${selected.tipo === 'anomalia' ? 'warning' : selected.tipo === 'sugerencia' ? 'info' : 'critical'}-gradient-to))`
                    }}>
                      <div style={{color: styles.accentColor}}>{styles.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant={styles.badgeVariant} className="mb-3 gap-2">
                        <span>{styles.severityLabel}</span>
                        {!selected.leida && <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                      </Badge>
                      <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                        {selected.titulo}
                      </h2>
                    </div>
                  </div>
                  <DialogClose onClick={() => setSelectedId(null)} className="text-text-tertiary hover:text-text-secondary transition-colors" />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <p className="text-base text-text-secondary leading-relaxed">
                  {selected.mensaje}
                </p>
              </div>

              {/* Savings Highlight */}
              {selected.ahorroEstimadoClp && (
                <div className="alert-modal-highlight">
                  <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">💡 Potencial de ahorro</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-brand-primary tabular">
                      {formatCLP(selected.ahorroEstimadoClp)}
                    </p>
                    <p className="text-sm text-text-secondary font-medium">/mes</p>
                  </div>
                  <p className="text-xs text-text-tertiary pt-2">Si implementas esta recomendación hoy</p>
                </div>
              )}

              {/* Action Section */}
              <div className="flex gap-3 pt-4 border-t border-text-tertiary/15">
                {!selected.leida && (
                  <button
                    onClick={() => handleAcknowledge(selected.id)}
                    className="flex-1 btn-primary shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Marcar como leído
                  </button>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  className="btn-secondary px-6 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )
        })()}
      </Dialog>
    </LayoutShell>
  )
}
