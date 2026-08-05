const LEVEL_LABELS: Record<number, string> = { 1: "하", 2: "중", 3: "상" };

export type TrailData = {
  crs_idx: string;
  crs_kor_nm: string;
  theme_nm: string | null;
  linemsg: string | null;
  crs_dstnc: number | null;
  crs_totl_rqrm_hour: number | null;
  crs_level: number | null;
  crs_cycle: string | null;
  sigun: string | null;
  gpxpath: string | null;
  crs_summary: string | null;
};

export function TrailSection({ trails, region }: { trails: TrailData[]; region: string }) {
  if (trails.length === 0) return null;

  return (
    <div className="trail-section">
      <h3 className="trail-section-title">🏞️ {region} 반려견 산책 코스 <span className="trail-count">{trails.length}개</span></h3>
      <p className="trail-section-desc">한국관광공사 두루누비 걷기 길 · 반려동물과 함께 걷기 좋은 코스예요</p>
      <ul className="trail-list">
        {trails.slice(0, 5).map((trail) => (
          <li key={trail.crs_idx} className="trail-item">
            <div className="trail-header">
              <strong className="trail-name">{trail.crs_kor_nm}</strong>
              {trail.crs_level ? <span className={`trail-level trail-level-${trail.crs_level}`}>난이도 {LEVEL_LABELS[trail.crs_level] ?? "?"}</span> : null}
            </div>
            {trail.linemsg ? <p className="trail-tagline">{trail.linemsg}</p> : null}
            <div className="trail-meta">
              {trail.crs_dstnc ? <span>📍 {trail.crs_dstnc}km</span> : null}
              {trail.crs_totl_rqrm_hour ? <span>⏱️ {Math.floor(trail.crs_totl_rqrm_hour / 60)}시간 {trail.crs_totl_rqrm_hour % 60}분</span> : null}
              {trail.crs_cycle ? <span>🔄 {trail.crs_cycle}</span> : null}
            </div>
            {trail.crs_summary ? <details className="trail-details"><summary>코스 설명</summary><p>{trail.crs_summary.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")}</p></details> : null}
            {trail.gpxpath ? <a href={`/api/gpx?url=${encodeURIComponent(trail.gpxpath)}&name=${encodeURIComponent(trail.crs_kor_nm)}`} className="trail-gpx" download>GPX 경로 받기 <span aria-hidden="true">↗</span></a> : null}
          </li>
        ))}
      </ul>
      {trails.length > 5 ? <p className="trail-more">외 {trails.length - 5}개 코스 더 있어요</p> : null}
    </div>
  );
}
