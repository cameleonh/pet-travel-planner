"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/i18n/dictionary";
import { getDict, type Dictionary } from "@/i18n/dictionary";

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dict: Dictionary;
};

const LangContext = createContext<LangContextValue>({
  lang: "ko",
  setLang: () => {},
  dict: getDict("ko"),
});

export function LangProvider({ children, initialLang = "ko" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    document.documentElement.lang = nextLang;
  }, []);

  const value = useMemo(() => ({ lang, setLang, dict: getDict(lang) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
