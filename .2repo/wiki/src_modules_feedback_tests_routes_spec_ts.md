# src/modules/feedback/tests/routes.spec.ts

## Purpose

Vitest spec that locks in the `meta.access` declaration of every feedback route. It exists to catch the failure mode where a route silently loses its access restriction (making an admin-only route publicly reachable) or where a new route is added without being accounted for.

## Key elements

- **`describe('feedback route access')`** — top-level block grouping all assertions.
- **`it.each` (parameterized access check)** — verifies that `Contact` declares `access: undefined` (public) and `FeedbackInbox` declares `access: 'admin'`. Fails if either route is missing or its access value drifts.
- **`it('declares no route this file does not know about')`** — asserts the full set of route names is exactly `{ Contact, FeedbackInbox }`, catching any unregistered additions.

## Relationships

- **`src/modules/feedback/routes.ts`** — the sole import (`routes`). The spec reads the exported array of route records and inspects each record's `name` and `meta.access` fields. No other modules are touched.

## Notes

- The public-vs-admin split is intentional module design (contact form open, inbox restricted), not an incidental side-effect. The test encodes that intent so a refactored `routes.ts` that drops or changes the split is immediately flagged.
- The "no unknown routes" assertion means adding a new route to `routes.ts` requires a matching entry in this spec's `it.each` table *and* the whitelist array — both must be updated together.
