# Phase 2 Upgrade Roadmap — Multi-Source Data Integration

**Status:** Design in progress
**Last updated:** 2026-08-08
**Source documents:** [PRD.md](../../PRD.md) §18, [DATA_SPEC.md](../data/DATA_SPEC.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md)

## 1. Objective

Transform 같이갈개 from a single-source pet-policy lookup into a multi-dimensional travel planning surface. The MVP answers "can I bring my pet here?" Phase 2 adds "should I go, and when?"

The upgrade leverages 12 Korea Tourism Organization OpenAPI services analyzed from the official v4.x manuals distributed in the 2026 competition OT materials. Phase 2E extends this with 6 real-time traffic and CCTV data sources from separate government agencies.

## 2. Integration Tiers

### Tier 1 — Direct Enrichment (contentId-shared, immediate value)

| ID | Source | Service ID | Endpoint | Why first |
|---|---|---|---|---|
| P2A-1 | Barrier-free tourism | `KorWithService2` | `http://apis.data.go.kr/B551011/KorWithService2` | Joins existing `place_id` directly; 28 accessibility fields across 4 disability groups; separate daily quota |
| P2A-2 | GoCamping | `GoCamping` | `http://apis.data.go.kr/B551011/GoCamping` | `animalCmgCl` field enables pet-friendly camping as a new category; reservation URL enables booking handoff; standard contentId |
| P2A-3 | Congestion forecast | `TatsCnctrRateService` | `http://apis.data.go.kr/B551011/TatsCnctrRateService` | 30-day forward `cnctrRate` per tourist site — unique data dimension no other API provides |

### Tier 2 — Discovery Expansion

| ID | Source | Service ID | Endpoint | Value |
|---|---|---|---|---|
| P2B-1 | General tourism (Korean) | `KorService2` | `http://apis.data.go.kr/B551011/KorService2` | Festivals, nearby places, images, `chkpet` for non-pet-API places |
| P2B-2 | Related tourist sites | `TarRlteTarService1` | `http://apis.data.go.kr/B551011/TarRlteTarService1` | Ranked "people who visit X also visit Y" with category labels |
| P2B-3 | Visitor volume | `DataLabService` | `http://apis.data.go.kr/B551011/DataLabService` | Daily visitor counts by region — resident/visitor/foreigner and weekday patterns |

### Tier 3 — Experience Enhancement

| ID | Source | Service ID | Endpoint | Value |
|---|---|---|---|---|
| P2C-1 | Durunubi trails | `Durunubi` | `http://apis.data.go.kr/B551011/Durunubi` | Walking/cycling courses with difficulty, distance, duration, GPX routes |
| P2C-2 | Tourism photo gallery | `PhotoGalleryService1` | `http://apis.data.go.kr/B551011/PhotoGalleryService1` | KTO-certified high-quality photos for place cards |
| P2C-3 | Regional analytics | `AreaTarDivService` / `AreaTarDemDsService` | `https://apis.data.go.kr/B551011/AreaTarDivService` | Monthly regional diversity and demand intensity indices |

### Tier 4 — Multilingual Expansion

| ID | Source | Service ID | Endpoint | Value |
|---|---|---|---|---|
| P2D-1 | English tourism | `EngService2` | `http://apis.data.go.kr/B551011/EngService2` | English translations for places sharing the same contentId |
| P2D-2 | Traditional Chinese tourism | `ChtService2` | `http://apis.data.go.kr/B551011/ChtService2` | Chinese translations for the same contentId set |

### Tier 5 — Real-Time Traffic Information (Phase 2E)

These sources are not KTO services. They are separate government APIs with independent credentials and quotas. Traffic data is context-only and never enters the pet-policy tri-state pipeline.

