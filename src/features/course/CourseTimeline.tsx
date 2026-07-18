import type { CourseResult } from "@/domain/course";

export function CourseTimeline({ course }: { course: Extract<CourseResult, { success: true }> }) {
  return (
    <div className="course-result" aria-live="polite">
      <div className="route-disclosure"><strong>가까운 순서로 정리했어요</strong><p>{course.disclosure}</p></div>
      <ol>{course.stops.map((stop, index) => <li key={stop.placeId}><span>{index + 1}</span><div><strong>{stop.name}</strong><p>기준 장소에서 {stop.distanceFromOriginKm.toFixed(1)}km · 확인 근거 {stop.proofCount}개</p><a href={`https://map.kakao.com/link/to/${encodeURIComponent(stop.name)},${stop.coordinates.latitude},${stop.coordinates.longitude}`} target="_blank" rel="noreferrer">{stop.name} 길 찾기 <span aria-hidden="true">↗</span></a></div></li>)}</ol>
    </div>
  );
}
