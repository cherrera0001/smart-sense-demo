export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <section className="max-w-md w-full card-premium text-center space-y-3">
        <h1 className="text-h2">Sin conexión</h1>
        <p className="text-body">
          Home Energy no puede cargar datos en este momento. Revisa tu conexión y vuelve a intentar.
        </p>
      </section>
    </main>
  )
}
