---
source: src/modules/locales/tests/dictionaries.spec.ts
sha256: b1a15dc72786ee3010a0e847a466a7dcc8d1324756eb9f2763ae519d76817f4e
signature: b1a15dc72786ee3010a0e847a466a7dcc8d1324756eb9f2763ae519d76817f4e
generated_at: 2026-11-10T04:42:20.538731+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/dictionaries.spec.ts

## Purpose

Vitest unit tests for the pure transformation functions owned by the locales dictionaries module. Exercises `flattenDictionary` → `expandEntries` round-tripping and `findDuplicateKey` against plain in-memory fixtures, with no store, transport, or external dependencies. Because these are the only real logic pieces the module owns, all edge cases (array folding, deep nesting, collision resolution) are concentrated here.

## Key elements

- **`describe('flattenDictionary')`** — Verifies nested objects become dotted-key rows, arrays collapse to numeric-index keys (`faq.0`), empty input yields `[]`, and null / non-string leaves are silently skipped rather than thrown.
- **`describe('findDuplicateKey')`** — Confirms it returns the duplicated key string when a flattened set names one key twice, and asserts `toBeUndefined()` when all keys are unique.
- **`describe('expandEntries')`** — Verifies the inverse: dotted rows rebuild the nested tree; all-numeric sibling keys fold back into arrays; numeric segments sort numerically (`list.2` before `list.10`); a node with both numeric and string children stays a plain object; the deeper key wins a collision regardless of insertion order; and a realistic multi-section dictionary round-trips losslessly.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — The sole import source. Provides `flattenDictionary`, `expandEntries`, and `findDuplicateKey`, all of which are tested here. This spec file is the only consumer in the dependency graph for this module's public API.

## Notes

- The "deeper key wins" collision test asserts the same outcome in **both** insertion orders, locking in order-independence as a contract.
- A node that mixes numeric and non-numeric children (e.g. `node.0` + `node.name`) must remain an object, not an array. Tests guard against an over-eager array fold.
- Numeric segment ordering is explicitly tested (`list.10` vs `list.2`) to prevent a regression to lexicographic sort.
- The file is intentionally dependency-free beyond Vitest and the module under test; no mocks, fixtures files, or setup scripts are involved.
