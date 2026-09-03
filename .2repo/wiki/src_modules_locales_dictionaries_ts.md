# src/modules/locales/dictionaries.ts

## Purpose

Pure conversion between the API's flat dotted-key rows (one `{ key, value }` per entry) and the nested object shape vue-i18n consumes. Exists as a standalone module so the two directional transforms can be unit-tested without a browser or store.

## Key elements

- **`flattenDictionary`** (exported) — Recursively walks a nested dictionary (including arrays) and emits one `{ key, value }` pair per leaf string, joined by dots. Arrays produce numeric segments (`list.0`, `list.1`).
- **`expandEntries`** (exported) — Inverse of `flattenDictionary`. Rebuilds a nested object from flat rows, then calls `foldNumericNodes` to turn all-numeric-keyed objects back into arrays.
- **`setLeaf`** (internal) — Writes a leaf string onto a node; silently skips if the slot already holds an object (i.e. a deeper key was processed first).
- **`foldNumericNodes`** (internal) — Recursively replaces any object whose keys are all integers with a sorted array of its values.

## Relationships

- **`EntriesImportDialog.vue`** — Calls `flattenDictionary` to convert the nested JSON a translator pastes into flat rows before submitting them to the entries API.
- **`store.ts`** — Calls `expandEntries` to rebuild the nested dictionary from paged API rows for client-side rendering.

## Notes

- **Collision policy:** if a shallow key (`products.list`) and a deep key (`products.list.title`) both appear in the input rows, the deeper key wins and the shallow string is dropped. No error is thrown — the server is expected to reject such pairs at write time.
- **Array round-trip:** arrays are encoded as numeric-segment keys. `foldNumericNodes` is the only place that decides an object "is really an array" (all keys match `/^\d+$/`). Mixed numeric/non-numeric keys stay as objects.
- **Immutability:** both exports are pure (no mutation of input, no side effects). `expandEntries` builds a fresh tree each call.
- **`toSorted`** (ES 2023) is used in `foldNumericNodes` rather than `sort` to avoid mutating the keys array.
