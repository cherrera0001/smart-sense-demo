import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smart Sense · Demo',
  description: 'Mock consumo eléctrico en CLP para defensa de emprendimiento',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Home Energy',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0F1B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-ink">{children}</body>
    </html>
  )
}
