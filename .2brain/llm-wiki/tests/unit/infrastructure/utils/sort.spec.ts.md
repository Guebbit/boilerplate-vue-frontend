---
source: tests/unit/infrastructure/utils/sort.spec.ts
sha256: 4e332ec3abfdbbd86b74d9c020e06bc78d769c93e0605f564feab596aa6085cb
generated_at: 2026-10-17T02:39:50.296642+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/sort.spec.ts

## Purpose

Unit tests (Vitest) for the client-side sorting utilities in `@/infrastructure/utils/sort.ts`. Covers the round-trip conversions between three representations of a sort order: a CSV string carried in the URL, Vuetify's `{ key, order }[]` table model, and the contract's validated token list.

## Key elements

- **`firstSortOf` tests** — parses a CSV string (e.g. `"-price,title"`) into a single `{ key, descending }` object; expects `undefined` for blank, `undefined`, `"-"`, or `",price"` inputs.
- **`sortToken` tests** — serialises `{ key, descending }` back to a token (`"price"` / `"-price"`).
- **`sortByFromCsv` tests** — maps a single CSV token to one Vuetify entry (`{ key, order: 'desc' | 'asc' }`); returns `[]` for `undefined`.
- **`csvFromSortBy` tests** — inverse of the above; returns `undefined` for an empty array or when `order` is a non-string (boolean / missing).
- **`sortTokensOf` tests** — validates every token in the CSV against an `allowed` table; returns the full token array only if *all* tokens are recognised, otherwise `undefined` (all-or-nothing semantics).
- **`sortFieldsOf` tests** — derives the deduplicated list of field names from the allowed table (strips the `-` twin).

## Relationships

No dependency-graph neighbours are recorded for this file.

## Notes

- The `allowed` constant at the top of the file is a local stand-in for the server's sort-field contract (`{ a: 'price', b: '-price', c: 'title', d: '-title' }`). Tests that exercise `sortTokensOf` / `sortFieldsOf` rely on it; keep it in sync if the real contract changes.
- `csvFromSortBy` is tested to reject a boolean `order` value (`true`) and a missing `order` — this guards against Vuetify emitting non-string `order` in edge cases.
- `sortTokensOf` uses **all-or-nothing** validation: a single unknown token discards the entire sort rather than filtering. Tests explicitly assert this to prevent a regression to partial-token output.
- The file's top-level doc comment points to `docs/api/sorting.md` as the server-side half of the same grammar.
