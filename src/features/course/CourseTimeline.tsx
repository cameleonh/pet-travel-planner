"use client";

import type { CourseResult } from "@/domain/course";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

export function CourseTimeline({ course }: { course: Extract<CourseResult, { success: true }> }) {
  const { lang, dict } = useLang();
  return (
    <div className="course-result" aria-live="polite">
      <div className="route-disclosure"><strong>{dict.courseTimelineOrdered}</strong><p>{course.disclosure}</p></div>
      <ol>{course.stops.map((stop, index) => <li key={stop.placeId}><span>{index + 1}</span><div><strong>{stop.name}</strong><p>{t(lang, "courseTimelineDistance", { n: stop.distanceFromOriginKm.toFixed(1) })}</p><a href={`https://map.kakao.com/link/to/${encodeURIComponent(stop.name)},${stop.coordinates.latitude},${stop.coordinates.longitude}`} target="_blank" rel="noreferrer">{t(lang, "courseTimelineDirections", { name: stop.name })} <span aria-hidden="true">↗</span></a></div></li>)}</ol>
    </div>
  );
}
