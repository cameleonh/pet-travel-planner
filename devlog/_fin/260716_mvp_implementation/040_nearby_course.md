# Phase 3 — Nearby auxiliary catalog and safe courses

## Change map

- NEW `src/domain/geo.ts`: Haversine distance and deterministic coordinate ordering.
- NEW `src/domain/course.ts`: exact-qualified stop selection and approximation disclosure.
- NEW `src/features/nearby/NearbyCatalog.tsx`: category filters, distance, exact/confirmation separation.
- NEW `src/features/course/CourseBuilder.tsx`, `CourseTimeline.tsx`: safe itinerary generation and proof summary.
- NEW `src/domain/geo-course.test.ts`, `e2e/course.spec.ts`.
- MODIFY fixture data to include museums, parks, parking, veterinary hospitals, and toilets with provenance.
- MODIFY `docs/product/USER_FLOWS.md`, `docs/architecture/ARCHITECTURE.md`.

## Acceptance and activation scenarios

- Location permission denial activates a manual reference-place fallback.
- Nearby POIs are ordered by coordinate distance and labeled as approximate.
- Auxiliary places with unknown pet status appear only in the confirmation-needed group.
- A course candidate containing one non-exact stop is rejected by the domain invariant.
- Without routing data, no travel-minute claim is rendered.

## Implementation result

- Haversine ordering and pet-status partitioning are implemented in `src/domain/geo.ts`.
- Exact-only approximate course construction is implemented in `src/domain/course.ts`.
- The nearby catalog requests location only after a button press, keeps no precise-location storage, and falls back to the first exact place when location is denied.
- The course card resets whenever constraints change, consumes only current exact matches, and labels coordinate ordering as approximate.
- Desktop observation found a sticky-filter overlap over the extension row. The filter was made non-sticky and the repaired layout was recaptured.
