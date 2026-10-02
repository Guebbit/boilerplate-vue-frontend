---
source: src/modules/locales/dictionaries.ts
sha256: 1a3923333ec5c96fd81b3d7c9c454ea17a97faf9b5c7aab8e9e99bb8340d3c09
generated_at: 2026-10-02T15:13:51.207393+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/dictionaries.ts

## Purpose

Pure conversion functions that translate between the two shapes a dictionary travels in: the flat dotted-key rows the entries API persists, and the nested object/array structure vue-i18n consumes. The file is side-effect-free by design so the round-trip logic can be unit-tested without a browser.

## Key elements

- **`flattenDictionary(dictionary, prefix?)`** (exported) — Walks a nested dictionary and emits one `{ key, value }` per leaf string, joining segments with `.`. Arrays flatten to numeric segments (`list.0`, `list.1`).
- **`expandEntries(entries)`** (exported) — Inverse of `flattenDictionary`. Builds a nested object from flat rows, then post-processes to fold numeric-keyed nodes back into arrays.
- **`setLeaf(node, segment, value)`** (internal) — Writes a leaf string onto a node; intentionally does **not** overwrite a value that is already an object (subtree), so a deeper key wins over a shallower one in a collision.
- **`foldNumericNodes(node)`** (internal) — Recursively converts any object whose keys are *all* integer strings into a JavaScript array (sorted numerically).

## Relationships

- **`src/modules/locales/components/EntriesImportDialog.vue`** — Calls `flattenDictionary` to convert the nested JSON a translator pastes/uploads into the flat `{ key, value }[]` rows sent to the entries API.
- **`src/modules/locales/store.ts`** — Calls `expandEntries` to rebuild the nested dictionary shape from API-paginated rows before handing it to vue-i18n.

## Notes

- **Array round-trip:** `{ list: ['a','b'] }` → rows `list.0`/`list.1` → back to an array, *not* `{ "0": "a", "1": "b" }`. The fold only triggers when *every* key on a node matches `/^\d+$/`.
- **Collision policy:** If both `products.list` (string) and `products.list.title` (object) exist, the object wins and the string is silently dropped. The server is expected to reject such writes; `expandEntries` simply doesn't throw.
- `foldNumericNodes` uses `toSorted` (immutable) rather than `sort`.
- The type `TranslationDictionaries` is imported from `@/i18n`; the file defines no types of its own.
