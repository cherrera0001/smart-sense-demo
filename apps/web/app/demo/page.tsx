'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { RayoSvg } from '@/components/shared/RayoSvg'

export default function DemoPage() {
  const router = useRouter()
  const { reset } = useOnboarding()
  const [showFrame, setShowFrame] = useLocalStorage('showIPhoneFrame', false)

  const handleResetOnboarding = () => {
    reset()
    router.push('/onboarding')
  }

  const routes = [
    { href: '/dashboard', label: 'Dashboard (Inicio)' },
    { href: '/desglose', label: 'Desglose por Firma' },
    { href: '/alertas', label: 'Alertas' },
    { href: '/reporte', label: 'Reporte Semanal' },
    { href: '/ajustes', label: 'Ajustes' },
  ]

  return (
    <LayoutShell>
      <div className="pb-24">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <RayoSvg className="w-6 h-6 text-energy" />
            <h1 className="hero-large text-energy">Demo</h1>
          </div>

          {/* Quick Nav */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ir a página</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {routes.map(route => (
                <Link key={route.href} href={route.href} className="block">
                  <Button variant="outline" className="w-full text-left justify-start">
                    {route.label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Reset Onboarding */}
          <Card className="border-warn/30 bg-warn/5">
            <CardHeader>
              <CardTitle className="text-base text-warn">Onboarding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-dim-on-dark mb-3">
                Reinicia el flujo de onboarding para verlo de nuevo desde el Paso 1.
              </p>
              <Button
                variant="secondary"
                onClick={handleResetOnboarding}
                className="w-full text-white"
              >
                Resetear Onboarding
              </Button>
            </CardContent>
          </Card>

          {/* iPhone Frame Toggle */}
          <Card className="border-electric/30 bg-electric/5">
            <CardHeader>
              <CardTitle className="text-base text-electric">iPhone Frame</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-dim-on-dark mb-3">
                {showFrame ? 'Frame visible' : 'Frame oculto'}. Toggle para demo en defensa.
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowFrame(!showFrame)}
                className="w-full text-white"
              >
                {showFrame ? 'Ocultar frame' : 'Mostrar frame'} (Desktop)
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="text-xs text-text-dim-on-dark bg-ink-3 rounded-lg p-4">
            <p className="mb-2 font-semibold">ℹ Instrucciones:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Usa esta página para navegar rápido durante dev/defensa</li>
              <li>El frame de iPhone es solo visible en desktop (≥768px)</li>
              <li>Resetea onboarding si necesitas verlo de nuevo</li>
              <li>Todos los datos son mock estáticos</li>
            </ul>
          </div>
        </div>
      </div>
    </LayoutShell>
  )
}
