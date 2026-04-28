export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-ink text-text-on-dark flex items-center justify-center p-6">
      <section className="max-w-md w-full rounded-xl border border-text-tertiary/20 bg-surface-primary p-6 text-center space-y-3">
        <h1 className="text-2xl font-bold">Sin conexion</h1>
        <p className="text-sm text-text-secondary">
          Home Energy no puede cargar datos en este momento. Revisa tu conexion y vuelve a intentar.
        </p>
      </section>
    </main>
  )
}
