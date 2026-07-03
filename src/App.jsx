import { useState } from "react";
import { TranslationProvider } from "./hooks/useTranslation.jsx";
import Layout from "./components/Layout.jsx";
import HomePage from "./components/HomePage.jsx";
import TicTacToePage from "./pages/TicTacToePage.jsx";
import DartCounterPage from "./pages/DartCounterPage.jsx";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  return (
    <TranslationProvider>
      <Layout>
        {currentPage === "home" && (
          <HomePage onNavigate={setCurrentPage} />
        )}
        {currentPage === "tictactoe" && (
          <TicTacToePage onNavigate={setCurrentPage} />
        )}
        {currentPage === "dartcounter" && (
          <DartCounterPage onNavigate={setCurrentPage} />
        )}
      </Layout>
    </TranslationProvider>
  );
}
