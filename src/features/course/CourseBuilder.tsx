"use client";

import { useState } from "react";
import { buildApproximateCourse, type CourseResult } from "@/domain/course";
import type { Coordinates } from "@/domain/geo";
import type { MatchEvaluation } from "@/domain/types";
import { CourseTimeline } from "@/features/course/CourseTimeline";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

type Props = { matches: MatchEvaluation[]; origin: Coordinates };

export function CourseBuilder({ matches, origin }: Props) {
  const { lang, dict } = useLang();
  const [course, setCourse] = useState<CourseResult | null>(null);
  return (
    <section className="extension-card course-card" aria-labelledby="course-title">
      <div className="extension-heading"><div><p className="section-kicker">{dict.courseTitle}</p><h2 id="course-title">{dict.courseHeading}</h2></div><span>{matches.length}곳</span></div>
      <p className="course-intro">{dict.courseIntro}</p>
      <button className="course-button" type="button" disabled={matches.length === 0} onClick={() => setCourse(buildApproximateCourse(matches, origin))}>{matches.length ? t(lang, "courseButton", { n: matches.length }) : dict.courseNeedMatch}</button>
      {course?.success ? <CourseTimeline course={course} /> : course ? <p className="course-error" role="alert">{course.message}</p> : null}
    </section>
  );
}
