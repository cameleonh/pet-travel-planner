# Phase 2 Upgrade Roadmap — Multi-Source Data Integration

**Status:** Design in progress
**Last updated:** 2026-08-05
**Source documents:** [PRD.md](../../PRD.md) §18, [DATA_SPEC.md](../data/DATA_SPEC.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md)

## 1. Objective

Transform 같이갈개 from a single-source pet-policy lookup into a multi-dimensional travel planning surface. The MVP answers "can I bring my pet here?" Phase 2 adds "should I go, and when?"

The upgrade leverages 12 Korea Tourism Organization OpenAPI services analyzed from the official v4.x manuals distributed in the 2026 competition OT materials.

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

## 8. Manual Errata (verified from v4.x manuals)

| Source | Manual text | Actual endpoint |
|---|---|---|
| Congestion forecast | `TatsCnctrRatedService/tatsCnctrRateList` | `TatsCnctrRateService/tatsCnctrRatedList` (Service: no d; List: +d) |
| Regional diversity op#3 | Call Back URL shown as `areaTouDivList` | Actual: `areaIntlDivList` |
| Regional diversity op#3 table | Name shown as service ID `areaTarDivService` | Actual operation: `areaIntlDivList` |
| Demand intensity table | Service name copied from diversity manual | Ignore; operations are correct |
| Odii | URL contains `Odlii` in some sections | Actual service ID: `Odii` |

All endpoints must be verified with a live smoke call before the provider adapter is considered stable.
