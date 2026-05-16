type HomePageProps = {
  onGoToUpload: () => void
  onGoToTreatmentQueue: () => void
  onLogout: () => void
}

function HomePage({ onGoToUpload, onGoToTreatmentQueue, onLogout }: HomePageProps) {
  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f9fafb", fontFamily: "Arial" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1>StudioFlow</h1>
          <p>Tela inicial operacional</p>
        </div>

        <button onClick={onLogout}>Sair</button>
      </header>

      <section style={{ display: "flex", gap: 16 }}>
        <button onClick={onGoToUpload}>Ir para Upload</button>
        <button onClick={onGoToTreatmentQueue}>Ir para Fila de Tratamento</button>
      </section>
    </main>
  )
}

export default HomePage