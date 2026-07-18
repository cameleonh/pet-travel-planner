"use client";

import { useState } from "react";
import { buildApproximateCourse, type CourseResult } from "@/domain/course";
import type { Coordinates } from "@/domain/geo";
import type { MatchEvaluation } from "@/domain/types";
import { CourseTimeline } from "@/features/course/CourseTimeline";

type Props = { matches: MatchEvaluation[]; origin: Coordinates };

export function CourseBuilder({ matches, origin }: Props) {
  const [course, setCourse] = useState<CourseResult | null>(null);
  return (
    <section className="extension-card course-card" aria-labelledby="course-title">
      <div className="extension-heading"><div><p className="section-kicker">코스 만들기</p><h2 id="course-title">찾은 장소를 한 번에 정리해요</h2></div><span>{matches.length}곳</span></div>
      <p className="course-intro">지금 조건에 모두 맞는 장소만 가까운 순서로 정리해요.</p>
      <button className="course-button" type="button" disabled={matches.length === 0} onClick={() => setCourse(buildApproximateCourse(matches, origin))}>{matches.length ? `${matches.length}곳 코스 만들기` : "먼저 맞는 장소를 찾아주세요"}</button>
      {course?.success ? <CourseTimeline course={course} /> : course ? <p className="course-error" role="alert">{course.message}</p> : null}
    </section>
  );
}
