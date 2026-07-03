import { useTranslation } from "../hooks/useTranslation.jsx";

export default function Layout({ children }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-950 text-white select-none">
      <div className="mx-auto max-w-7xl px-4 pt-4 flex justify-end">
        <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent outline-none"
            aria-label={t("language.label")}
          >
            <option value="en">🇬🇧 {t("language.english")}</option>
            <option value="de">🇩🇪 {t("language.german")}</option>
          </select>
        </label>
      </div>
      {children}
    </div>
  );
}
