---
source: src/modules/locales/dictionaries.ts
sha256: 4d72e9fae0e4ca9f5c0a92ab5f4685194bcd91a021e67054228dde82e28a1eb2
signature: f8047f4d264c6e644cc0613cdcb0cd3bcaeb736abf8b1248523a00a344645e52
generated_at: 2026-11-10T04:40:17.355570+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/dictionaries.ts

## Purpose

Pure, side-effect-free conversion functions between the two shapes a dictionary takes in this app: the **flat dotted-key rows** the entries API stores (e.g. `products.list.title`) and the **nested object** vue-i18n and bundled JSON files use. Both directions live here so the translation logic is testable without a browser.

## Key elements

- **`DictionaryRow`** — `{ key: string; value: string }`; the unit the API persists.
- **`flattenDictionary(dictionary, prefix?)`** — Walks a nested dictionary (or array) and returns one `DictionaryRow` per leaf string. Non-string leaves (null, number, boolean) are skipped. Arrays become numeric segments (`list.0`, `list.1`).
- **`findDuplicateKey(keys)`** — Returns the first key that appears twice in the array, or `undefined`. Used to surface collisions before they hit the API.
- **`expandEntries(entries)`** — Inverse of `flattenDictionary`. Builds a nested `TranslationDictionaries` object from flat rows, then calls `foldNumericNodes` to collapse numeric-keyed objects back into arrays. On key collision (e.g. `a` is a string *and* `a.b` exists), the deeper key wins and the shallower string is silently dropped.
- **`setLeaf`** (module-private) — Writes a leaf value into a node without overwriting an existing subtree.
- **`foldNumericNodes`** (module-private) — Recursively replaces objects whose keys are all numeric (`/^\d+$/`) with arrays, sorting keys numerically.

## Relationships

- **`src/modules/locales/components/EntriesImportDialog.vue`** — Flattens a pasted/bundled nested JSON via `flattenDictionary` before submitting rows to the API.
- **`src/modules/locales/views/LocaleEntries.vue`** — Reconstructs the nested shape from API rows via `expandEntries` for export/display.
- **`src/modules/locales/store.ts`** — Orchestrates import/export flows; calls `findDuplicateKey` to validate batches before persisting.
- **`src/modules/locales/tests/dictionaries.spec.ts`** — Unit-tests every public export (flatten, expand, duplicate detection, array round-trip, collision handling) without a DOM.
- **`tests/cross-cutting/module-map.spec.ts`** — Asserts this file's public API surface matches the module map's declared exports.

## Notes

- All functions are pure; no imports beyond the `TranslationDictionaries` type from `@/i18n`. No side effects, no async work.
- `flattenDictionary` accepts `Record<string, unknown> | unknown[]` — it will happily start from a top-level array.
- `expandEntries` does **not** throw on key collisions; the server is expected to reject them at write time. The client simply drops the ambiguous shallower row.
- Numeric-array folding is all-or-nothing per node: a single non-numeric key in an otherwise-numeric object keeps it as a plain object.
- `findDuplicateKey` expects keys already trimmed the same way the API trims them; it does no normalisation itself.
