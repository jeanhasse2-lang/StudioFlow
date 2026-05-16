import { useState } from "react"

type LoginPageProps = {
  onLoginSuccess: () => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [statusMessage, setStatusMessage] = useState("Preencha os dados para entrar")
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin() {
    try {
      setIsLoading(true)
      setStatusMessage("Tentando entrar...")

      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.error) {
        setStatusMessage(data.error)
        return
      }

      onLoginSuccess()
    } catch (error) {
      console.error(error)
      setStatusMessage("Erro ao conectar com a API")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", fontFamily: "Arial" }}>
      <section style={{ width: "100%", maxWidth: 420, padding: 32, background: "#fff", borderRadius: 16 }}>
        <h1 style={{ textAlign: "center" }}>StudioFlow</h1>

        <label>E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16 }} />

        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 16 }} />

        <button onClick={handleLogin} disabled={isLoading} style={{ width: "100%", padding: 14 }}>
          {isLoading ? "Entrando..." : "Entrar"}
        </button>

        <p style={{ textAlign: "center" }}>{statusMessage}</p>
      </section>
    </main>
  )
}

export default LoginPage