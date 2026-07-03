import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import de from "../locales/de.json";
import { getValueByPath, interpolate } from "../utils/i18n.js";
import { LANGUAGE_STORAGE_KEY } from "../utils/gameLogic.js";

const translations = { en, de };
const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(() => {
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
    (key, vars = {}) => {
      const dictionary = translations[language] ?? translations.en;
      const fallback = translations.en;
      const value =
        getValueByPath(dictionary, key) ?? getValueByPath(fallback, key) ?? key;
      return interpolate(value, vars);
    },
    [language],
  );

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
