"use client";

import { useLang } from "@/i18n/LangContext";
import type { Lang } from "@/i18n/dictionary";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle lang-toggle-topbar" role="group" aria-label="Language">
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={lang === opt.value ? "active" : ""}
          onClick={() => setLang(opt.value)}
          aria-pressed={lang === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
