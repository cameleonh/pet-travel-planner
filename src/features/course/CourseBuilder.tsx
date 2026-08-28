"use client";

import { useId, useMemo, useState } from "react";
import { buildApproximateCourseFromPlaces, type CourseOrderMode, type CourseResult } from "@/domain/course";
import type { Coordinates } from "@/domain/geo";
import type { PlanPlace } from "@/domain/plan";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

type Props = {
  selectedPlaces: PlanPlace[];
  origin: Coordinates;
  highlightAction: boolean;
  onApplyOrder: (orderedPlaceIds: string[]) => void;
  onConfigurationChange: () => void;
};

function placeSetKey(places: PlanPlace[]): string {
  return places.map((place) => place.id).sort().join("|");
}

export function CourseBuilder({ selectedPlaces, origin, highlightAction, onApplyOrder, onConfigurationChange }: Props) {
  const { lang, dict } = useLang();
  const radioName = useId();
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [originId, setOriginId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<CourseOrderMode>("nearby");
  const [generated, setGenerated] = useState<{ placeSetKey: string; course: CourseResult } | null>(null);
  const includedPlaces = useMemo(
    () => selectedPlaces.filter((place) => !excludedIds.has(place.id)),
    [excludedIds, selectedPlaces],
  );
  const effectiveOriginId = includedPlaces.some((place) => place.id === originId)
    ? originId!
    : includedPlaces[0]?.id ?? "";
  const course = generated?.placeSetKey === placeSetKey(selectedPlaces) ? generated.course : null;
  const hasEnoughPlaces = includedPlaces.length >= 2;

  const togglePlace = (placeId: string) => {
    setGenerated(null);
    onConfigurationChange();
    setExcludedIds((current) => {
      const next = new Set(current);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const buildCourse = () => {
    const selectedOrigin = includedPlaces.find((place) => place.id === effectiveOriginId);
    const result = buildApproximateCourseFromPlaces(includedPlaces, selectedOrigin?.coordinates ?? origin, orderMode);
    if (result.success) {
      const orderedPlaceIds = result.stops.map((stop) => stop.placeId);
      const appliedPlaces = orderedPlaceIds
        .map((id) => includedPlaces.find((place) => place.id === id))
        .filter((place): place is PlanPlace => Boolean(place));
      setGenerated({ placeSetKey: placeSetKey(appliedPlaces), course: result });
      onApplyOrder(orderedPlaceIds);
      return;
    }
    setGenerated({ placeSetKey: placeSetKey(selectedPlaces), course: result });
  };

  return (
    <section className="extension-card course-card" aria-labelledby="course-title">
      <div className="extension-heading">
        <div><p className="section-kicker">{dict.courseTitle}</p><h2 id="course-title">{dict.courseHeading}</h2></div>
        <span>{t(lang, "courseChosenCount", { n: includedPlaces.length })}</span>
      </div>
      <p className="course-intro">{dict.courseIntro}</p>

      <fieldset className="course-stop-picker">
        <legend>{dict.courseChooseStops}</legend>
        <div className="course-stop-options">
          {selectedPlaces.map((place) => {
            const checked = !excludedIds.has(place.id);
            return (
              <label key={place.id} className={checked ? "selected" : ""}>
                <input type="checkbox" checked={checked} onChange={() => togglePlace(place.id)} />
                <span aria-hidden="true">{checked ? "✓" : "−"}</span>
                <span><strong>{place.name}</strong><small>{place.address}</small></span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="course-config-grid">
        <label className="course-origin-select">
          <span>{dict.courseStartPlace}</span>
          <select
            value={effectiveOriginId}
            disabled={includedPlaces.length === 0}
            onChange={(event) => { setGenerated(null); onConfigurationChange(); setOriginId(event.target.value); }}
          >
            {includedPlaces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
          </select>
        </label>
        <fieldset className="course-order-picker">
          <legend>{dict.courseOrder}</legend>
          <label className={orderMode === "nearby" ? "selected" : ""}>
            <input type="radio" name={radioName} value="nearby" checked={orderMode === "nearby"} onChange={() => { setGenerated(null); onConfigurationChange(); setOrderMode("nearby"); }} />
            <span>{dict.courseOrderNearby}</span>
          </label>
          <label className={orderMode === "saved" ? "selected" : ""}>
            <input type="radio" name={radioName} value="saved" checked={orderMode === "saved"} onChange={() => { setGenerated(null); onConfigurationChange(); setOrderMode("saved"); }} />
            <span>{dict.courseOrderSaved}</span>
          </label>
        </fieldset>
      </div>

      <p className="course-apply-note">{dict.courseApplyNote}</p>
      <button className={`course-button ${highlightAction && !course?.success ? "next-action-cue" : ""}`} type="button" disabled={!hasEnoughPlaces} onClick={buildCourse}>
        {!hasEnoughPlaces ? dict.courseNeedTwo : t(lang, course?.success ? "courseButton" : "courseReady", { n: includedPlaces.length })}
      </button>
      {course?.success ? <p className="course-applied" role="status">{dict.courseApplied}</p> : course ? <p className="course-error" role="alert">{course.message}</p> : null}
    </section>
  );
}
