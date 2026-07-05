import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import de from "../locales/de.json";
import { getValueByPath, interpolate } from "../utils/i18n";
import { LANGUAGE_STORAGE_KEY } from "../utils/gameLogic";

type Language = "en" | "de";

interface TranslationContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const translations: Record<Language, typeof en> = { en, de };
const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return saved === "de" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore storage write failures
    }
  }, [language]);

  const t = useCallback(
    (key: string, vars: Record<string, string | number> = {}): string => {
      const dictionary = translations[language] ?? translations.en;
      const fallback = translations.en;
      const value =
        getValueByPath(dictionary, key) ?? getValueByPath(fallback, key) ?? key;
      return interpolate(String(value), vars);
    },
    [language],
  );

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used inside TranslationProvider");
  return ctx;
}
