# Data Specification

**Owner:** Data ingestion and policy normalization  
**Status:** Product contract; MVP list and pet-detail field mapping validated against an issued-key response
**Last updated:** 2026-08-08

## 1. Purpose

This document defines how official tourism data becomes auditable pet-policy conditions. It owns data provenance, tri-state values, parsing evidence, confidence, freshness, and exact-match inputs.

Product behavior and terminology remain canonical in [PRD.md](../../PRD.md).

## 2. Official Sources

### Pet Travel Service

- Catalog: [Korea Tourism Organization Pet Travel Service](https://www.data.go.kr/data/15135102/openapi.do)
- Base service: `KorPetTourService2`
- Official scope: pet-friendly attractions, accommodations, restaurants, and shopping facilities; operating information; pet conditions; precautions; and pet-usable facilities
- Relevant operations include region, location, keyword, common detail, introduction detail, repeat detail, image detail, pet detail, synchronization, legal-district code, and classification code queries.
- The version-2 operation names and service URL changed in 2026; use the [official change notice](https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004471).

### Korean Tourism Information Service

- Catalog: [Korea Tourism Organization Korean Tourism Information Service](https://www.data.go.kr/data/15101578/openapi.do)
- Base service: `KorService2`
- Use: supplementary attractions, events, stays, common details, images, and nearby-place discovery

**Evidence date:** All source pages above were accessed on 2026-07-16.

### Phase 2 Sources (accessed 2026-08-05 from official v4.x manuals)

Each Phase 2 source has an independent daily quota of 1,000 requests and does not share budget with the Pet Travel Service. Sources marked "contentId-shared" join directly to existing `place_id` rows.

#### Barrier-free Tourism Service

- Base service: `KorWithService2`
- Endpoint: `http://apis.data.go.kr/B551011/KorWithService2`
- Key operation: `detailWithTour2` — per-`contentId` accessibility detail
- Scope: 28 accessibility fields across 4 disability groups (지체장애, 시각장애, 청각장애, 영유아가족)
- Cross-reference: standard `contentId` — joins directly to existing place rows
- Evidence class: `SOURCE_EXPLICIT` for factual presence of a facility; never modifies pet-admission tri-state

#### GoCamping Service

- Base service: `GoCamping`
- Endpoint: `http://apis.data.go.kr/B551011/GoCamping`
- Key operations: `basedList` (full catalog), `locationBasedList` (GPS + radius)
- Key field: `animalCmgCl` — pet admission flag ("가능" / "불가능")
- Additional fields: camping type (`induty`), facility list (`sbrsCl`), site counts, reservation URL (`resveUrl`)
- Cross-reference: standard `contentId` with `contentTypeId=28`
- Evidence class: `SOURCE_EXPLICIT` for pet admission; enters the same tri-state pipeline

#### Congestion Forecast Service

- Base service: `TatsCnctrRateService`
- Endpoint: `http://apis.data.go.kr/B551011/TatsCnctrRateService`
- Key operation: `tatsCnctrRatedList` — 30-day forward `cnctrRate` per tourist site
- Manual errata: service URL has "d" in `Rate` (not `Rated`); operation has "d" in `Rated` (not `Rate`)
- Cross-reference: `areaCd` + `sigunguCd` + `tAtsNm` (name-based); not contentId-direct
- Evidence class: `MODEL_DERIVED` — forecast data, not a policy constraint

#### General Tourism Service (Korean)

- Base service: `KorService2`
- Endpoint: `http://apis.data.go.kr/B551011/KorService2`
- Key operations: `searchFestival2` (festivals/events), `locationBasedList2` (nearby places), `detailImage2` (images)
- Additional field: `chkpet` in `detailIntro2` — pet-admission text for non-pet-API places
- Cross-reference: standard `contentId`

#### Related Tourist Sites Service

- Base service: `TarRlteTarService1`
- Endpoint: `http://apis.data.go.kr/B551011/TarRlteTarService1`
- Key operation: `areaBasedList1` — ranked related-tourist-site associations
- Cross-reference: proprietary hash codes (`tAtsCd`, `rlteTatsCd`); name + area mapping required
- Update cycle: monthly (8th of each month)

#### Visitor Volume Service

- Base service: `DataLabService`
- Endpoint: `http://apis.data.go.kr/B551011/DataLabService`
- Key operations: `metcoRegnVisitrDDList` (시도), `locgoRegnVisitrDDList` (시군구)
- Fields: daily visitor count, weekday, tourist type (현지인/외지인/외국인)
- Cross-reference: `areaCd` + `sigunguCd`

#### Durunubi Trail Service

- Base service: `Durunubi`
- Endpoint: `http://apis.data.go.kr/B551011/Durunubi`
- Key operations: `routeList` (길 목록), `courseList` (코스 상세)
- Fields: difficulty (`crsLevel`), distance, duration, GPX route URL
- Cross-reference: proprietary `routeIdx` / `crsIdx`; not contentId-compatible

#### Tourism Photo Gallery Service

- Base service: `PhotoGalleryService1`
- Endpoint: `http://apis.data.go.kr/B551011/PhotoGalleryService1`
- Key operation: `galleryDetailList1`
- Cross-reference: `galContentId` with `galContentTypeId=17` (separate type)

#### Rural Experience Villages (Standard Data) — added 2026-08-19

- Catalog: [전국농어촌체험휴양마을 표준데이터](https://www.data.go.kr/data/15013113/standard.do)
- Type: file data (JSON/CSV download); refreshed semiannually by the portal
- Providers: 한국농어촌공사 (farm villages), 한국어촌어항공단 (fishing villages)
- Fields: village name, sido/sigungu, program class/name (`+`-separated), facilities, road/jibun address, phone, designation date, homepage, WGS84 latitude/longitude, provider org, reference date
- Ingestion: `scripts/sync-villages.ts` reads `자료/전국농어촌체험휴양마을표준데이터.json` into `experience_villages` + `village_programs` (replace-all per sync)
- Classification: `village_kind` = `fishing` when the provider org contains `어촌어항` or the village name contains `어촌`; otherwise `farm`. The org name `한국농어촌공사` contains the substring `어촌` and must not be matched naively.
- Evidence class: no pet-policy fields exist; rural catalog entries never enter tri-state pet matching. The UI states that pet admission must be confirmed with each village.
- Current snapshot: 1,246 villages (1,087 farm / 159 fishing), 18,002 programs; 8 raw rows skipped (missing coordinates/address or duplicate names)

#### Rural Farm-Stay Guesthouses (농어촌민박업) — added 2026-08-19

- Catalog: [행정안전부_문화_농어촌민박업 조회서비스](https://www.data.go.kr/data/15155113/openapi.do)
- Type: REST OpenAPI (JSON+XML), auto-approved, 10,000 calls/day dev quota
- **Confirmed endpoint (extracted from the portal page's embedded operation spec):** `https://apis.data.go.kr/1741000/rural_homestays/info` — current-day data. A sibling `history` operation serves past snapshots by 기준일자. The portal's 상세기능 tab is login-gated; the operation names (`info`/`history`) live in the page's inline Swagger JSON.
- **Pagination cap:** the service returns at most 100 items per page regardless of `numOfRows`; the full catalog is 554+ pages (55,325 rows as of 2026-08-19, refreshed daily with a 2-day lag).
- Fields (live-confirmed): `MNG_NO` (management number, stable ID), `BPLC_NM` (business name), `ROAD_NM_ADDR`/`LOTNO_ADDR` (addresses), `LCPMT_YMD` (permit date), `SALS_STTS_CD`/`SALS_STTS_NM` (operation status), `CRD_INFO_X`/`CRD_INFO_Y` (EPSG:5174 TM easting/northing), `OPN_ATMY_GRP_CD` (sigungu code), `TELNO`, `DAT_UPDT_PNT`
- Coordinate conversion: `farmstay-provider.ts` implements TM inverse + Bessel→WGS84 3-parameter Molodensky (dX -146.21, dY 507.89, dZ 680.87). Verified against ground truth: 아라별 (X 282715.13, Y 139959.70) → 34.7542, 127.9042 — matches 경남 남해군 남면. Latitude range across 51,229 converted rows: 33.11–38.55 (Korean territory). Out-of-bounds conversions are nulled.
- Status policy: the catalog mixes 영업/정상 (36,604), 폐업 (18,629), 휴업 (92), and re-permits duplicate businesses under new `MNG_NO`. The region query (`loadFarmstaysByRegion`) filters to `영업/정상` only; history rows remain in the table for audit.
- Ingestion: `npm run sync:farmstay` → `farmstays` table (replace-all per sync, ~554 requests, budget 10,000/day)
- Evidence class: no pet-policy fields; same UNKNOWN treatment as villages

#### Farmstay Pet-Policy Inheritance — added 2026-08-19

- Matcher: `src/domain/farmstay-policy-match.ts` — a farmstay inherits a pet policy only when BOTH (a) it lies within 150m of a Pet Travel catalog `accommodation` place (haversine; TM conversion error is tens of meters) AND (b) normalized names are compatible (containment or shared token ≥ 2 chars after stripping parentheses/punctuation). Distance alone would conflate neighboring buildings; name alone would conflate chains.
- Ingestion: `npm run sync:farmstay-pets` reads active farmstays with coordinates (33,500) + the latest tour-api snapshot (9,695 places, 117 accommodations) and writes `farmstay_pet_policies` (migration v10, replace-all per run).
- Result (2026-08-19): 11 matches (e.g. 단양추억펜션민박 ↔ 단양추억펜션 @59m, 도그밀리(DOGMILY), 메리도그하우스). The match count is intentionally conservative — the accommodation catalog is small.
- Disclosure: matched farmstays show a 🐾 동반 가능 badge with an expandable evidence panel (source text + link to the KTO Pet Travel page); matched rows sort first in the region query. **Inheritance never enters tri-state hard matching** — it is display-only provenance. Unmatched farmstays remain UNKNOWN with the confirm-directly disclosure.

#### Regional Analytics Services

- Diversity: `AreaTarDivService` — `https://apis.data.go.kr/B551011/AreaTarDivService`
- Demand intensity: `AreaTarDemDsService` — `https://apis.data.go.kr/B551011/AreaTarDemDsService`
- Update cycle: monthly (16th of each month)
- Manual errata: diversity op#3 endpoint is `areaIntlDivList`, not `areaTouDivList` as shown in some manual sections

#### Multilingual Tourism Services

- English: `EngService2` — `http://apis.data.go.kr/B551011/EngService2`
- Traditional Chinese: `ChtService2` — `http://apis.data.go.kr/B551011/ChtService2`
- Cross-reference: standard `contentId`; pet-policy fields (`detailPetTour2`) are Korean-only

**Phase 2 evidence date:** All official manuals were accessed on 2026-08-05 from the competition OT materials distributed in `자료/[2026 관광데이터 활용 공모전] 웹·앱구현 부문 OT자료_/`.

### Phase 2E Sources — Real-Time Traffic Information (accessed 2026-08-08 from data.go.kr)

These sources are not Korea Tourism Organization services. They are separate government APIs with independent daily quotas and credential budgets. Traffic data is context-only and never enters the tri-state pet-policy pipeline.

#### MOLIT CCTV Service

- Catalog: [국토교통부_CCTV 화상자료](https://www.data.go.kr/data/15040466/openapi.do)
- Key data: real-time road CCTV video stream URLs, CCTV coordinates, location names, road route information
- Cross-reference: route corridor (coordinates along a generated course); not contentId-compatible
- Update cycle: real-time stream URL resolution on demand; catalog metadata cached server-side
- Evidence class: `REALTIME_SENSOR` — live observation, not a policy constraint
- Credential handling: API key and provider Referer header remain server-side; the client receives only a resolved stream URL

#### UTIC CCTV Service

- Catalog: [UTIC 교통 CCTV OpenData](http://www.utic.go.kr/guide/cctvOpenData.do)
- Key data: additional real-time CCTV stream URLs (regional coverage may vary)
- Cross-reference: route corridor; not contentId-compatible
- Note: requires separate UTIC registration; the existing traffic-analysis fork uses `getGyeonggiCctvUrl.do` which is Gyeonggi-only — nationwide coverage requires additional endpoint verification
- Evidence class: `REALTIME_SENSOR`

#### Korea Expressway Corporation Real-Time Congestion

- Catalog: [한국도로공사_실시간 고속도로 정체상황](https://www.data.go.kr/data/15076685/openapi.do)
- Key data: congested and sluggish section counts, section names, directional congestion type
- Cross-reference: route corridor (highway route names and node IDs)
- Update cycle: real-time (minute-level refresh)
- Evidence class: `REALTIME_SENSOR`

#### Korea Expressway Corporation Real-Time Traffic Speed

- Catalog: [한국도로공사_실시간 소통 데이터](https://www.data.go.kr/data/15076684/openapi.do)
- Key data: directional traffic speed (km/h) per highway section
- Cross-reference: route corridor (highway route names and node IDs)
- Update cycle: real-time (minute-level refresh)
- Evidence class: `REALTIME_SENSOR`

#### Korea Meteorological Administration Road Weather

- Catalog: [기상청_CCTV 기반 도로날씨정보](https://www.data.go.kr/data/15057966/openapi.do)
- Key data: temperature, precipitation, road surface condition, flooding status at CCTV observation points
- Cross-reference: CCTV coordinates (joins to CCTV catalog)
- Update cycle: real-time (10-minute refresh); daily quota 10,000 requests
- Evidence class: `REALTIME_SENSOR`

#### Korea Expressway Corporation Road Control

- Catalog: [한국도로공사_실시간 공사/통제 정보](https://www.data.go.kr/data/15076686/openapi.do)
- Key data: full road closures, lane restrictions, construction zones with start/end times
- Cross-reference: route corridor (highway route names)
- Update cycle: real-time
- Evidence class: `REALTIME_SENSOR`

**Phase 2E evidence date:** All source catalog pages were accessed on 2026-08-08 from data.go.kr.

## 3. Evidence Classes

| Class | Meaning | Can satisfy a hard constraint? |
|---|---|---|
| `SOURCE_EXPLICIT` | Official source text directly states the condition | Yes, unless contradicted or stale policy requires confirmation |
| `RULE_DERIVED` | A deterministic rule maps explicit source wording to a normalized value | Yes when confidence threshold passes and source span is retained |
| `MODEL_SUGGESTED` | A model proposes an interpretation for review | No; must be confirmed by a rule or human label |
| `USER_REPORTED` | A user submits a policy observation | No in MVP; future corroborating evidence only |
| `REALTIME_SENSOR` | Live government sensor or CCTV observation (traffic, weather, road control) | No; context-only overlay, never a pet-policy constraint |
| `UNRESOLVED` | Missing, ambiguous, or contradictory evidence | No |

## 4. Tri-State Contract

Every filterable condition is one of:

- `true`: sufficient positive evidence exists.
- `false`: sufficient negative evidence exists.
- `unknown`: evidence is absent, ambiguous, stale beyond policy, or contradictory.

`unknown` is intentionally different from `false`. Both fail a hard constraint, but the UI explanation differs.

## 5. Normalized Place Record

| Group | Logical field | Type | Provenance |
|---|---|---|---|
| Identity | `place_id` | string | Official content identifier |
| Identity | `source_service` | enum | Pet or general tourism service |
| Identity | `name` | string | Official source |
| Classification | `place_type` | enum | Attraction, accommodation, restaurant, shopping, cafe-like subtype, other |
| Location | `address` | string | Official source |
| Location | `region_code` / `district_code` | string or null | Official source |
| Location | `longitude` / `latitude` | number or null | Official location response |
| Contact | `phone` | string or null | Official source |
| Media | `primary_image_url` | URL or null | Official image response and license metadata |
| Operation | `opening_hours_raw` | string or null | Official source |
| Operation | `closed_days_raw` | string or null | Official source |
| Operation | `opening_windows` | structured intervals or unknown | Deterministic derivation |
| Policy | `pet_policy_raw` | string[] | Unmodified source passages |
| Policy | `pet_conditions` | map of normalized conditions | Derived with evidence ledger |
| Trust | `source_modified_at` | datetime or null | Official response |
| Trust | `ingested_at` | datetime | Ingestion system |
| Trust | `freshness_state` | enum | Derived product policy |

The MVP mapper pins the following issued-key response fields in `src/data/providers/providers.test.ts`:

| Operation | Provider fields consumed | Logical output |
|---|---|---|
| `areaBasedList2` | `contentid`, `contenttypeid`, `title`, `addr1`, `addr2`, `mapx`, `mapy`, `modifiedtime` | identity, category, name, address, coordinates, refresh token |
| `detailPetTour2` | `acmpyTypeCd`, `acmpyPsblCpam`, `acmpyNeedMtr`, `relaAcdntRiskMtr`, `etcAcmpyInfo`, `relaPosesFclty`, `relaFrnshPrdlst`, `relaPurcPrdlst`, `relaRntlPrdlst` | raw pet-policy evidence and related facilities/items |

The mapper paginates the complete base list, deduplicates content IDs in provider order, and uses the list item even when pet detail is not fetched or its request fails. Each row records `fetched`, `not-fetched`, or `failed`; anything other than confirmed detail remains unresolved and cannot pass a selected condition. Previously fetched detail is reused while the upstream modification token is unchanged. If a refresh is deferred or fails, the prior evidence and old token remain intact until a successful refresh. Pending rows advance before retry candidates; changed and failed retries rotate across persisted successful runs so one bad row cannot starve the catalog tail. Records with invalid coordinates are isolated. Logical names remain stable if the provider changes raw names.

## 6. Pet Condition Model

Each condition stores:

| Field | Meaning |
|---|---|
| `key` | Stable condition identifier |
| `value` | `true`, `false`, or `unknown` |
| `evidence_class` | One of the classes in Section 3 |
| `confidence` | `high`, `medium`, `low`, or `unresolved` |
| `source_text` | Exact supporting source span |
| `source_field` | Raw field or payload section |
| `rule_id` | Deterministic rule version, if derived |
| `conflict` | Whether positive and negative evidence coexist |
| `interpreted_at` | Parser run timestamp |

### Initial condition vocabulary

- Species explicitly allowed
- Size/weight band allowed
- Number of pets allowed
- All areas / selected areas / outdoor only
- Indoor access
- Carrier required or accepted
- Leash required
- Muzzle required
- Aggressive or legally restricted breed limitation
- Parking available
- Pet toilet or waste facility available
- Pet play area available
- Additional fee or deposit mentioned
- Advance inquiry or reservation required

The vocabulary is extensible, but a new key requires labeled examples, a deterministic meaning, and a UI owner before release.

## 7. Parsing Pipeline

1. **Preserve raw payload:** store source response, request parameters, ingestion time, and source version.
2. **Normalize text:** Unicode normalization, whitespace cleanup, punctuation standardization, and Korean synonym canonicalization.
3. **Segment claims:** separate sentences and list-like clauses while retaining character offsets.
4. **Apply deterministic rules:** match positive phrases, negative phrases, requirements, quantities, species, size, and area restrictions.
5. **Resolve negation:** negative phrases override nearby positive keywords within the same claim span.
6. **Detect conflict:** positive and negative claims for the same key produce `unknown` until resolved.
7. **Attach evidence:** retain source text, field, offsets, and rule version.
8. **Validate:** compare against a human-labeled fixture set.
9. **Publish normalized record:** only validated rule output may qualify a hard constraint.

### Example rule behavior

| Source phrase pattern | Normalized result |
|---|---|
| “목줄 착용 시 동반 가능” | `leash_required=true`; general admission may be true if no conflicting restriction exists |
| “실내 동반 불가” | `indoor_access=false` |
| “이동장 이용 시 실내 가능” | `indoor_access=true`; `carrier_required=true` |
| “대형견 제외” | large-size admission `false`; other sizes remain unknown unless stated |
| “17kg 이하 또는 6개월 미만 대형견 동반 가능” | broad medium/large size-band admission remains `unknown`; the qualifier does not prove the whole band |
| “일부 구역 가능” | all-area access `false`; selected-area access `true` |

Keyword presence alone is insufficient. For example, “입마개 불필요” and “입마개 필수” must not map to the same value.

## 8. Matching Contract

For query hard constraints `H` and place conditions `P`:

```text
exact_match(place, query) = every h in H has P[h] == true
```

- `false` fails with “does not meet this condition.”
- `unknown` fails with “information not confirmed.”
- Preferences are scored only after exact qualification and cannot compensate for a failed hard constraint.
- Sort order applies within, never across, qualification groups.
- Counts are computed over the complete stored snapshot. The API returns the global exact count plus a page of at most 50 result objects.

For every non-empty query, each searchable place belongs to exactly one user-visible disposition:

- `confirmed-match`: every selected condition is true with evidence.
- `confirmed-non-match`: at least one selected condition is explicitly false; false takes precedence over other unknown conditions.
- `unverified`: no selected condition is explicitly false, but at least one is unknown or lacks evidence.

The three counts must sum to `searchableCount`. A fetched pet-detail row can still be `unverified` for a specific condition, so `detailCoverage` is ingestion coverage and must not be presented as a condition-decision denominator. `filteredCount` remains a compatibility alias for the confirmed-match count in filtered mode.

## 9. Minimal Relaxation

Input: exact-match query, preference set, and candidate condition matrix.

1. Lock all hard constraints.
2. Enumerate preference removals by smallest cardinality.
3. Select the first removal set that yields at least one exact result.
4. If multiple sets tie, prefer the set with more results, then less semantic importance as configured by the user.
5. If no preference-only removal yields a result, return no relaxation.

The system may explain which hard constraint blocks results but may not recommend disabling it as an automatic action.

## 10. Freshness Policy

Freshness describes source recency, not current venue truth.

| State | Rule |
|---|---|
| `current` | Source modified within 30 days |
| `aging` | Source modified 31–90 days ago |
| `stale` | Source modified more than 90 days ago |
| `unknown` | Modification time unavailable or invalid |

- `ingested_at` is shown internally and never substitutes for `source_modified_at`.
- Admission-critical details always show a confirmation action, regardless of freshness.
- A stale or unknown value can remain searchable only when explicit evidence exists, but the result must show a warning; a product test may tighten this rule after precision evaluation.

## 11. Course Data Contract

Course generation may use:

- Exact-qualified place IDs
- Place category
- Coordinates
- Parsed opening windows or unknown status
- User start location, date/time, duration, desired categories, and mobility mode

It may not infer:

- Real driving/walking time without a routing provider
- Real-time traffic, congestion, booking inventory, or venue policy
- Opening feasibility from missing hours without a warning

### Approximate mode

- Use geographic distance to order candidates.
- Label output “approximate order.”
- Display distance, not travel minutes.
- Hand off actual navigation to a map provider.

### Routed mode

- Use a separately configured routing provider.
- Record provider, request time, mode, and route duration.
- Keep routing evidence separate from tourism-source evidence.

## 11.1 Traffic and CCTV Data Contract

Traffic data is real-time context attached to a course, not a persistent catalog of places. It follows different freshness and lifecycle rules than tourism data.

### CCTV catalog record

| Field | Type | Provenance |
|---|---|---|
| `cctv_id` | string | Provider (MOLIT or UTIC) |
| `name` | string | Provider location name |
| `latitude` / `longitude` | number | Provider coordinates |
| `route_name` | string or null | Provider road route name |
| `direction` | string or null | Provider camera direction label |
| `provider` | enum (`molit` / `utic`) | Ingestion source |
| `ingested_at` | datetime | Ingestion system |

### CCTV stream resolution

| Field | Type | Notes |
|---|---|---|
| `stream_url` | URL | Resolved on demand; short TTL; not persisted |
| `resolved_at` | datetime | Resolution timestamp |
| `cors_supported` | boolean | If true, client connects directly; if false, server proxies the stream |
| `source_provider` | enum | Which provider resolved the URL |

Stream URLs are ephemeral. They must not be cached beyond the active session or reused across page loads.

### Traffic condition record

| Field | Type | Provenance |
|---|---|---|
| `condition_type` | enum (`congestion`, `speed`, `weather`, `closure`) | Data source type |
| `route_ref` | string | Highway or road section identifier |
| `direction` | string or null | Travel direction |
| `value` | varies by type | Speed in km/h, congestion level enum, weather descriptor, or closure type |
| `observation_time` | datetime | Provider observation or publication timestamp |
| `source_provider` | enum | Which provider supplied the record |
| `fetched_at` | datetime | Local fetch timestamp |

Traffic conditions are fetched on demand per course request. They are not appended to the SQLite store and must not be served stale across sessions.

### Vehicle detection output (client-side)

| Field | Type | Notes |
|---|---|---|
| `total_count` | integer | All detected vehicles in the current frame |
| `moving_count` | integer | Vehicles classified as moving via inter-frame tracking |
| `stopped_count` | integer | `total_count - moving_count` |
| `by_class` | map | Breakdown: car, truck, bus, motorcycle, bicycle |
| `inference_ms` | number | Single-frame inference duration |
| `roi_label` | string or null | Active ROI filter label |
| `model_version` | string | COCO-SSD base variant (`mobilenet_v2`) and threshold config |

Detection output is transient client state. It is never transmitted to the server, persisted, or logged. The count must always be displayed with an "AI 추정" label.

## 12. Quality and Evaluation

Maintain a versioned labeled dataset covering:

- Positive, negative, and missing examples for every released condition
- Negation and conditional-admission phrases
- Conflicting statements
- Multiple species and size limits
- Area-only restrictions
- Stale and missing timestamps

Minimum reports:

- Per-condition precision, recall, and unknown rate
- Exact-query precision across multi-condition scenarios
- Conflict rate and unresolved rate
- Rule version and fixture commit identifier

For the competition MVP, exact-result precision has priority over recall.

## 13. Failure Handling

| Failure | Data behavior | User behavior |
|---|---|---|
| Provider request failure | Retain last valid snapshot and error metadata | Show cached-data freshness or retry state |
| Quota exceeded | Stop repeated upstream calls; serve snapshot | Explain temporary refresh delay |
| Parser exception | Preserve raw record; mark affected conditions unknown | Exclude from guaranteed results |
| Conflicting claims | Mark condition unknown with both spans | Show “policy needs confirmation” |
| Missing coordinates | Keep place searchable by region | Exclude from distance course until resolved |
| CCTV stream URL resolution failure | Return error without fallback URL | Show "스트림 일시 중단" and offer next camera on route |
| Traffic provider unavailable | Return course without traffic context | Show no traffic panel rather than stale data |
| AI model load failure | Detection overlay stays disabled | Show "AI 분석을 사용할 수 없습니다" without blocking video playback |
| AI inference error mid-stream | Discard current frame result, continue loop | Show last successful count with stale indicator or "분석 중" |

## 14. Data Boundaries

- Do not store API keys in client code or committed files.
- Do not collect precise location until the user requests nearby search.
- Do not log raw user location beyond the precision needed for the active query.
- Preserve image-license metadata and follow source usage restrictions.
- Keep official text, derived interpretation, and user reports in separate fields.
- Do not expose CCTV or traffic API keys, Referer headers, or provider credentials to the web client.
- Do not persist CCTV stream URLs beyond the active session; stream URLs are resolved on demand.
- Do not cache real-time traffic condition data across sessions or serve it as stale context.
- Do not transmit CCTV video frames or AI detection results from the client to any server.
- Do not present AI vehicle counts without an "AI 추정" provenance label.
- Do not treat traffic conditions as pet-policy evidence; traffic data is context-only.

## 15. Implemented Domain Binding

The current TypeScript binding is authoritative for executable semantics:

- `src/data/contracts.ts` parses provider snapshots and source evidence at the ingress boundary.
- `src/domain/types.ts` defines `true | false | unknown`, evidence, constraints, proof, failures, and relaxation proposals.
- `src/domain/normalize.ts` applies conservative deterministic Korean phrase rules. Missing or ambiguous text remains `unknown`.
- `src/domain/match.ts` requires every selected condition to be `true` with non-null evidence; an empty constraint set is not an exact match.
- `src/domain/relax.ts` enumerates the smallest removable ordinary-preference set and excludes hard or safety/legal/access/admission constraints.
- `GET /api/places?hard=outdoor,leash&preferences=carrier&page=1` exposes complete-snapshot counts, safe relaxation metadata, and at most 50 proof-bearing result objects using the same functions. The legacy `conditions` parameter remains a hard-condition alias.

The checked-in product fixture remains sanitized deterministic development data, not current venue truth. Separately, official-shaped provider contract tests pin the sanctioned issued-key field mapping without committing the credential or raw response. The runtime SQLite store archives the validated logical `ProviderSnapshot` and its relational projection; complete raw per-operation HTTP envelope archival remains future scope and is not claimed by the MVP.
