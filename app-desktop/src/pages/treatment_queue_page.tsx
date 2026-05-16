import { openPath } from "@tauri-apps/plugin-opener"
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

type QueueGroup = {
  client_name: string
  collection_name: string
  category: string
  quantity: number
  items: QueueItem[]
}

function getItemId(item: QueueItem) {
  return [
    item.client_name,
    item.collection_name,
    item.category,
    item.reference_code,
    item.file_name ?? "reference",
  ].join("::")
}

function TreatmentQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [selectedGroup, setSelectedGroup] = useState<QueueGroup | null>(null)
  const [detailSearch, setDetailSearch] = useState("")
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState("Carregando fila...")
  const [isLoading, setIsLoading] = useState(false)

  async function loadQueue() {
    try {
      setIsLoading(true)
      setStatusMessage("Carregando fila de tratamento...")

      const response = await fetch("http://localhost:8000/queue")
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

  const groups = useMemo(() => {
    const groupMap = new Map<string, QueueGroup>()

    items.forEach((item) => {
      const key = `${item.client_name}-${item.collection_name}-${item.category}`
      const existingGroup = groupMap.get(key)

      if (existingGroup) {
        existingGroup.quantity += item.file_count
        existingGroup.items.push(item)
        return
      }

      groupMap.set(key, {
        client_name: item.client_name,
        collection_name: item.collection_name,
        category: item.category,
        quantity: item.file_count,
        items: [item],
      })
    })

    return Array.from(groupMap.values()).sort((a, b) => {
      const clientCompare = a.client_name.localeCompare(b.client_name)

      if (clientCompare !== 0) {
        return clientCompare
      }

      const collectionCompare = a.collection_name.localeCompare(b.collection_name)

      if (collectionCompare !== 0) {
        return collectionCompare
      }

      return a.category.localeCompare(b.category)
    })
  }, [items])

  const filteredGroupItems = useMemo(() => {
    if (!selectedGroup) {
      return []
    }

    const search = detailSearch.trim().toLowerCase()

    if (!search) {
      return selectedGroup.items
    }

    return selectedGroup.items.filter((item) => {
      const values = [
        item.client_name,
        item.collection_name,
        item.category,
        item.reference_code,
        item.file_name ?? "",
        ...item.files.map((file) => file.file_name),
      ]

      return values.some((value) => value.toLowerCase().includes(search))
    })
  }, [selectedGroup, detailSearch])

  const visibleItemIds = useMemo(() => {
    return filteredGroupItems.map((item) => getItemId(item))
  }, [filteredGroupItems])

  const selectedVisibleCount = useMemo(() => {
    return visibleItemIds.filter((id) => selectedItemIds.includes(id)).length
  }, [selectedItemIds, visibleItemIds])

  const allVisibleSelected =
    visibleItemIds.length > 0 && selectedVisibleCount === visibleItemIds.length

  const selectedItems = useMemo(() => {
    if (!selectedGroup) {
      return []
    }

    return selectedGroup.items.filter((item) =>
      selectedItemIds.includes(getItemId(item)),
    )
  }, [selectedGroup, selectedItemIds])

  const selectedFileCount = useMemo(() => {
    return selectedItems.reduce((total, item) => total + item.file_count, 0)
  }, [selectedItems])

  function handleSelectGroup(group: QueueGroup) {
    setSelectedGroup(group)
    setDetailSearch("")
    setSelectedItemIds([])
  }

  function handleBackToGroups() {
    setSelectedGroup(null)
    setDetailSearch("")
    setSelectedItemIds([])
  }

  function toggleItem(item: QueueItem) {
    const itemId = getItemId(item)

    setSelectedItemIds((currentIds) => {
      if (currentIds.includes(itemId)) {
        return currentIds.filter((id) => id !== itemId)
      }

      return [...currentIds, itemId]
    })
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedItemIds((currentIds) =>
        currentIds.filter((id) => !visibleItemIds.includes(id)),
      )

      return
    }

    setSelectedItemIds((currentIds) => {
      const nextIds = [...currentIds]

      visibleItemIds.forEach((id) => {
        if (!nextIds.includes(id)) {
          nextIds.push(id)
        }
      })

      return nextIds
    })
  }

async function handlePreparedAction(actionName: string) {
  if (selectedItems.length === 0) {
    setStatusMessage("Selecione ao menos um item.")
    return
  }

  if (actionName === "Abrir") {
    const filesToOpen = selectedItems.flatMap((item) => item.files)

    setStatusMessage(
      `Abrindo ${filesToOpen.length} arquivo(s) no aplicativo padrão...`,
    )

    try {
      for (const file of filesToOpen) {
        await openPath(file.path)
      }

      setStatusMessage(`${filesToOpen.length} arquivo(s) aberto(s).`)
    } catch (error) {
  console.error("Erro ao abrir arquivo:", error)
  setStatusMessage(`Erro ao abrir arquivo: ${String(error)}`)
}

    return
  }

  setStatusMessage(
    `${actionName}: ${selectedItems.length} item(ns), ${selectedFileCount} arquivo(s) selecionado(s).`,
  )

  console.log(`${actionName} - itens selecionados:`, selectedItems)
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
        Organizada por cliente, coleção e tipo de arquivo.
      </p>

      <div
        style={{
          maxWidth: "980px",
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

      {!selectedGroup && (
        <section
          style={{
            maxWidth: "980px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={tableHeaderStyle}>Cliente</th>
                <th style={tableHeaderStyle}>Coleção</th>
                <th style={tableHeaderStyle}>Arquivo</th>
                <th style={tableHeaderStyle}>Quantidade</th>
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => (
                <tr
                  key={`${group.client_name}-${group.collection_name}-${group.category}`}
                  onClick={() => handleSelectGroup(group)}
                  style={{
                    cursor: "pointer",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <td style={tableCellStyle}>{group.client_name}</td>
                  <td style={tableCellStyle}>{group.collection_name}</td>
                  <td style={tableCellStyle}>{group.category}</td>
                  <td style={tableCellStyle}>{group.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selectedGroup && (
        <section>
          <button
            type="button"
            onClick={handleBackToGroups}
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
            Voltar para resumo
          </button>

          <h2
            style={{
              marginTop: 0,
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            {selectedGroup.client_name} / {selectedGroup.collection_name} /{" "}
            {selectedGroup.category}
          </h2>

          <p
            style={{
              marginTop: 0,
              marginBottom: "16px",
              color: "#4b5563",
            }}
          >
            {selectedGroup.quantity} arquivo(s) no grupo.
          </p>

          <input
            value={detailSearch}
            onChange={(event) => setDetailSearch(event.target.value)}
            placeholder="Pesquisar dentro deste grupo. Ex: -C1, 168LB, Y4381D"
            style={{
              width: "100%",
              maxWidth: "760px",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              marginBottom: "16px",
            }}
          />

          <div
            style={{
              maxWidth: "980px",
              marginBottom: "16px",
              padding: "16px",
              borderRadius: "16px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              disabled={visibleItemIds.length === 0}
              style={{
                padding: "10px 14px",
                border: "none",
                borderRadius: "10px",
                backgroundColor: "#374151",
                color: "#ffffff",
                fontWeight: 700,
                cursor: visibleItemIds.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
            </button>

            <button
              type="button"
              onClick={() => handlePreparedAction("Abrir")}
              style={actionButtonStyle}
            >
              Abrir
            </button>

            <button
              type="button"
              onClick={() => handlePreparedAction("Finalizar")}
              style={actionButtonStyle}
            >
              Finalizar
            </button>

            <button
              type="button"
              onClick={() => handlePreparedAction("Cancelar")}
              style={dangerButtonStyle}
            >
              Cancelar
            </button>

            <span
              style={{
                marginLeft: "auto",
                color: "#374151",
                fontWeight: 700,
              }}
            >
              {selectedItems.length} item(ns) / {selectedFileCount} arquivo(s)
              selecionado(s)
            </span>
          </div>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredGroupItems.map((item) => {
              const itemId = getItemId(item)
              const isSelected = selectedItemIds.includes(itemId)

              return (
                <article
                  key={itemId}
                  onClick={() => toggleItem(item)}
                  style={{
                    padding: "20px",
                    backgroundColor: isSelected ? "#ede9fe" : "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
                    border: isSelected
                      ? "2px solid #6d28d9"
                      : "1px solid #e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item)}
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        width: "18px",
                        height: "18px",
                        marginTop: "3px",
                      }}
                    />

                    <strong
                      style={{
                        display: "block",
                        fontSize: "18px",
                        color: "#111827",
                      }}
                    >
                      {item.item_type === "reference"
                        ? `${item.reference_code} - ${item.file_count} arquivo(s)`
                        : item.file_name}
                    </strong>
                  </div>

                  <p style={{ margin: "4px 0", color: "#374151" }}>
                    <strong>Referência:</strong> {item.reference_code}
                  </p>

                  <p style={{ margin: "4px 0 12px", color: "#374151" }}>
                    <strong>Arquivos:</strong> {item.file_count}
                  </p>

                  <details onClick={(event) => event.stopPropagation()}>
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
              )
            })}
          </section>
        </section>
      )}
    </main>
  )
}

const tableHeaderStyle = {
  padding: "12px",
  textAlign: "left" as const,
  color: "#111827",
  fontSize: "14px",
  borderBottom: "1px solid #e5e7eb",
}

const tableCellStyle = {
  padding: "12px",
  color: "#374151",
}

const actionButtonStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
}

const dangerButtonStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
}

export default TreatmentQueuePage