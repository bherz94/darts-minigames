import { useTranslation } from "../hooks/useTranslation";

let _backInterceptor: (() => void) | null = null;

export function setBackInterceptor(fn: (() => void) | null) {
  _backInterceptor = fn;
}

export default function Header() {
  const { language, setLanguage, t } = useTranslation();
  const hash = window.location.hash;
  const isSubpage = hash !== "" && hash !== "#" && hash !== "#/";

  function handleBack() {
    if (_backInterceptor) {
      _backInterceptor();
    } else {
      window.location.hash = "/";
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <div className="w-28">
          {isSubpage && (
            <button
              onClick={handleBack}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              ← {t("nav.back")}
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <select
            value={language}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "en" || val === "de") setLanguage(val);
            }}
            className="bg-transparent outline-none"
            aria-label={t("language.label")}
          >
            <option value="en">🇬🇧 {t("language.english")}</option>
            <option value="de">🇩🇪 {t("language.german")}</option>
          </select>
        </label>
      </div>
    </header>
  );
}
