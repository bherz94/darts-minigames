import { useEffect, useState } from "react";
import { TranslationProvider } from "./hooks/useTranslation";
import Layout from "./components/Layout";
import HomePage from "./components/HomePage";
import TicTacToePage from "./pages/TicTacToePage";
import DartCounterPage from "./pages/DartCounterPage";

type Page = "home" | "tictactoe" | "dartcounter";

function parseHash(hash: string): Page {
  if (hash === "#/tictactoe") return "tictactoe";
  if (hash === "#/dartcounter") return "dartcounter";
  return "home";
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() =>
    parseHash(window.location.hash),
  );

  useEffect(() => {
    function onHashChange() {
      setCurrentPage(parseHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <TranslationProvider>
      <Layout>
        {currentPage === "home" && <HomePage />}
        {currentPage === "tictactoe" && <TicTacToePage />}
        {currentPage === "dartcounter" && <DartCounterPage />}
      </Layout>
    </TranslationProvider>
  );
}
