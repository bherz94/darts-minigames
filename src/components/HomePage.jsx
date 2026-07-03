import { useTranslation } from "../hooks/useTranslation.jsx";

export default function HomePage({ onNavigate }) {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl flex-col items-center justify-center px-4 py-8">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("app.name")}</h1>
        <p className="mt-2 text-slate-400">{t("home.subtitle")}</p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onNavigate("tictactoe")}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-slate-500 hover:bg-slate-800"
        >
          <h2 className="text-lg font-semibold text-white">
            {t("home.tictactoe.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {t("home.tictactoe.description")}
          </p>
        </button>
        <button
          onClick={() => onNavigate("dartcounter")}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-slate-500 hover:bg-slate-800"
        >
          <h2 className="text-lg font-semibold text-white">
            {t("home.dartcounter.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {t("home.dartcounter.description")}
          </p>
        </button>
      </div>
    </main>
  );
}
