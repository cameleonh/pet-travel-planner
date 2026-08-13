"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko");
  const dict = getDict(lang);
  const value = { lang, setLang: useCallback((l: Lang) => setLang(l), []), dict };
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
