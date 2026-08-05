const GROUP_LABELS: Record<string, string> = {
  parking: "주차", publictransport: "대중교통", route: "접근로", ticketoffice: "매표소",
  promotion: "홍보물", wheelchair: "휠체어", exit: "출입통로", elevator: "엘리베이터",
  restroom: "화장실", auditorium: "관람석", room: "객실", handicapetc: "기타",
  braileblock: "점자블록", helpdog: "보조견 동반", guidehuman: "안내요원",
  audioguide: "오디오가이드", bigprint: "큰활자", brailepromotion: "점자 홍보물",
  guidesystem: "유도안내설비", blindhandicapetc: "기타",
  signguide: "수화안내", videoguide: "자막/비디오가이드", hearingroom: "객실",
  hearinghandicapetc: "기타",
  stroller: "유모차", lactationroom: "수유실", babysparechair: "유아용 보조의자",
  infantsfamilyetc: "기타",
};

const GROUP_NAMES: Record<string, { title: string; fields: string[] }> = {
  "지체장애": {
    title: "지체장애 · 휠체어",
    fields: ["parking", "publictransport", "route", "wheelchair", "exit", "elevator", "restroom", "auditorium", "room"],
  },
  "시각장애": {
    title: "시각장애",
    fields: ["braileblock", "helpdog", "guidehuman", "audioguide", "bigprint", "brailepromotion", "guidesystem"],
  },
  "청각장애": {
    title: "청각장애",
    fields: ["signguide", "videoguide", "hearingroom"],
  },
  "영유아가족": {
    title: "영유아 가족",
    fields: ["stroller", "lactationroom", "babysparechair"],
  },
};

export type AccessibilityData = Record<string, string | undefined>;

export function hasAccessibilityData(data: AccessibilityData | undefined | null): boolean {
  if (!data) return false;
  return Object.values(data).some((v) => typeof v === "string" && v.length > 0);
}

export function AccessibilitySection({ data }: { data: AccessibilityData | undefined }) {
  if (!hasAccessibilityData(data)) return null;

  const safeData: AccessibilityData = data ?? {};
  const groups = Object.entries(GROUP_NAMES).map(([groupKey, group]) => {
    const items = group.fields
      .map((field) => ({ field, value: safeData[field] }))
      .filter((item): item is { field: string; value: string } => typeof item.value === "string" && item.value.length > 0);
    return { groupKey, title: group.title, items };
  }).filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <details className="accessibility-details">
      <summary>무장애 여행 정보 <span className="accessibility-count">{groups.reduce((sum, g) => sum + g.items.length, 0)}개 항목</span></summary>
      <div className="accessibility-groups">
        {groups.map((group) => (
          <div key={group.groupKey} className="accessibility-group">
            <strong className="accessibility-group-title">{group.title}</strong>
            <ul>
              {group.items.map((item) => (
                <li key={item.field}>
                  <span className="accessibility-label">{GROUP_LABELS[item.field] ?? item.field}</span>
                  <span className="accessibility-value">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="accessibility-source">한국관광공사 무장애여행 서비스</p>
    </details>
  );
}
