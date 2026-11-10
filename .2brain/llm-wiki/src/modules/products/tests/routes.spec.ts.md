---
source: src/modules/products/tests/routes.spec.ts
sha256: 98979d7c978fa27bc4ff4c7287bc099bf08e7fa07fda797cc22772cbb583fbea
signature: 58cc6a6d5bd59333cead605ea8bb88b934cc03dfb9d2acbdda66b1a0711c85cb
generated_at: 2026-11-10T05:30:31.812206+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/routes.spec.ts

## Purpose

Vitest spec that verifies every route in the products module declares the expected `meta.access` and `meta.can` values, and enforces a closed-set invariant: no route may be added to `routes.ts` without an explicit access decision appearing here. It asserts against the module's raw route records directly (not a resolved router), so it runs without a locale prefix or the wider app shell.

## Key elements

- **`byName(name)`** — helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` field.
- **`it.each` table (4 rows)** — for each of `ProductsList`, `ProductCreate`, `ProductTarget`, `ProductEdit`, asserts the route exists, that `meta.access` equals the expected value (`undefined` or `'auth'`), and that `meta.can` equals the expected `[action, subject]` tuple or `undefined`.
- **Closed-set check** (`'declares no route this file does not know about'`) — compares the sorted list of all route names in `routes` against the sorted list of the four names hardcoded above. Adding a new route without updating this test causes a failure.

## Relationships

- **`src/modules/products/routes.ts`** — the sole import target. The test reads its default export (the `routes` array) and asserts against each record's `name`, `meta.access`, and `meta.can` fields. No mocking; the assertions reflect the module's own declarations.

## Notes

- Expected values are written out explicitly per the file's own rationale: a route that silently loses `meta.access` becomes indistinguishable from a public one, so the test never derives the expected value from the code under test.
- The `meta.can` assertion uses `toEqual` on a two-element array `[action, subject]` (e.g. `['create', 'Product']`), not a single string. When `can` is absent, the expected value is `undefined`.
- The file sits alongside the module (not in a shared test directory) by convention: it documents a fact about *this* domain's route declarations, complementary to a router-level spec that would prove the enforcement middleware is actually attached.
- The closed-set test uses `.toSorted()` (ES2023) on both sides, so the comparison is order-independent but size-dependent.
