import { useState } from "react"

function UploadPage() {
  const [clientName, setClientName] = useState("Bremo")
  const [collectionName, setCollectionName] = useState("Primavera Verao 2027")
  const [category, setCategory] = useState("lookbooks")
  const [workOrigin, setWorkOrigin] = useState("interno")
  const [uploadMode, setUploadMode] = useState("normal")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [statusMessage, setStatusMessage] = useState("Selecione os arquivos para upload.")
  const [isLoading, setIsLoading] = useState(false)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)

    if (files.length === 0) {
      setStatusMessage("Nenhum arquivo selecionado.")
      return
    }

    setStatusMessage(`${files.length} arquivo(s) selecionado(s).`)
  }

  async function handleUpload() {
    try {
      setIsLoading(true)
      setStatusMessage("Enviando arquivos para a API...")

      const formData = new FormData()

      formData.append("client_name", clientName)
      formData.append("collection_name", collectionName)
      formData.append("category", category)
      formData.append("work_origin", workOrigin)
      formData.append("upload_mode", uploadMode)

      selectedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409 && data.detail?.duplicate_files) {
          setStatusMessage(
            `Arquivo(s) duplicado(s): ${data.detail.duplicate_files.join(", ")}`,
          )
          return
        }

        setStatusMessage(data.detail?.message ?? "Erro ao enviar upload.")
        return
      }

      setStatusMessage(
        `${data.message}. ${data.saved_files.length} arquivo(s) salvo(s).`,
      )

      console.log("Resposta do upload:", data)
    } catch (error) {
      console.error(error)
      setStatusMessage("Erro ao conectar com a API.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        backgroundColor: "#f9fafb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: "8px",
          fontSize: "32px",
          color: "#111827",
        }}
      >
        Upload de Arquivos
      </h1>

      <p
        style={{
          marginTop: 0,
          marginBottom: "24px",
          color: "#4b5563",
        }}
      >
        Envie arquivos para cliente, coleção e categoria. O StudioFlow criará a estrutura e salvará os arquivos no destino correto.
      </p>

      <section
        style={{
          maxWidth: "720px",
          padding: "24px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Cliente
          </label>
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Coleção
          </label>
          <input
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Categoria
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="lookbooks">Lookbooks</option>
            <option value="stills">Stills</option>
            <option value="conceitos">Conceitos</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Origem do trabalho
          </label>
          <select
            value={workOrigin}
            onChange={(event) => setWorkOrigin(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="interno">Interno</option>
            <option value="terceiro">Terceiro</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Modo de upload
          </label>
          <select
            value={uploadMode}
            onChange={(event) => setUploadMode(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="normal">Normal — entra na fila de tratamento</option>
            <option value="finalizado">Finalizado — vai direto para finalizadas</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Arquivos
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        {selectedFiles.length > 0 && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "#f3f4f6",
            }}
          >
            <strong>Arquivos selecionados:</strong>
            <ul>
              {selectedFiles.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={isLoading || selectedFiles.length === 0}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: selectedFiles.length === 0 ? "#9ca3af" : "#6d28d9",
            color: "#ffffff",
            fontWeight: 700,
            cursor: selectedFiles.length === 0 ? "not-allowed" : "pointer",
            marginBottom: "16px",
          }}
        >
          {isLoading ? "Enviando..." : "Enviar Upload"}
        </button>

        <div
          style={{
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            color: "#374151",
            textAlign: "center",
          }}
        >
          {statusMessage}
        </div>
      </section>
    </main>
  )
}

export default UploadPage