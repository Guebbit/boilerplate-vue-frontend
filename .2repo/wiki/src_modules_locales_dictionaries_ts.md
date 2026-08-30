# src/modules/locales/dictionaries.ts

## Purpose

Pure conversion utilities between the API's flat dotted-key row format (`products.list.title`) and the nested object shape that vue-i18n consumes. Exists so the round-trip logic lives in one testable, side-effect-free module rather than being scattered across components and stores.

## Key elements

- **`flattenDictionary(dictionary, prefix?)`** — Recursively walks a nested dictionary (or array) and emits one `{ key, value }` pair per leaf string. Arrays produce numeric path segments (`list.0`, `list.1`).
- **`expandEntries(entries)`** — Inverse of `flattenDictionary`. Rebuilds a nested object from flat rows; deeper keys win on collision (shallow leaf is dropped).
- **`foldNumericNodes(node)`** *(private)* — Post-processing pass over the expanded tree: any object whose keys are all-numeric (`/^\d+$/`) is sorted numerically and converted to an array, so `list.0`/`list.1` round-trips to `['a','b']` rather than `{ '0':'a', '1':'b' }`.

## Relationships

- **`src/modules/locales/components/EntriesImportDialog.vue`** — Calls `flattenDictionary` to convert the nested JSON a translator pastes into the flat row shape the entries API expects before submission.
- **`src/modules/locales/store.ts`** — Calls `expandEntries` to turn paged API rows back into the nested dictionary the rest of the app renders.

## Notes

- Both exported functions are pure (no I/O, no state), making them unit-testable in isolation.
- `expandEntries` silently drops a shallow leaf when a deeper key already occupies that path (e.g. `products.list` string alongside `products.list.title`). The server is expected to reject such collisions at write time; the client just avoids a crash.
- `foldNumericNodes` is intentionally non-exported — it is an implementation detail of `expandEntries` and not a public API.
- The type `TranslationDictionaries` is imported from `@/infrastructure/i18n`; it is the canonical nested-dictionary type used throughout the app.
