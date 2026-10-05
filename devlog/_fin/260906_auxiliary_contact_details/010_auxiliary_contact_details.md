# Auxiliary Contact Details (Phone · Hours · Fee) + Nearby i18n

## Background

Owner review of the 2026-09-04 Gyeonggi import: "well made, but something is
missing." Diagnosis — the portal rows carry contact details we dropped because
`auxiliaryPlaceSchema` had nowhere to put them: `rprs_telno_info` (953/961
hospitals, 99%), operating hours (799), closing day (745), park usage fee, and
per-building detail addresses. The nearby catalog also hard-coded Korean
category labels in an otherwise ko/en/zh app.

## Diff-Level File Map

### MODIFY `src/data/contracts.ts`

- `auxiliaryPlaceSchema` gains optional `phone`, `weekdayHours`,
  `saturdayHours`, `sundayHours`, `closingDay`, `usageFee`.

### MODIFY `src/data/database/schema.ts`

- Migration **v11 `auxiliary_place_contact_details`**: six nullable ALTER
  COLUMNs on `auxiliary_places`; down drops them in reverse.

### MODIFY `src/data/database/repository.ts`

- `AuxiliaryRow` + latest-snapshot SELECT + gg-pet insert carry the six
  columns; loader emits them only when non-null (contract stays optional).

### MODIFY `src/data/providers/gg-pet-provider.ts`

- Vet schema: `rprs_telno_info`, `opr_hr_info`, `sat_opr_hr`, `sun_opr_hr`,
  `restday_info`, `detail_addr`; park schema: `utlz_chrg`.
- `toPhone()` takes the first of multiple numbers and rejects non-numeric
  strings ("운영기관 문의" → undefined); detail address appended as `(…)`.

### MODIFY `src/features/nearby/NearbyCatalog.tsx`

- Category labels via `dict` (ko/en/zh) instead of a hard-coded Korean map.
- Contact line under each card: `tel:` link for phone, weekday/Sat/Sun hours,
  closing day, park fee — rendered only when present.

### MODIFY `src/i18n/dictionary.ts`, `src/app/globals.css`

- 12 new keys ×3 languages (`auxCat*`, `nearbyWeekday/Saturday/Sunday`,
  `nearbyClosedOn`, `nearbyFee`, `nearbyCall`); `.nearby-contact` styles.

### MODIFY `src/data/database/database.test.ts`

- Migration-version expectations updated to include v11.

## Check Evidence (2026-09-06)

- vitest **313/313** (5 new provider tests incl. multi-phone-first,
  invalid-phone rejection, hours mapping, detail address, park fee)
- tsc clean, eslint --max-warnings=0 on all touched files
- Local resync: 993 rows; **phone 980/993, hours 799, fee 1** (only one park
  publishes a fee string); random spot checks match raw JSON verbatim
  (e.g. 고병기동물병원 031-236-7582, 09:00~20:00, 휴무 일요일)

## Ops Notes

- Server rollout: migration v11 auto-applies at next service start after
  deploy; then re-run `sync-gg-pet-facilities.ts` (shared-자료 paths) and
  restart — same procedure as the initial rollout.
- Cosmetic: detail address may nest parentheses when the road address already
  has a `(동, 건물명)` tail — accepted for v1.
