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

type ActiveSession = {
  startedAt: number
  items: QueueItem[]
  fileCount: number
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

function getGroupId(group: QueueGroup) {
  return [group.client_name, group.collection_name, group.category].join("::")
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

function TreatmentQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [selectedGroup, setSelectedGroup] = useState<QueueGroup | null>(null)
  const [detailSearch, setDetailSearch] = useState("")
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState("Carregando fila...")
  const [isLoading, setIsLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  async function loadQueue() {
    try {
      setIsLoading(true)
      setStatusMessage("Atualizando lista...")

      const response = await fetch("http://localhost:8000/queue")
      const data: QueueResponse = await response.json()

      setItems(data.items)
      setStatusMessage(`${data.total} item(ns) encontrado(s).`)
      return data.items
    } catch (error) {
      console.error(error)
      setStatusMessage("Erro ao carregar fila de tratamento.")
      return []
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRefreshList() {
    const updatedItems = await loadQueue()

    if (!selectedGroup) {
      return
    }

    const selectedGroupId = getGroupId(selectedGroup)
    const updatedGroupItems = updatedItems.filter((item) => {
      const itemGroupId = [
        item.client_name,
        item.collection_name,
        item.category,
      ].join("::")

      return itemGroupId === selectedGroupId
    })

    if (updatedGroupItems.length === 0) {
      setSelectedGroup(null)
      setSelectedItemIds([])
      setDetailSearch("")
      setStatusMessage("Grupo atualizado e não possui mais itens na fila.")
      return
    }

    const updatedGroup: QueueGroup = {
      client_name: selectedGroup.client_name,
      collection_name: selectedGroup.collection_name,
      category: selectedGroup.category,
      quantity: updatedGroupItems.reduce(
        (total, item) => total + item.file_count,
        0,
      ),
      items: updatedGroupItems,
    }

    setSelectedGroup(updatedGroup)
    setSelectedItemIds((currentIds) => {
      const availableIds = updatedGroupItems.map((item) => getItemId(item))
      return currentIds.filter((id) => availableIds.includes(id))
    })
  }

  useEffect(() => {
    loadQueue()
  }, [])

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0)
      return
    }

    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeSession])

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

  async function handleOpenSelectedItems() {
    if (selectedItems.length === 0) {
      setStatusMessage("Selecione ao menos um item.")
      return
    }

    const filesToOpen = selectedItems.flatMap((item) => item.files)

    setStatusMessage(
      `Abrindo ${filesToOpen.length} arquivo(s) no aplicativo padrão...`,
    )

    try {
      for (const file of filesToOpen) {
        await openPath(file.path)
      }

      setActiveSession({
        startedAt: Date.now(),
        items: selectedItems,
        fileCount: filesToOpen.length,
      })

      setStatusMessage(
        `Sessão iniciada com ${selectedItems.length} item(ns) e ${filesToOpen.length} arquivo(s).`,
      )
    } catch (error) {
      console.error("Erro ao abrir arquivo:", error)
      setStatusMessage(`Erro ao abrir arquivo: ${String(error)}`)
    }
  }

  function handleCloseSessionWithoutFinishing() {
    setActiveSession(null)
    setStatusMessage("Sessão fechada sem finalizar. Os arquivos continuam na fila.")
  }

  async function handleFinishSession() {
    if (!activeSession) {
      setStatusMessage("Nenhuma sessão ativa para finalizar.")
      return
    }

    try {
      setStatusMessage("Finalizando sessão e movendo arquivos...")

      const filesToFinalize = activeSession.items.flatMap((item) => item.files)

      const response = await fetch("http://localhost:8000/queue/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          elapsed_seconds: elapsedSeconds,
          files: filesToFinalize.map((file) => ({
            path: file.path,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStatusMessage(data.detail ?? "Erro ao finalizar sessão.")
        return
      }

      setStatusMessage(
        `${data.message} ${data.total_moved} arquivo(s) movido(s) para finalizadas.`,
      )

      setActiveSession(null)
      setSelectedItemIds([])
      await handleRefreshList()
    } catch (error) {
      console.error(error)
      setStatusMessage("Erro ao conectar com a API ao finalizar.")
    }
  }

  function handleCancelPreview() {
    if (selectedItems.length === 0) {
      setStatusMessage("Selecione ao menos um item.")
      return
    }

    setStatusMessage(
      `Cancelar: ${selectedItems.length} item(ns), ${selectedFileCount} arquivo(s) selecionado(s).`,
    )
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
      <h1 style={{ marginTop: 0, marginBottom: "8px", fontSize: "32px" }}>
        Fila de Tratamento
      </h1>

      <p style={{ marginTop: 0, marginBottom: "24px", color: "#4b5563" }}>
        Organizada por cliente, coleção e tipo de arquivo.
      </p>

      <div style={statusBoxStyle}>{statusMessage}</div>

      {activeSession && (
        <div style={sessionBoxStyle}>
          <div>
            <strong>Sessão ativa</strong>
            <p style={{ margin: "6px 0 0" }}>
              Tempo: {formatElapsedTime(elapsedSeconds)} |{" "}
              {activeSession.items.length} item(ns) | {activeSession.fileCount} arquivo(s)
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleFinishSession}
              style={actionButtonStyle}
            >
              Finalizar sessão
            </button>

            <button
              type="button"
              onClick={handleCloseSessionWithoutFinishing}
              style={darkButtonNoMarginStyle}
            >
              Fechar sem finalizar
            </button>
          </div>
        </div>
      )}

      {!selectedGroup && (
        <>
          <button
            type="button"
            onClick={handleRefreshList}
            disabled={isLoading}
            style={darkButtonStyle}
          >
            Atualizar lista
          </button>

          <section style={tableContainerStyle}>
            <table style={tableStyle}>
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
        </>
      )}

      {selectedGroup && (
        <section>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleBackToGroups}
              style={darkButtonStyle}
            >
              Voltar para resumo
            </button>

            <button
              type="button"
              onClick={handleRefreshList}
              disabled={isLoading}
              style={darkButtonStyle}
            >
              Atualizar lista
            </button>
          </div>

          <h2 style={{ marginBottom: "8px" }}>
            {selectedGroup.client_name} / {selectedGroup.collection_name} /{" "}
            {selectedGroup.category}
          </h2>

          <p style={{ marginTop: 0, marginBottom: "16px", color: "#4b5563" }}>
            {selectedGroup.quantity} arquivo(s) no grupo.
          </p>

          <input
            value={detailSearch}
            onChange={(event) => setDetailSearch(event.target.value)}
            placeholder="Pesquisar dentro deste grupo. Ex: -C1, 168LB, Y4381D"
            style={searchInputStyle}
          />

          <div style={actionBarStyle}>
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              disabled={visibleItemIds.length === 0}
              style={darkButtonNoMarginStyle}
            >
              {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
            </button>

            <button
              type="button"
              onClick={handleOpenSelectedItems}
              style={actionButtonStyle}
            >
              Abrir
            </button>

            <button
              type="button"
              onClick={handleFinishSession}
              style={actionButtonStyle}
            >
              Finalizar
            </button>

            <button
              type="button"
              onClick={handleCancelPreview}
              style={dangerButtonStyle}
            >
              Cancelar
            </button>

            <span style={{ marginLeft: "auto", fontWeight: 700 }}>
              {selectedItems.length} item(ns) / {selectedFileCount} arquivo(s)
            </span>
          </div>

          <section style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th style={tableHeaderStyle}></th>
                  <th style={tableHeaderStyle}>
                    {selectedGroup.category === "stills" ? "Referência" : "Arquivo"}
                  </th>
                  <th style={tableHeaderStyle}>Qtd.</th>
                  <th style={tableHeaderStyle}>Arquivos</th>
                </tr>
              </thead>

              <tbody>
                {filteredGroupItems.map((item) => {
                  const itemId = getItemId(item)
                  const isSelected = selectedItemIds.includes(itemId)

                  return (
                    <tr
                      key={itemId}
                      onClick={() => toggleItem(item)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#ede9fe" : "#ffffff",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <td style={tableCellStyle}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>

                      <td style={tableCellStyle}>
                        <strong>
                          {item.item_type === "reference"
                            ? item.reference_code
                            : item.file_name}
                        </strong>
                      </td>

                      <td style={tableCellStyle}>{item.file_count}</td>

                      <td style={tableCellStyle}>
                        <details onClick={(event) => event.stopPropagation()}>
                          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                            Ver arquivos
                          </summary>

                          <ul style={{ paddingLeft: "18px", marginBottom: 0 }}>
                            {item.files.map((file) => (
                              <li key={file.path}>{file.file_name}</li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </section>
      )}

      {isLoading && <p style={{ color: "#6b7280" }}>Carregando...</p>}
    </main>
  )
}

const tableContainerStyle = {
  maxWidth: "980px",
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
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
  verticalAlign: "top" as const,
}

const statusBoxStyle = {
  maxWidth: "980px",
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#374151",
}

const sessionBoxStyle = {
  maxWidth: "980px",
  marginBottom: "16px",
  padding: "16px",
  borderRadius: "16px",
  backgroundColor: "#ecfdf5",
  border: "1px solid #86efac",
  color: "#14532d",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
}

const searchInputStyle = {
  width: "100%",
  maxWidth: "760px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  marginBottom: "16px",
}

const actionBarStyle = {
  maxWidth: "980px",
  marginBottom: "16px",
  padding: "16px",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  display: "flex",
  flexWrap: "wrap" as const,
  alignItems: "center",
  gap: "12px",
}

const darkButtonStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#111827",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
  marginBottom: "16px",
}

const darkButtonNoMarginStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#111827",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
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