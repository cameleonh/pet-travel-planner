# Competition Demo Script — 같이갈개 (Current Live Flow)

**Duration:** 5–6 minutes
**Service:** <https://gggo.blog>
**Selected assignment:** #6 — ambiguous pet-entry rules cause refusals and wasted trips.
**Data mode:** successful KTO OpenAPI-derived SQLite snapshot, not per-visit live API calls.
**Latest snapshot:** run 32 / snapshot 14; fetched `2026-08-05`; 9,695 source places, 9,695 detail-fetched, 0 pending, 0 failed. The venue rules are not real-time guarantees.

This is a rehearsal guide for the deployed experience. The first-round functional-description PDF is the submitted artifact and should remain unchanged; the PPTX in the folder is a working source file, not the uploaded file. The live UI labels the carrier filter `이동가방 필수`; leash is shown as a preparation note, not as a search filter. A one-place course is supported.

## Setup and API evidence

1. Use the production site at a mobile-width browser. Confirm the coverage disclosure reads `9,695 / 9,695 · 100.0%`, and the footer identifies the data collection date as `2026-08-05`.
2. If rehearsing locally, use `DATA_PROVIDER=database` with the verified snapshot. Do not switch to the two-place fixture during the judged flow or describe the snapshot as live venue status.
3. For the OpenAPI evidence question, explain the actual lineage: `KorPetTourService2.areaBasedList2` supplies the catalog and `detailPetTour2` supplies pet-entry text; `scripts/sync-tour-db.ts` publishes a validated snapshot that the web app reads. Run 32 / snapshot 14 recorded 271 official requests and the final 9,695/9,695 counts. Keep the submitted API application information/call-history evidence available separately; never show the API key in the demo.

## Five-minute flow

### 1. State the decision problem — 20 seconds

“A broad ‘pet-friendly’ label is not enough. Together with the guardian, we check the actual entry conditions before the trip and show the source for each result.” Tie this directly to assigned topic #6.

### 2. Establish the data and its limit — 35 seconds

Open the data-coverage disclosure: 9,695 source places, 9,695 detailed records, 100.0% coverage, 0 pending, 0 failed. Point to the collection date. Be explicit that the page reads the latest successful stored API snapshot; it does not call KTO for every visitor and it does not promise real-time venue policy.

### 3. Show how each condition changes the result — 75 seconds

Choose `부산광역시` → `해운대구`. On snapshot 14, the region has 102 searchable KTO places. Enter `8.5 kg` to select `소형견`: 102 remain confirmed, because the KTO records in this region state general or all-breed admission. Add `이동가방 필수`: 4 remain. Select `관광지`: 1 remains, `해운대 블루라인파크`. If a later approved sync changes the counts, narrate the live counts rather than promising these fixed numbers.

### 4. Prove the decision — 60 seconds

Open `해운대 블루라인파크`. In `방문 전 준비`, expand `원문 근거·확인일` for the carrier: the KTO text requires a carrier and says the dog's whole body must fit inside it; show the observation date `2026-07-30` and source link. Then expand the admission proof to show the all-breeds evidence. Explain that unknown information is not counted as confirmed. The carrier filter selects records whose source text requires a carrier; leash remains in `방문 전 준비`, not the filter controls.

### 5. Show a zero-result choice without hidden relaxation — 35 seconds

Keep the Haeundae, small-dog, and carrier requirements, then change the category to `카페`. Snapshot 14 has zero confirmed KTO matches for that exact query. Explain that this means no KTO record matched the selected combination—not that Haeundae has no pet-friendly cafés. The separately labeled Kakao café discovery is supplementary and asks users to confirm admission directly; no safety or admission condition is silently loosened. Return to `관광지` explicitly to restore the confirmed result.

### 6. Make a short trip plan — 90 seconds

Clear `이동가방 필수` deliberately while keeping the small-dog and Haeundae criteria. Save two confirmed places using `여행에 담기`, then press `장소 선택 완료 · 추가 선택`. Review regional/nearby additions as optional, open the course builder, and compare the route result. Point out each stop's predicted arrival against its published hours: simple known ranges can flag an outside-hours visit or a registered weekly closing day, while missing/complex hours remain unverified. If Kakao route data is unavailable, show the explicit fallback and do not describe straight-line distance as road travel time. The flow also works with one saved place.

### 7. Close — 30 seconds

Summarize: official KTO source → stored, validated snapshot → condition-by-condition decision → visible proof → optional course built from selected places. Remind judges that venue policies may change and should be reconfirmed before departure.

## Rehearsal checks

- Use the database-backed Playwright flow (`E2E_DATA_PROVIDER=database`) before presenting; it verifies the 9,695-place snapshot, a Busan/Haeundae dog-profile search, saved places, and the course flow.
- Confirm the public sitemap has real fetched place URLs and no `fixture-*` URLs.
- Keep the source/API call evidence and applicant application information ready for Q&A, but keep credentials out of screenshots, slides, and public repositories.
- The submitted PDF lists six KTO API groups (seven underlying service IDs including English and Chinese services). This spoken demo focuses on the core KTO pet-entry data path; mention supplementary APIs only if asked.
- Do not add CCTV/AI claims to the core demonstration unless they are part of the submitted service scope and have a verified live fallback.
