# src/modules/feedback/tests/routes.spec.ts

## Purpose

Guards the `meta.access` declaration of every feedback route so that a route cannot silently lose its access restriction (and become publicly reachable) without a deliberate test update. It encodes the module's access contract as a hard-coded table: the contact form is public, the inbox is admin-only.

## Key elements

- **`describe('feedback route access')`** – top-level suite; all assertions concern route access metadata.
- **`it.each([...])('%s declares access: %s')`** – parameterized check that `Contact` has `meta.access === undefined` and `FeedbackInbox` has `meta.access === 'admin'`. Fails if a route is missing or its access value changes.
- **`it('declares no route this file does not know about')`** – exhaustiveness guard: asserts the sorted list of route names exactly matches `['Contact', 'FeedbackInbox']`. Adding a new route in `routes.ts` without listing it here causes a test failure.

## Relationships

- **`src/modules/feedback/routes.ts`** (imported as `routes`) – the sole subject under test. This spec reads `route.name` and `route.meta.access` from each entry in that default-exported array. It does not invoke any handler or render logic.

## Notes

- Access values here are the **source of truth**, not a mirror read from `routes.ts`. If the intended access level changes, this table must be updated first (or simultaneously); the test will flag the mismatch.
- `undefined` access means *public*; `'admin'` means *restricted*. The convention is that absence of `meta.access` is the default-open state.
- The module doc references a "twin" in the account module, indicating this file follows a shared pattern across the codebase for route-access pinning.
- Adding a new route to `routes.ts` without updating both the `it.each` table and the sorted-name list will fail two separate assertions, making the omission hard to miss.
