import { useEffect, useMemo, useState } from "react"

type QueueFile = {
  file_name: string
  path: string
}

type QueueItem = {
  item_type: "file" | "reference"
  client_name: string
  collection_name: string
  category: string
  reference_code: string
  file_name: string | null
  file_count: number
  files: QueueFile[]
}

type QueueResponse = {
  total: number
  items: QueueItem[]
}

type ClientSummary = {
  client_name: string
  stills_count: number
  lookbooks_count: number
  conceitos_count: number
  total_count: number
}

const categories = [
  { key: "stills", label: "Stills" },
  { key: "lookbooks", label: "Lookbooks" },
  { key: "conceitos", label: "Conceitos" },
]

function TreatmentQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [search, setSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [statusMessage, setStatusMessage] = useState("Carregando fila...")
  const [isLoading, setIsLoading] = useState(false)

  async function loadQueue(searchValue = "") {
    try {
      setIsLoading(true)
      setStatusMessage("Carregando fila de tratamento...")

      const query = searchValue.trim()
        ? `?search=${encodeURIComponent(searchValue.trim())}`
        : ""

      const response = await fetch(`http://localhost:8000/queue${query}`)
      const data: QueueResponse = await response.json()

      setItems(data.items)
      setStatusMessage(`${data.total} item(ns) encontrado(s).`)
    } catch (error) {
      console.error(error)
      setStatusMessage("Erro ao carregar fila de tratamento.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  const clientSummaries = useMemo(() => {
    const summariesByClient = new Map<string, ClientSummary>()

    items.forEach((item) => {
      const existingSummary = summariesByClient.get(item.client_name)

      const summary =
        existingSummary ??
        {
          client_name: item.client_name,
          stills_count: 0,
          lookbooks_count: 0,
          conceitos_count: 0,
          total_count: 0,
        }

      if (item.category === "stills") {
        summary.stills_count += 1
      }

      if (item.category === "lookbooks") {
        summary.lookbooks_count += 1
      }

      if (item.category === "conceitos") {
        summary.conceitos_count += 1
      }

      summary.total_count += 1
      summariesByClient.set(item.client_name, summary)
    })

    return Array.from(summariesByClient.values()).sort((a, b) =>
      a.client_name.localeCompare(b.client_name),
    )
  }, [items])

  const selectedClientItems = useMemo(() => {
    if (!selectedClient) {
      return []
    }

    return items.filter((item) => item.client_name === selectedClient)
  }, [items, selectedClient])

  const selectedClientCategoryCounts = useMemo(() => {
    return categories.map((category) => {
      const count = selectedClientItems.filter(
        (item) => item.category === category.key,
      ).length

      return {
        ...category,
        count,
      }
    })
  }, [selectedClientItems])

  const visibleItems = useMemo(() => {
    if (!selectedClient || !selectedCategory) {
      return []
    }

    return items.filter(
      (item) =>
        item.client_name === selectedClient &&
        item.category === selectedCategory,
    )
  }, [items, selectedClient, selectedCategory])

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSelectedClient("")
    setSelectedCategory("")
    loadQueue(search)
  }

  function handleClearSearch() {
    setSearch("")
    setSelectedClient("")
    setSelectedCategory("")
    loadQueue("")
  }

  function handleSelectClient(clientName: string) {
    setSelectedClient(clientName)
    setSelectedCategory("")
  }

  function handleBackToClients() {
    setSelectedClient("")
    setSelectedCategory("")
  }

  function handleBackToCategories() {
    setSelectedCategory("")
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
        Fila de Tratamento
      </h1>

      <p
        style={{
          marginTop: 0,
          marginBottom: "24px",
          color: "#4b5563",
        }}
      >
        Escolha um cliente, depois uma categoria, e então selecione os itens para trabalhar.
      </p>

      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          maxWidth: "920px",
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por cliente, coleção, referência ou trecho do arquivo. Ex: -C1"
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Pesquisar
        </button>

        <button
          type="button"
          onClick={handleClearSearch}
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "#111827",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Limpar
        </button>
      </form>

      <div
        style={{
          maxWidth: "920px",
          marginBottom: "16px",
          padding: "12px",
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          color: "#374151",
        }}
      >
        {statusMessage}
      </div>

      {!selectedClient && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {clientSummaries.map((client) => (
            <button
              key={client.client_name}
              type="button"
              onClick={() => handleSelectClient(client.client_name)}
              style={{
                textAlign: "left",
                padding: "20px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "12px",
                  color: "#111827",
                }}
              >
                {client.client_name}
              </h2>

              <p style={{ margin: "6px 0", color: "#374151" }}>
                <strong>{client.stills_count}</strong> stills
              </p>

              <p style={{ margin: "6px 0", color: "#374151" }}>
                <strong>{client.lookbooks_count}</strong> lookbooks
              </p>

              <p style={{ margin: "6px 0", color: "#374151" }}>
                <strong>{client.conceitos_count}</strong> conceitos
              </p>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#6d28d9",
                  fontWeight: 700,
                }}
              >
                Total: {client.total_count} item(ns)
              </p>
            </button>
          ))}
        </section>
      )}

      {selectedClient && !selectedCategory && (
        <section>
          <button
            type="button"
            onClick={handleBackToClients}
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              border: "none",
              borderRadius: "10px",
              backgroundColor: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Voltar para clientes
          </button>

          <h2
            style={{
              marginTop: 0,
              marginBottom: "16px",
              color: "#111827",
            }}
          >
            {selectedClient}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {selectedClientCategoryCounts.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                disabled={category.count === 0}
                style={{
                  textAlign: "left",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb",
                  cursor: category.count === 0 ? "not-allowed" : "pointer",
                  opacity: category.count === 0 ? 0.55 : 1,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    color: "#111827",
                  }}
                >
                  {category.label}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#6d28d9",
                    fontWeight: 700,
                  }}
                >
                  {category.count} item(ns)
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedClient && selectedCategory && (
        <section>
          <button
            type="button"
            onClick={handleBackToCategories}
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              border: "none",
              borderRadius: "10px",
              backgroundColor: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Voltar para categorias
          </button>

          <h2
            style={{
              marginTop: 0,
              marginBottom: "16px",
              color: "#111827",
            }}
          >
            {selectedClient} / {selectedCategory}
          </h2>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {visibleItems.map((item) => (
              <article
                key={`${item.client_name}-${item.collection_name}-${item.category}-${item.reference_code}-${item.file_name ?? "reference"}`}
                style={{
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "18px",
                      color: "#111827",
                    }}
                  >
                    {item.item_type === "reference"
                      ? `Referência ${item.reference_code}`
                      : item.file_name}
                  </strong>

                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "999px",
                      backgroundColor:
                        item.category === "stills" ? "#dcfce7" : "#dbeafe",
                      color: item.category === "stills" ? "#166534" : "#1e40af",
                      fontSize: "12px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.category}
                  </span>
                </div>

                <p style={{ margin: "4px 0", color: "#374151" }}>
                  <strong>Coleção:</strong> {item.collection_name}
                </p>

                <p style={{ margin: "4px 0", color: "#374151" }}>
                  <strong>Referência:</strong> {item.reference_code}
                </p>

                <p style={{ margin: "4px 0 12px", color: "#374151" }}>
                  <strong>Arquivos:</strong> {item.file_count}
                </p>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                    Ver arquivos
                  </summary>

                  <ul style={{ paddingLeft: "20px" }}>
                    {item.files.map((file) => (
                      <li key={file.path} style={{ marginTop: "6px" }}>
                        {file.file_name}
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </section>
        </section>
      )}
    </main>
  )
}

export default TreatmentQueuePage