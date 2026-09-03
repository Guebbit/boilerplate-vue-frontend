# src/modules/locales/tests/dictionaries.spec.ts

## Purpose

Unit tests for the two pure transformation functions `flattenDictionary` and `expandEntries`. They exercise the nested-object ↔ flat-dotted-rows conversion in isolation (no store, no transport), covering edge cases like array/numeric-key round-tripping, deep nesting, and the deeper-key-wins collision rule.

## Key elements

- **`describe('flattenDictionary')`** — three tests: nested objects → dotted-key rows, arrays → numeric index segments (`faq.0`, `faq.1`), empty object → `[]`.
- **`describe('expandEntries')`** — six tests:
  - Rebuilds a nested tree from flat rows.
  - Folds all-numeric sibling keys back into a JS array.
  - Sorts numeric segments numerically (10 > 2), not lexically.
  - Keeps a node an **object** when keys are mixed (`node.0` + `node.name`).
  - Deeper key wins on collision regardless of insertion order.
  - Round-trip: `expandEntries(flattenDictionary(dict))` returns the original.

## Relationships

- Imports `flattenDictionary` and `expandEntries` from `@/modules/locales/dictionaries.ts` (the module under test). No other dependencies.

## Notes

- The "arrays become numeric keys" convention exists because static pages store list items inside translation objects; the test docstring calls this out explicitly.
- The collision test asserts order-independence: both `[shallow, deep]` and `[deep, shallow]` must yield the same result.
- The mixed-key test (`node.0` + `node.name`) documents that the array-folding rule only applies when **all** siblings are numeric—any non-numeric key keeps the container as a plain object.
- All tests use plain literal fixtures; no mocking or external state is involved.
