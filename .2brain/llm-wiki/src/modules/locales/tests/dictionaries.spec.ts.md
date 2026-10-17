---
source: src/modules/locales/tests/dictionaries.spec.ts
sha256: 1bafb4bfd7d46cf4e945e666f898eceb223a50e8ae1c028a4610527a4c2fdb89
generated_at: 2026-10-17T01:05:08.023972+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/dictionaries.spec.ts

## Purpose

Vitest unit tests for the two pure conversion functions (`flattenDictionary` / `expandEntries`) that translate locale dictionaries between nested-object and flat dotted-key-row representations. No store, transport, or DOM involvement — the tests exercise edge cases (arrays, deep nesting, collision resolution) directly against inline fixtures.

## Key elements

- **`describe('flattenDictionary')`** — three tests: nested objects → dotted rows, arrays → numeric-segment keys (`faq.0`, `faq.1`), and the empty-object → empty-array case.
- **`describe('expandEntries')`** — six tests:
  - Dotted rows → nested tree reconstruction.
  - All-numeric siblings fold back into an array (round-trip).
  - Numeric segments sort numerically (`list.2` before `list.10`), not lexically.
  - A node mixing numeric and non-numeric keys stays a plain object.
  - Deeper key wins on collision (both insertion orders asserted to give the same result).
  - Full round-trip: `expandEntries(flattenDictionary(dict))` equals the original for a realistic multi-section dictionary.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — the sole dependency. This file imports `flattenDictionary` and `expandEntries` from that module and is the primary (and per the doc comment, only) test suite for its pure logic.

## Notes

- The "deeper-key-wins" collision is explicitly framed as a defensive case the API should never produce; the test asserts order-independence (deep key survives regardless of insertion order).
- Array detection on `expandEntries` requires *all* siblings to be numeric; a single non-numeric key among them keeps the node as an object.
- Numeric-segment sorting is a real gotcha: string comparison would place `list.10` before `list.2`; the test pins the numeric ordering.
