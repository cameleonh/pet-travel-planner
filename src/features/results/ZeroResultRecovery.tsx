"use client";

import type { CatalogRelaxation } from "@/data/catalog";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

type Props = { proposal: CatalogRelaxation | null; unverifiedCount: number; onApply: () => void };

export function ZeroResultRecovery({ proposal, unverifiedCount, onApply }: Props) {
  const { lang, dict } = useLang();
  return (
    <section className="zero-state" aria-labelledby="zero-title">
      <span className="zero-mark" aria-hidden="true">0</span>
      <div><h3 id="zero-title">{dict.zeroTitle}</h3>
        {unverifiedCount > 0 ? <p>{t(lang, "zeroUnverified", { n: unverifiedCount.toLocaleString("ko-KR") })}</p> : <p>{dict.zeroNoMatch}</p>}
        {proposal ? <div className="relaxation-offer"><p><strong>{proposal.removedPreferences.map((item) => `‘${item.label}’`).join(", ")}</strong>{t(lang, "zeroRelaxation", { n: proposal.recoveredCount.toLocaleString("ko-KR") })}</p><button type="button" onClick={onApply}>{t(lang, "zeroRelaxationButton", { labels: proposal.removedPreferences.map((item) => item.label).join(", "), n: proposal.recoveredCount.toLocaleString("ko-KR") })}</button></div> : <p className="protected-note">{dict.zeroProtected}</p>}
      </div>
    </section>
  );
}
