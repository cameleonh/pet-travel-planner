"use client";

import { useState } from "react";
import type { PlanPlace } from "@/domain/plan";
import { generateSmartChecklist } from "@/domain/checklist";
import { useLang } from "@/i18n/LangContext";

interface SmartChecklistProps {
  places: PlanPlace[];
}

export function SmartChecklist({ places }: SmartChecklistProps) {
  const { lang } = useLang();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const checklist = generateSmartChecklist(places);
  const checkedCount = checklist.filter((i) => checkedIds.has(i.id)).length;
  const totalCount = checklist.length;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="smart-checklist-section" aria-label="출발 전 스마트 준비물 체크리스트">
      <div
        className="checklist-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen(!isOpen)}
      >
        <div className="checklist-title-wrap">
          <span className="checklist-icon">🎒</span>
          <div>
            <h4 className="checklist-title">
              {lang === "ko" ? "출발 전 맞춤 준비물 체크리스트" : "Trip Packing Checklist"}
            </h4>
            <p className="checklist-sub">
              {lang === "ko"
                ? `선택한 ${places.length}곳 코스 기반 (${checkedCount}/${totalCount} 챙김)`
                : `Tailored to your ${places.length} stops (${checkedCount}/${totalCount} ready)`}
            </p>
          </div>
        </div>
        <div className="checklist-badge">
          <span>{isOpen ? "접기 ▲" : "확인하기 ▼"}</span>
        </div>
      </div>

      {isOpen && (
        <div className="checklist-body">
          <ul className="checklist-items">
            {checklist.map((item) => {
              const isChecked = checkedIds.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`checklist-item ${isChecked ? "checked" : ""}`}
                  onClick={() => toggleCheck(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCheck(item.id)}
                    aria-label={lang === "ko" ? item.titleKo : item.titleEn}
                  />
                  <div className="item-text">
                    <strong className="item-title">
                      {lang === "ko" ? item.titleKo : item.titleEn}
                    </strong>
                    <p className="item-desc">{lang === "ko" ? item.descKo : item.descEn}</p>
                    {item.recommendedReasonKo && (
                      <span className="item-reason">
                        💡 {lang === "ko" ? item.recommendedReasonKo : item.recommendedReasonEn}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
