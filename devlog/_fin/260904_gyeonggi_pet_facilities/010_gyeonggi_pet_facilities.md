# Gyeonggi Pet-Facility Auxiliary Data (Parks + Animal Hospitals)

## Background

While crawling the entire 경기 데이터드림 (data.gg.go.kr) open-data catalog
(2,112 datasets, 2026-09-04), four pet-facility datasets were identified and
downloaded through the portal's sheet-download endpoint (JSON format,
use-purpose code U02/research):

| Dataset | Rows | Notes |
|---|---|---|
| 반려동물 놀이시설 구비 공원 (dog-play parks) | 32 | WGS84 coordinates, operator, hours |
| 반려동물 의료 및 복지시설 (medical/welfare) | 3,149 | 동물병원 961 · 동물약국 2,177 · 동물장묘업 11 |
| 반려동물 생활편의 시설 (daily-life) | 3,279 | 동물미용업 2,124 · 동물위탁관리업 1,155 |
| 애완동물 배변봉투함 (waste-bag dispensers) | 265 | address only, no coordinates |

## Design Decisions

1. **Target table: `auxiliary_places`.** The app already ships an end-to-end
   auxiliary pipeline (schema → `loadLatestSnapshot` → `NearbyCatalog` in the
   search experience) but it had never been fed data (0 rows). The categories
   `park` and `veterinary` map cleanly onto the two highest-value sets.
2. **Excluded from v1:**
   - 동물약국 (pharmacies, 2,177) — `NearbyCatalog` renders the
     `veterinary` category with a hard-coded "동물병원" label; surfacing
     pharmacies under that label would mislead users.
   - 미용/위탁관리 (grooming 2,124 / boarding 1,155) — no matching
     auxiliary category. Phase-2 candidates for the `places` table
     (`shopping` / `accommodation`) with the portal data as official policy
     evidence.
   - 배변봉투함 (265) — no coordinates; would need geocoding first.
3. **Evidence chain**: every row carries `evidence` pointing at the exact
   dataset page URL on data.gg.go.kr, with the portal's per-row
   `dat_crtr_ymd` (fallback: portal last-modified 2022-12-29) as
   `observedAt`. `petStatus` is `confirmed` — these are government-registered
   pet facilities, not third-party guesses.
4. **Stable IDs**: `gg-pet:park-<sha256(name|address)[:10]>` /
   `gg-pet:vet-…` — deterministic across re-runs, deduplicated within a load.

## Diff-Level File Map

### NEW `자료/경기도_반려동물놀이시설공원_20260904.json`

- Vendored raw portal export (32 rows) as downloaded.

### NEW `자료/경기도_반려동물의료복지시설_20260904.json`

- Vendored raw portal export (3,149 rows; provider filters to 동물병원).

### NEW `자료/경기도_반려동물생활편의시설_20260904.json`

- Vendored raw portal export (3,279 rows) — reserved for the phase-2
  grooming/boarding import; not consumed by v1.

### NEW `src/data/providers/gg-pet-provider.ts`

- Zod schemas for the two portal record shapes + `extractPortalRows`
  (recursive row locator for the portal JSON envelope).
- `mapGyeonggiRows()` pure transform: park/vet mapping, label/url/observedAt
  evidence, deterministic hashed ids, duplicate and invalid-row accounting.
- Empty coordinate strings parse to `NaN` (not `Number("") === 0`) — a test
  caught that blank rows would otherwise pin to (0, 0) in the Gulf of Guinea.
- `GyeonggiPetFacilityProvider.loadFromJsonFiles()` IO wrapper.

### NEW `src/data/providers/gg-pet-provider.test.ts`

- Five tests: park mapping + contract validation, vet mapping with
  `dat_crtr_ymd → ISO observedAt`, non-hospital exclusion, invalid/duplicate
  accounting, id stability.

### NEW `scripts/sync-gg-pet-facilities.ts`

- Follows the `sync-villages.ts` pattern: load vendored JSON → attach to the
  latest successful snapshot → report JSON stats.
- Run with `npx tsx --env-file=.env.local scripts/sync-gg-pet-facilities.ts`.

### MODIFY `src/data/database/repository.ts`

- Additive `latestSuccessfulSnapshotId()` (same latest-success join as
  `loadLatestSnapshot`, id only).
- Additive `replaceGyeonggiAuxiliary(snapshotId, places)` — transactional
  delete+insert scoped to `place_id LIKE 'gg-pet:%'`, so other auxiliary
  sources (if any appear) are never touched.

## Operational Notes (must carry forward)

1. **Snapshot coupling**: rows are attached to the *current* latest snapshot.
   Every future `sync-tour-db` re-run publishes a new snapshot without these
   rows — re-run `sync-gg-pet-facilities.ts` afterwards. (Documented on both
   the method and the script.)
2. **Raw data is intentionally untracked**: `자료/` is gitignored by project
   convention (same as the villages/farmstay raw files). For a server-side
   sync, copy the three `경기도_반려동물*_20260904.json` files into the
   server's `자료/` directory (or re-download from the portal URLs recorded
   in the provenance section) before running the script.
3. **Production rollout**: run the script once on the server against the
   production DB so its latest snapshot gets the 993 rows.
4. **Surface**: rows appear in the search "nearby" catalog once a user picks
   an anchor place. Category labels are currently Korean-only hard-coded
   (`공원` / `동물병원`) — pre-existing behavior, unchanged here.

## Provenance

- Catalog crawl + downloader tooling live outside the repo (home-dir
  `_gg_*` scripts); this devlog records the in-repo result only.
- Raw exports live untracked under `자료/` (gitignored by convention);
  the dataset pages are:
  parks `infId=ZOHUVMLWBLPU4VFVI2QA32311465&infSeq=3`,
  medical `infId=69D0HTUDZL4743JTTWMM32308298&infSeq=3`,
  daily-life `infId=UX2OPRPXURITBZQ3L7W732294628&infSeq=3`
  on https://data.gg.go.kr (공공누리, source attribution required).
