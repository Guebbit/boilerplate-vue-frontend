---
source: src/infrastructure/utils/sort.ts
sha256: 1c8432ba88a2225f8882bdb1ffb504c1841fe61c0476ecb3e8256581f05fe3de
signature: 97d434bd46659e14692f1e023238a506099ea2053052807d4015d63b1a3ef74c
generated_at: 2026-11-10T03:13:43.346707+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/sort.ts

## Purpose

Pure conversion utilities for the project's sort grammar. Translates between three representations — the JSON:API wire format (`-price,title`), a `SingleSort` object, and Vuetify's `v-data-table` sort model — so every list page shares one consistent reading of sort state without duplicating parsing logic.

## Key elements

- **`SortByModel`** (type) — Array shape Vuetify's `sort-by` model produces (`{ key, order }[]`).
- **`SingleSort`** (interface) — The canonical single-field sort: `{ key, descending }`. One per UI interaction (a header click replaces rather than stacks).
- **`firstSortOf(csv)`** — Parses the first token of a sort CSV into `SingleSort | undefined`. Treats a bare `-` as absent.
- **`sortToken(sort)`** — Inverse: `SingleSort` → wire token string (`price` or `-price`).
- **`sortByFromCsv(csv)`** — CSV → one-entry `SortByModel` (or `[]`).
- **`csvFromSortBy(sortBy)`** — `SortByModel` → CSV string (or `undefined`). Only honours `'asc'`/`'desc'`; absent/boolean `order` means "cleared".
- **`sortTokensOf(csv, allowed)`** — Validates every token in a hand-edited URL against a contract enum object; returns the typed token list or `undefined` if any token is invalid (avoids a 422 round-trip).
- **`sortFieldsOf(allowed)`** — Derives bare field names (strips leading `-`, dedupes) from the contract's sort enum for populating UI select options.

## Relationships

No graph neighbors are recorded for this file. It is a leaf utility consumed by list-page components and request builders.

## Notes

- `firstSortOf` intentionally reads only the **first** CSV token even though the server accepts up to three; the UI drives one sort at a time.
- `csvFromSortBy` treats Vuetify's ambiguous `order` values (`true`, `false`, `undefined`) as "no sort" — only the string literals `'asc'`/`'desc'` produce a token.
- `sortTokensOf` is strict: if **any** token is outside the allowed set, the whole CSV is rejected (returns `undefined`), not partially accepted.
- `sortFieldsOf` deduplicates via `Set` because the contract enum lists each field twice (ascending and `-field` descending).
