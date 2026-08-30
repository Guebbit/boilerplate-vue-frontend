# src/modules/locales/tests/dictionaries.spec.ts

## Purpose

Vitest unit tests for the two pure dictionary-conversion helpers (`flattenDictionary` and `expandEntries`). The tests exercise the conversions directly against plain fixture data with no store, transport, or mocking, so edge cases (array↔numeric-key folding, deep nesting, collision semantics) are pinned at the logic level.

## Key elements

- **`describe('flattenDictionary')`** — three cases: nested objects → dotted-key rows; top-level arrays → numeric segments (`faq.0`, `faq.1`); empty object → empty array.
- **`describe('expandEntries')`** — six cases covering:
  - Rebuilding a nested tree from dotted rows.
  - Folding all-numeric siblings back into arrays (round-trip fidelity).
  - Sorting numeric segments *numerically* (`list.10` after `list.2`, not lexically).
  - A mixed-key node (e.g. `node.0` + `node.name`) staying an object, not an array.
  - Deeper-key-wins collision rule, asserted in **both** insertion orders to guarantee determinism.
  - A realistic mixed dictionary round-trip through `flattenDictionary` → `expandEntries`.

## Relationships

- **Imports** `flattenDictionary` and `expandEntries` from `@/modules/locales/dictionaries.ts` — the only production code under test.
- Uses Vitest (`describe`, `expect`, `it`) for the test harness.

## Notes

- Tests are intentionally **pure and synchronous** — no async fixtures, no store setup. If the conversions gain I/O, this file will need restructuring.
- The array↔numeric-key convention is load-bearing: `expandEntries` only folds a node into an array when *every* child key is numeric. A single non-numeric sibling keeps the node as a plain object.
- The collision test (`products.list` vs `products.list.title`) documents an invariant the API is expected to enforce but the code still guards against defensively; the double-assertion (both insertion orders) makes order-independence an explicit contract.
