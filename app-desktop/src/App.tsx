import { useState } from "react"
import HomePage from "./pages/home_page"
import LoginPage from "./pages/login_page"
import TreatmentQueuePage from "./pages/treatment_queue_page"
import UploadPage from "./pages/upload_page"

type CurrentPage = "login" | "home" | "upload" | "treatment_queue"

function App() {
  const [currentPage, setCurrentPage] = useState<CurrentPage>("login")

  if (currentPage === "login") {
    return <LoginPage onLoginSuccess={() => setCurrentPage("home")} />
  }

  if (currentPage === "upload") {
    return (
      <>
        <button onClick={() => setCurrentPage("home")}>Voltar</button>
        <UploadPage />
      </>
    )
  }

  if (currentPage === "treatment_queue") {
    return (
      <>
        <button onClick={() => setCurrentPage("home")}>Voltar</button>
        <TreatmentQueuePage />
      </>
    )
  }

  return (
    <HomePage
      onGoToUpload={() => setCurrentPage("upload")}
      onGoToTreatmentQueue={() => setCurrentPage("treatment_queue")}
      onLogout={() => setCurrentPage("login")}
    />
  )
}

export default App