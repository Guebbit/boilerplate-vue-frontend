---
source: src/modules/cart/tests/routes.spec.ts
sha256: b1f926d3ae58c1cd3af35732042593ff3b299d23cd8ca1f3a32651e7dbd03643
generated_at: 2026-10-02T15:02:36.069846+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/routes.spec.ts

## Purpose

Verifies that every cart route explicitly declares a `meta.access` value. This matters because a route that silently loses its access declaration becomes indistinguishable from a public one and no other test in the suite would flag the regression. This spec proves the declarations exist; the router spec (elsewhere) proves enforcement is wired up.

## Key elements

- **`byName(name)`** — helper that looks up a `RouteRecordRaw` by its `name` in the imported routes array.
- **`it.each([['Cart', 'auth']])`** — parametrized assertion that each listed route exists and carries the expected `meta.access` value. Expected values are hardcoded, not read back from the record, to avoid circular logic.
- **"declares no route this file does not know about"** — asserts the full set of route names equals exactly `['Cart']`. Catches a new route added without an access decision being recorded here.
- **`routes` import** from `../routes` — the single data source under test; the spec reads the raw array, not a resolved router instance.

## Relationships

- **`src/modules/cart/routes.ts`** — sole dependency. The test imports the default-exported route array and asserts on its records' `name` and `meta.access` fields. No other module is involved.

## Notes

- Expected access values are written out explicitly rather than derived from the records being tested. This is intentional: deriving the expectation from the same source would make the test tautological.
- The spec operates on the raw route array, so it needs neither a locale prefix nor the rest of the app context.
- The "no unknown routes" test acts as a completeness gate: adding a route to `routes.ts` without adding a row to the `it.each` table (or updating the expected name list) will fail this test.
- Lives in the cart module's test directory rather than a platform-level spec because it asserts domain-specific facts; moving it would couple an unrelated spec to the cart domain.
