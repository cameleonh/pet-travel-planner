export type CampingData = {
  animal_cmg_cl?: string;
  induty?: string;
  sbrs_cl?: string;
  glamp_site_co?: number;
  carav_site_co?: number;
  gnrl_site_co?: number;
  oper_pd_cl?: string;
  oper_de_cl?: string;
  resve_url?: string;
  first_image_url?: string;
};

const INDUTY_LABELS: Record<string, string> = {
  "일반야영장": "일반 야영장",
  "카라반": "카라반",
  "글램핑": "글램핑",
  "자동차야영장": "자동차 야영장",
};

const FACILITY_LABELS: Record<string, string> = {
  "전기": "전기",
  "무선인터넷": "무선인터넷",
  "장작판매": "장작판매",
  "온수": "온수",
  "트렘폴린": "트렘폴린",
  "물놀이장": "물놀이장",
  "놀이터": "놀이터",
  "산책로": "산책로",
  "운동장": "운동장",
  "마트.편의점": "마트/편의점",
  "운동시설": "운동시설",
};

export function hasCampingData(data: CampingData | undefined | null): boolean {
  if (!data) return false;
  return Boolean(data.induty || data.animal_cmg_cl || data.sbrs_cl || data.resve_url);
}

export function CampingSection({ data }: { data: CampingData | undefined }) {
  if (!hasCampingData(data)) return null;
  if (!data) return null;

  const siteTypes: string[] = [];
  if (data.glamp_site_co && data.glamp_site_co > 0) siteTypes.push(`글램핑 ${data.glamp_site_co}석`);
  if (data.carav_site_co && data.carav_site_co > 0) siteTypes.push(`카라반 ${data.carav_site_co}석`);
  if (data.gnrl_site_co && data.gnrl_site_co > 0) siteTypes.push(`일반 ${data.gnrl_site_co}석`);

  const facilities = data.sbrs_cl
    ? data.sbrs_cl.split(",").map((s) => s.trim()).filter(Boolean).map((f) => FACILITY_LABELS[f] ?? f)
    : [];

  return (
    <details className="camping-details">
      <summary>캠핑장 정보 {siteTypes.length > 0 ? <span className="camping-types">{siteTypes.join(" · ")}</span> : null}</summary>
      <div className="camping-info">
        {data.induty ? <div className="camping-row"><span className="camping-label">유형</span><span>{data.induty.split(",").map((t) => INDUTY_LABELS[t.trim()] ?? t.trim()).join(", ")}</span></div> : null}
        {data.animal_cmg_cl ? <div className="camping-row"><span className="camping-label">반려동물</span><span>{data.animal_cmg_cl}</span></div> : null}
        {data.oper_pd_cl ? <div className="camping-row"><span className="camping-label">운영기간</span><span>{data.oper_pd_cl}</span></div> : null}
        {data.oper_de_cl ? <div className="camping-row"><span className="camping-label">운영일</span><span>{data.oper_de_cl}</span></div> : null}
        {facilities.length > 0 ? <div className="camping-row"><span className="camping-label">부대시설</span><span>{facilities.join(", ")}</span></div> : null}
        {data.resve_url ? <a href={data.resve_url} target="_blank" rel="noreferrer" className="camping-reserve">예약하기 <span aria-hidden="true">↗</span></a> : null}
      </div>
      <p className="camping-source">한국관광공사 고캠핑 서비스</p>
    </details>
  );
}
