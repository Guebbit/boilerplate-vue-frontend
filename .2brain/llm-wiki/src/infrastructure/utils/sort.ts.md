---
source: src/infrastructure/utils/sort.ts
sha256: 1c8432ba88a2225f8882bdb1ffb504c1841fe61c0476ecb3e8256581f05fe3de
generated_at: 2026-10-02T12:05:40.002926+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/sort.ts

## Purpose

Pure conversion utilities that translate a sort specification between three representations: the JSON:API wire format (`-price,title`), the CSV shape a URL or filter box holds, and Vuetify's `{ key, order }[]` model a table header edits. Every list page imports from here so there is a single, shared reading of the sort grammar.

## Key elements

- **`SortByModel`** (type) — Vuetify `v-data-table`'s `sort-by` shape: `{ key: string; order?: boolean | 'asc' | 'desc' }[]`.
- **`SingleSort`** (interface) — one field + direction (`{ key, descending }`). The UI drives exactly one; the server accepts up to three.
- **`firstSortOf(csv)`** — Parses the first comma-separated token of a sort CSV into a `SingleSort`, or `undefined` when empty/absent.
- **`sortToken(sort)`** — Serializes a `SingleSort` back to its wire token (`price` or `-price`).
- **`sortByFromCsv(csv)`** — CSV → one-entry `SortByModel` (or `[]`).
- **`csvFromSortBy(sortBy)`** — `SortByModel` → wire token string (or `undefined` when cleared). Only the first entry is inspected.
- **`sortTokensOf(csv, allowed)`** (generic) — Validates every token in a sort CSV against a contract enum object (e.g. `ProductSortItem`). Returns the typed list of tokens, or `undefined` if any token is invalid (all-or-nothing).
- **`sortFieldsOf(allowed)`** — Extracts deduplicated bare field names (strips the `-` prefix) from a contract enum's values.

## Relationships

No graph neighbors. This module is a leaf: it imports nothing from the project and is consumed by list-page components and query-building code that need to read/write sort state.

## Notes

- The UI intentionally supports **only one sort** at a time; a header click replaces the sort rather than stacking on it, even though the server grammar allows up to three comma-separated tokens.
- `csvFromSortBy` treats Vuetify's `order` value of `true`, `false`, or `undefined` as "unsorted" — only the literal strings `'asc'` and `'desc'` produce a direction.
- `sortTokensOf` is all-or-nothing: if even one token is not in the `allowed` set, the entire result is `undefined`, preventing a hand-edited URL from reaching the API and receiving a 422.
- The `allowed` parameter is expected to be a **generated enum object** (e.g. `ProductSortItem`) whose *values* are the valid wire tokens (including both `price` and `-price` forms). The function checks membership against `Object.values(allowed)`.
