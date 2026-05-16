import { useEffect, useMemo, useState } from "react"

type StorageCollection = {
  name: string
  path: string
}

type StorageClient = {
  name: string
  path: string
  collections: StorageCollection[]
}

type StorageOptionsResponse = {
  storage_root: string
  clients: StorageClient[]
}

function UploadPage() {
  const [clients, setClients] = useState<StorageClient[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [newClientName, setNewClientName] = useState("")

  const [selectedCollection, setSelectedCollection] = useState("")
  const [newCollectionName, setNewCollectionName] = useState("")

  const [category, setCategory] = useState("lookbooks")
  const [workOrigin, setWorkOrigin] = useState("interno")
  const [uploadMode, setUploadMode] = useState("normal")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const [statusMessage, setStatusMessage] = useState("Carregando clientes e coleções existentes...")
  const [isLoading, setIsLoading] = useState(false)

  const selectedClientData = useMemo(() => {
    return clients.find((client) => client.name === selectedClient)
  }, [clients, selectedClient])

  const availableCollections = selectedClientData?.collections ?? []

  const finalClientName = newClientName.trim() || selectedClient
  const finalCollectionName = newCollectionName.trim() || selectedCollection

  async function loadStorageOptions() {
    try {
      setStatusMessage("Carregando clientes e coleções existentes...")

      const response = await fetch("http://localhost:8000/storage/options")
      const data: StorageOptionsResponse = await response.json()

      setClients(data.clients)

      if (data.clients.length > 0) {
        const firstClient = data.clients[0]
        setSelectedClient(firstClient.name)

        if (firstClient.collections.length > 0) {
          setSelectedCollection(firstClient.collections[0].name)
        }
      }

      setStatusMessage("Clientes e coleções carregados.")
    } catch (error) {
      console.error(error)
      setStatusMessage("Não foi possível carregar clientes e coleções existentes.")
    }
  }

  useEffect(() => {
    loadStorageOptions()
  }, [])

  useEffect(() => {
    if (availableCollections.length > 0) {
      setSelectedCollection(availableCollections[0].name)
    } else {
      setSelectedCollection("")
    }
  }, [selectedClient])

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
    if (!finalClientName) {
      setStatusMessage("Informe ou selecione um cliente.")
      return
    }

    if (!finalCollectionName) {
      setStatusMessage("Informe ou selecione uma coleção.")
      return
    }

    if (selectedFiles.length === 0) {
      setStatusMessage("Selecione ao menos um arquivo.")
      return
    }

    try {
      setIsLoading(true)
      setStatusMessage("Enviando arquivos para a API...")

      const formData = new FormData()

      formData.append("client_name", finalClientName)
      formData.append("collection_name", finalCollectionName)
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
      await loadStorageOptions()
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
        Selecione um cliente/coleção existente ou digite um novo. O StudioFlow confere a estrutura e cria as pastas que faltarem.
      </p>

      <section
        style={{
          maxWidth: "760px",
          padding: "24px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Cliente existente
          </label>

          <select
            value={selectedClient}
            onChange={(event) => {
              setSelectedClient(event.target.value)
              setNewClientName("")
              setNewCollectionName("")
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              marginBottom: "8px",
            }}
          >
            <option value="">Nenhum cliente selecionado</option>

            {clients.map((client) => (
              <option key={client.path} value={client.name}>
                {client.name}
              </option>
            ))}
          </select>

          <input
            value={newClientName}
            onChange={(event) => {
              setNewClientName(event.target.value)
              setSelectedClient("")
              setSelectedCollection("")
            }}
            placeholder="Ou digite um novo cliente"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
            Coleção existente
          </label>

          <select
            value={selectedCollection}
            onChange={(event) => {
              setSelectedCollection(event.target.value)
              setNewCollectionName("")
            }}
            disabled={!selectedClient || availableCollections.length === 0}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              marginBottom: "8px",
            }}
          >
            <option value="">Nenhuma coleção selecionada</option>

            {availableCollections.map((collection) => (
              <option key={collection.path} value={collection.name}>
                {collection.name}
              </option>
            ))}
          </select>

          <input
            value={newCollectionName}
            onChange={(event) => {
              setNewCollectionName(event.target.value)
              setSelectedCollection("")
            }}
            placeholder="Ou digite uma nova coleção"
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

        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#f3f4f6",
            color: "#374151",
          }}
        >
          <strong>Destino selecionado:</strong>
          <br />
          Cliente: {finalClientName || "—"}
          <br />
          Coleção: {finalCollectionName || "—"}
          <br />
          Categoria: {category}
          <br />
          Modo: {uploadMode}
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