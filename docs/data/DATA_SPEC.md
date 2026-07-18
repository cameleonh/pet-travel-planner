# Data Specification

**Owner:** Data ingestion and policy normalization  
**Status:** Product contract; MVP list and pet-detail field mapping validated against an issued-key response  
**Last updated:** 2026-07-17

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

## 3. Evidence Classes

| Class | Meaning | Can satisfy a hard constraint? |
|---|---|---|
| `SOURCE_EXPLICIT` | Official source text directly states the condition | Yes, unless contradicted or stale policy requires confirmation |
| `RULE_DERIVED` | A deterministic rule maps explicit source wording to a normalized value | Yes when confidence threshold passes and source span is retained |
| `MODEL_SUGGESTED` | A model proposes an interpretation for review | No; must be confirmed by a rule or human label |
| `USER_REPORTED` | A user submits a policy observation | No in MVP; future corroborating evidence only |
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

## 14. Data Boundaries

- Do not store API keys in client code or committed files.
- Do not collect precise location until the user requests nearby search.
- Do not log raw user location beyond the precision needed for the active query.
- Preserve image-license metadata and follow source usage restrictions.
- Keep official text, derived interpretation, and user reports in separate fields.

## 15. Implemented Domain Binding

The current TypeScript binding is authoritative for executable semantics:

- `src/data/contracts.ts` parses provider snapshots and source evidence at the ingress boundary.
- `src/domain/types.ts` defines `true | false | unknown`, evidence, constraints, proof, failures, and relaxation proposals.
- `src/domain/normalize.ts` applies conservative deterministic Korean phrase rules. Missing or ambiguous text remains `unknown`.
- `src/domain/match.ts` requires every selected condition to be `true` with non-null evidence; an empty constraint set is not an exact match.
- `src/domain/relax.ts` enumerates the smallest removable ordinary-preference set and excludes hard or safety/legal/access/admission constraints.
- `GET /api/places?hard=outdoor,leash&preferences=carrier&page=1` exposes complete-snapshot counts, safe relaxation metadata, and at most 50 proof-bearing result objects using the same functions. The legacy `conditions` parameter remains a hard-condition alias.

The checked-in product fixture remains sanitized deterministic development data, not current venue truth. Separately, official-shaped provider contract tests pin the sanctioned issued-key field mapping without committing the credential or raw response. The runtime SQLite store archives the validated logical `ProviderSnapshot` and its relational projection; complete raw per-operation HTTP envelope archival remains future scope and is not claimed by the MVP.