| ID | Source | Provider | Endpoint / Catalog | Value |
|---|---|---|---|---|
| P2E-1 | CCTV video | MOLIT / UTIC | [CCTV 화상자료](https://www.data.go.kr/data/15040466/openapi.do) / [UTIC OpenData](http://www.utic.go.kr/guide/cctvOpenData.do) | Real-time road CCTV streams and coordinates for route-based camera display |
| P2E-2 | AI vehicle detection | Client-side TF.js | N/A (in-browser) | On-screen vehicle count (moving/stopped) using COCO-SSD; lazy-loaded |
| P2E-3 | Real-time congestion | Korea Expressway Corp | [실시간 정체](https://www.data.go.kr/data/15076685/openapi.do) + [소통 데이터](https://www.data.go.kr/data/15076684/openapi.do) | Congested/sluggish section counts and directional speeds |
| P2E-3 | Road weather | KMA | [도로날씨](https://www.data.go.kr/data/15057966/openapi.do) | Rain, surface flooding, road condition at CCTV points |
| P2E-3 | Road control | Korea Expressway Corp | [공사/통제](https://www.data.go.kr/data/15076686/openapi.do) | Full closures, lane restrictions, construction zones |

## 3. Cross-Reference Matrix

| Source | contentId join | areaCode/sigunguCode join | Proprietary ID | Shared quota |
|---|---|---|---|---|
| `KorWithService2` (barrier-free) | ✅ direct | ✅ | — | Separate 1,000/day |
| `GoCamping` (camping) | ✅ direct | ✅ | — | Separate 1,000/day |
| `TatsCnctrRateService` (congestion) | ❌ | ✅ areaCd + sigunguCd | `tAtsNm` (name-based) | Separate 1,000/day |
| `KorService2` (general tourism) | ✅ direct | ✅ | — | Separate 1,000/day |
| `TarRlteTarService1` (related) | ❌ | ✅ | `tAtsCd` / `rlteTatsCd` (hash) | Separate 1,000/day |
| `DataLabService` (visitors) | ❌ | ✅ | — | Separate 1,000/day |
| `Durunubi` (trails) | ❌ | ❌ | `routeIdx` / `crsIdx` | Separate 1,000/day |
| `PhotoGalleryService1` (photos) | ⚠️ partial (type 17) | ❌ | `galContentId` | Separate 1,000/day |
| `AreaTarDivService` (diversity) | ❌ | ✅ | — | Separate 1,000/day |
| `AreaTarDemDsService` (demand) | ❌ | ✅ | — | Separate 1,000/day |
| `EngService2` (English) | ✅ direct | ✅ | — | Separate 1,000/day |
| `ChtService2` (Chinese) | ✅ direct | ✅ | — | Separate 1,000/day |
| MOLIT/UTIC CCTV | ❌ | ❌ | route corridor (coordinates) | Separate quota per agency |
| Expressway Corp congestion | ❌ | ❌ | route corridor (highway refs) | Separate quota |
| KMA road weather | ❌ | ❌ | CCTV coordinates | 10,000/day |
| Expressway Corp control | ❌ | ❌ | route corridor (highway refs) | Separate quota |

## 4. Schema Impact

### 4.1 New enrichment tables (attached to existing `contentId`)

```
place_accessibility (
  snapshot_id, place_id,
  wheelchair, parking, elevator, restroom,       -- 지체장애
  braileblock, helpdog, audioguide,              -- 시각장애
  signguide, videoguide,                          -- 청각장애
  stroller, lactationroom, babysparechair,       -- 영유아
  ...
)

place_camping (
  snapshot_id, place_id,
  animal_cmg_cl,        -- pet admission: "가능" / "불가능"
  induty,               -- camping type
  sbrs_cl,              -- facility list
  glamp_site_co,        -- glamping site count
  caravan_site_co,      -- caravan site count
  general_site_co,      -- general site count
  resve_url,            -- reservation page URL
  oper_pd_cl,            -- operating period
  first_image_url        -- representative image
)

place_congestion (
  snapshot_id, place_id,
  base_ymd,             -- date (YYYYMMDD)
  cnctr_rate,            -- congestion rate (numeric)
  area_cd, sigungu_cd    -- regional linkage
)
```

### 4.2 New standalone tables (proprietary ID systems)

```
trail_courses (
  snapshot_id,
  route_idx,             -- Durunubi route ID
  crs_idx,               -- course ID
  crs_kor_nm,            -- course name
  crs_dstnc,             -- distance (km)
  crs_totl_rqrm_hour,    -- total time (minutes)
  crs_level,             -- difficulty (1=easy, 2=moderate, 3=hard)
  crs_cycle,             -- loop type
  gpxpath,               -- GPX file URL
  sigun                  -- administrative district
)

festivals (
  snapshot_id, content_id,
  title,                 -- festival name
  eventstartdate,        -- start date (YYYYMMDD)
  eventenddate,          -- end date
  festivalgrade,         -- grade
  area_code, sigungu_code,
  mapx, mapy,
  firstimage
)
```

### 4.3 Code-book requirement

All big-data APIs (`TatsCnctrRateService`, `DataLabService`, `AreaTarDivService`, `AreaTarDemDsService`, `TarRlteTarService1`) share the `areaCode` + `sigunguCode` regional system. A canonical area-code lookup table must be built first and cached, either from `KorWithService2/areaCode2` or from the existing project `한국관광공사_관광지_시군구_코드정보_v1.0.xlsx`.

## 5. Implementation Sequence

### Step 0 — Prerequisites

- [ ] Activate API keys for each new service on data.go.kr
- [ ] Build canonical area-code code-book from official xlsx
- [ ] Add Zod contracts for each new API response shape
- [ ] Extend provider registry to accept multiple service endpoints

### Step 1 — P2A-1: Barrier-free tourism ingestion

- [ ] `BarrierFreeProvider` adapter with `detailWithTour2` call
- [ ] `place_accessibility` schema migration (v4)
- [ ] Sync script: enrich existing 9,449 fetched places with accessibility data
- [ ] UI: expandable accessibility section on place detail

### Step 2 — P2A-2: GoCamping integration

- [ ] `CampingProvider` adapter with `basedList` + `locationBasedList`
- [ ] `place_camping` schema migration (v5)
- [ ] Sync script: ingest camping places, filter by `animalCmgCl = "가능"`
- [ ] UI: camping category in filter and result cards

### Step 3 — P2A-3: Congestion forecast

- [ ] `CongestionProvider` adapter with `tatsCnctrRatedList`
- [ ] `place_congestion` schema migration (v6)
- [ ] Daily cron: fetch 30-day forecast for each place's region
- [ ] UI: congestion badge on cards and detail

### Step 4 — P2B-1: Festivals and general tourism

- [ ] `GeneralTourismProvider` with `searchFestival2` + `locationBasedList2`
- [ ] `festivals` schema migration (v7)
- [ ] UI: "이번 주 축제" section

### Step 5 — P2B/P2C: Related sites, trails, photos

- [ ] Related-sites lookup via `TarRlteTarService1`
- [ ] Trail ingestion from `Durunubi`
- [ ] Photo enrichment from `PhotoGalleryService1`

### Step 6 — P2D: Multilingual

- [ ] English translation sync via `EngService2`
- [ ] Chinese translation sync via `ChtService2`
- [ ] UI: language toggle (Korean pet-policy fields remain untranslated)

### Step 7 — P2E-1: Route-based CCTV

- [ ] `CctvProvider` adapter (MOLIT primary, UTIC supplementary) with Zod contracts
- [ ] `traffic_cctv` schema migration (v8)
- [ ] Sync script: ingest CCTV catalog (coordinates, route names, direction)
- [ ] Server proxy: `app/api/cctv/stream/[id]` route handler resolving stream URLs with server-only credentials
- [ ] Route corridor matching: resolve cameras along a course polyline, ordered by travel sequence
- [ ] UI: camera list panel within course result + CCTV stream view

### Step 8 — P2E-2: AI vehicle detection

- [ ] Port `vehicleDetector.ts` / `yoloDetector.ts` from traffic-analysis fork (framework-agnostic TS)
- [ ] Install `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd` as dev dependencies (lazy-loaded)
- [ ] React component: `<video>` + `<canvas>` overlay + detection loop
- [ ] ROI filter UI: lane direction selector
- [ ] "AI 추정" labeling on all count displays
- [ ] Unit tests: ROI filtering, count classification, labeling contract with static test frame

### Step 9 — P2E-3: Real-time traffic context

- [ ] `TrafficProvider` adapter: congestion, speed, weather, closure (4 sub-providers, each with Zod)
- [ ] `traffic_conditions` schema migration (v9)
- [ ] On-demand fetch per course request (no persistence beyond response lifecycle)
- [ ] UI: traffic context strip on course result
- [ ] Graceful degradation: missing data produces no strip

## 6. Data Freshness Strategy

| Source | Update cycle | Cache TTL | Ingestion trigger |
|---|---|---|---|
| Barrier-free (`detailWithTour2`) | Daily | 24h | Per-place detail enrichment |
| GoCamping (`basedList`) | Daily | 24h | Full catalog refresh |
| Congestion forecast | Daily | 24h | Scheduled daily job |
| Visitor volume | Daily | 24h | Scheduled daily job |
| General tourism | Daily | 24h | On-demand or scheduled |
| Related sites | Monthly (8th) | 30d | Monthly job |
| Regional analytics | Monthly (16th) | 30d | Monthly job |
| Trails | Daily | 24h | Full catalog refresh |
| Photos | Daily | 24h | On-demand per place |
| Multilingual | Daily | 24h | Per-place on-demand |
| CCTV catalog | Daily/weekly | 24h | Scheduled catalog refresh |
| CCTV stream URLs | On demand | Session-only | Per user request; not persisted |
| Traffic conditions | Real-time | No cross-session cache | Per course request |
| Road weather | Real-time (10-min) | Response lifecycle | Per course request |
| Road closures | Real-time | Response lifecycle | Per course request |

## 7. Quota Budget

All services share the same development-key structure with 1,000 requests/day each. The existing Pet Tour sync uses 910 requests/day. Phase 2 sources are additive:

| Source | Estimated daily requests | Notes |
|---|---|---|
| Barrier-free | ~900 | Enrich 9,449 places over ~11 days, then incremental |
| GoCamping | ~50 | Total catalog is small (~3,000 sites) |
| Congestion forecast | ~200 | 30-day forecast per region, not per place |
| General tourism | varies | Festival search, nearby lookup |
| Visitor volume | ~50 | Regional, not per-place |
| Total additional | ~1,200/day spread across separate quotas | No impact on existing Pet Tour quota |

Phase 2E traffic sources use separate government agency quotas, not the KTO 1,000/day budget:

| Phase 2E source | Estimated daily requests | Notes |
|---|---|---|
| CCTV catalog sync | ~100 | Full catalog refresh; small dataset |
| CCTV stream URL resolution | On demand | One request per user camera open; session-scoped |
| Congestion + speed | ~50 | Per course request; not cached |
| Road weather (KMA) | ~50 | 10,000/day quota; per course request |
| Road closures | ~20 | Per course request |
| AI vehicle detection | 0 | Client-side only; no server requests |

## 8. Manual Errata (verified from v4.x manuals)

| Source | Manual text | Actual endpoint |
|---|---|---|
| Congestion forecast | `TatsCnctrRatedService/tatsCnctrRateList` | `TatsCnctrRateService/tatsCnctrRatedList` (Service: no d; List: +d) |
| Regional diversity op#3 | Call Back URL shown as `areaTouDivList` | Actual: `areaIntlDivList` |
| Regional diversity op#3 table | Name shown as service ID `areaTarDivService` | Actual operation: `areaIntlDivList` |
| Demand intensity table | Service name copied from diversity manual | Ignore; operations are correct |
| Odii | URL contains `Odlii` in some sections | Actual service ID: `Odii` |

All endpoints must be verified with a live smoke call before the provider adapter is considered stable.
