"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangContext";

const MINUTE_STEPS = [0, 15, 30, 45];

const pad = (value: number) => String(value).padStart(2, "0");

const cellStyle = (selected: boolean): React.CSSProperties => ({
  border: selected ? "1px solid #2563eb" : "1px solid #e2e8f0",
  background: selected ? "#eff6ff" : "#fff",
  color: "#1e293b",
  borderRadius: 8,
  padding: "6px 0",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "center",
});

// Native <input type="time"> pickers cannot be closed programmatically, so the
// planner uses this picker instead: choosing an hour and then a minute commits
// the time and dismisses the popup in one gesture.
export function DepartureTimePicker({ value, onChange, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [stagedHour, setStagedHour] = useState(9);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const labels = lang === "ko"
    ? { hour: "시", minute: "분" }
    : lang === "zh"
      ? { hour: "时", minute: "分" }
      : { hour: "Hour", minute: "Min" };

  const openPicker = () => {
    const parsed = Number(value.split(":")[0] ?? "9");
    setStagedHour(Number.isFinite(parsed) ? parsed : 9);
    setOpen(true);
  };

  const pickMinute = (minute: number) => {
    onChange(`${pad(stagedHour)}:${pad(minute)}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel}
        aria-expanded={open}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          background: "#fff",
          padding: "8px 12px",
          fontSize: 14,
          color: "#1e293b",
          cursor: "pointer",
        }}
      >
        🕒 {value}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            width: 248,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 12px 28px rgba(15, 23, 42, .18)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <strong style={{ fontSize: 12, color: "#64748b" }}>{labels.hour}</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
            {Array.from({ length: 24 }, (_, hour) => (
              <button key={hour} type="button" style={cellStyle(stagedHour === hour)} onClick={() => setStagedHour(hour)}>
                {pad(hour)}
              </button>
            ))}
          </div>
          <strong style={{ fontSize: 12, color: "#64748b" }}>{labels.minute}</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {MINUTE_STEPS.map((minute) => (
              <button key={minute} type="button" style={cellStyle(value === `${pad(stagedHour)}:${pad(minute)}`)} onClick={() => pickMinute(minute)}>
                {pad(minute)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
