# Check: Gyeonggi Pet-Facility Auxiliary Data (2026-09-04)

## Automated

| Check | Result |
|---|---|
| `vitest run src/data/providers/gg-pet-provider.test.ts` | 5/5 passed |
| `vitest run` (full suite) | **35 files, 309/309 passed** (5 new tests included; no regression) |
| `tsc --noEmit` | clean |
| `eslint <new files> --max-warnings=0` | clean |

## Sync Output (local DB)

```json
{"ok":true,"snapshotId":14,"saved":993,"stats":{"parkRaw":32,"vetRaw":3149,
 "parkSaved":32,"vetSaved":961,"skippedInvalid":0,"skippedNonVet":2188,
 "duplicates":0},"auxiliaryTotal":993}
```

- `skippedNonVet: 2188` = 동물약국 2,177 + 동물장묘업 11 (by design).
- `auxiliary_places` before: 0 rows → after: park 32 + veterinary 961.

## Spot Checks (SQL)

- `수진동 탄천 반려견 놀이공간` (성남 수정구, 37.4369/127.1197) — coordinates match the portal row.
- 김포한강 new-town area vets present: 김포씨엘동물의료센터 (운양동),
  이리온·라움·스타동물병원 (장기동), 제일종합동물병원 (양촌읍).

## Known Limitations / Follow-ups

- Rows are snapshot-coupled: re-run the script after any tour-api re-sync.
- Production needs one script run at deploy time (server DB is separate).
- Phase-2 candidates not yet imported: grooming/boarding (3,279 rows, needs
  `places`-table mapping), waste-bag dispensers (265 rows, no coordinates).
- `NearbyCatalog` category labels remain Korean-only (pre-existing).
