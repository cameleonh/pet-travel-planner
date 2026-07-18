# Live API Integration Plan

**Objective:** Replace the placeholder provider endpoint with the sanctioned Korea Tourism Organization Pet Travel Service v2 contract and verify it with the issued key without persisting secrets or raw credential-bearing requests.

## Acceptance criteria

- `areaBasedList2` supplies stable place identity, category, address, and coordinates.
- `detailPetTour2` supplies raw pet-policy evidence for each list item.
- A failed detail request isolates one record instead of failing the list.
- Decoding-key handling is pinned without double encoding or credential logging.
- Shopping records remain shopping records in the internal contract and UI.
- Official all-breeds wording maps conservatively to all dog-size conditions; area access is not inferred as indoor or outdoor access.
- Focused tests, full static/unit checks, live API smoke, coverage, and deterministic production build pass.

## Security boundary

- The credential remains in ignored `.env.local` and is used only by server-side code.
- Errors never include the request URL or key.
- The official gateway's working HTTP endpoint creates an unencrypted-transit residual risk; live mode stays server-only and fixture mode remains the deterministic default.
