---
source: tests/unit/infrastructure/utils/sort.spec.ts
sha256: 4e332ec3abfdbbd86b74d9c020e06bc78d769c93e0605f564feab596aa6085cb
signature: e9e17992198e65eae8e43fa81e092b2b6e62c7d01b5c8d91509d893392c09d65
generated_at: 2026-11-10T08:07:29.743540+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/sort.spec.ts

## Purpose
Unit tests for the `@/infrastructure/utils/sort.ts` module, covering the client-side sort grammar: parsing CSV sort strings from URLs, converting to/from Vuetify's `{ key, order }[]` table format, generating sort tokens, and validating tokens against a contract-defined allow-list. The counterpart server contract lives in `docs/api/sorting.md`.

## Key elements
- **`firstSortOf`** — Parses a CSV string (e.g. `"-price,title"`) into a single `{ key, descending }` object; returns `undefined` for empty/blank/invalid input.
- **`sortToken`** — Serializes a `{ key, descending }` object back into a token string (`"price"` or `"-price"`).
- **`sortByFromCsv`** — Converts a CSV string into a Vuetify table sort array (`[{ key, order: 'asc'|'desc' }]`); empty input yields `[]`.
- **`csvFromSortBy`** — Inverse of `sortByFromCsv`; returns the CSV string or `undefined` for an empty list. Explicitly rejects boolean or missing `order` values.
- **`sortTokensOf`** — Validates every token in a CSV against a supplied allow-list table; returns the token array or `undefined` if *any* token is unknown (fail-closed).
- **`sortFieldsOf`** — Derives the deduplicated list of field names (without the `"-"` twin) from a token table.

## Relationships
No external graph neighbors are recorded for this file.

## Notes
- The allow-list table used in tests is an `as const` object (`allowed`) mapping arbitrary keys to wire values; `sortTokensOf` validates against the *values*, not the keys.
- `csvFromSortBy` is deliberately strict: a Vuetify `order` of `true`/`false` (boolean) or a missing `order` both produce `undefined` rather than guessing a direction.
- `sortTokensOf` is fail-closed by design — one unknown token discards the entire sort rather than sending a partial list the API would reject.
- The test file uses `it.each` for table-driven cases in `firstSortOf`; all other suites use single assertions.
