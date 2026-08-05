export type CongestionData = {
  t_ats_nm: string;
  forecasts: { base_ymd: string; cnctr_rate: number }[];
};

function formatYmd(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  return `${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

function weekdayLabel(ymd: string): string {
  if (ymd.length !== 8) return "";
  const date = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()] ?? "";
}

function rateLevel(rate: number): { label: string; className: string } {
  if (rate < 40) return { label: "한산", className: "congestion-low" };
  if (rate < 70) return { label: "보통", className: "congestion-mid" };
  return { label: "혼잡", className: "congestion-high" };
}

export function hasCongestionData(data: CongestionData | undefined | null): boolean {
  if (!data) return false;
  return data.forecasts.length > 0;
}

export function CongestionSection({ data }: { data: CongestionData | undefined }) {
  if (!hasCongestionData(data)) return null;
  if (!data) return null;

  const today = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`;
  const upcoming = data.forecasts.filter((f) => f.base_ymd >= today).slice(0, 7);
  if (upcoming.length === 0) return null;

  const avg = upcoming.reduce((sum, f) => sum + f.cnctr_rate, 0) / upcoming.length;
  const overall = rateLevel(avg);

  return (
    <details className="congestion-details">
      <summary>
        방문 집중률 예측 <span className={`congestion-badge ${overall.className}`}>{overall.label}</span>
      </summary>
      <div className="congestion-info">
        <div className="congestion-row">
          <span className="congestion-label">이번 주 평균</span>
          <span className="congestion-value">{avg.toFixed(1)}%</span>
        </div>
        <ul className="congestion-forecast-list">
          {upcoming.map((f) => {
            const level = rateLevel(f.cnctr_rate);
            return (
              <li key={f.base_ymd} className="congestion-forecast-item">
                <span className="congestion-date">{formatYmd(f.base_ymd)} <small>({weekdayLabel(f.base_ymd)})</small></span>
                <span className={`congestion-pill ${level.className}`}>{f.cnctr_rate.toFixed(1)} {level.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="congestion-source">한국관광공사 관광지 집중률 예측 정보 (향후 30일)</p>
    </details>
  );
}
