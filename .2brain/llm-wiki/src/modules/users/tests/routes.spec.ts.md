---
source: src/modules/users/tests/routes.spec.ts
sha256: 08708725a51e991c090c73431c13af33add2f0a525fce1da8b3e54db0da331b5
generated_at: 2026-10-17T01:47:19.727577+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` declarations on every users route by name, verifying that the route records actually carry their access decisions. It complements the router spec (which proves enforcement is wired up) by proving the declarations themselves are present and correct, without needing a resolved router or locale prefix.

## Key elements

- **`byName(name)`** — module-private helper; finds a `RouteRecordRaw` in the imported `routes` array by its `name` field. Returns `undefined` if no route matches.
- **`describe('users route access')`** — the test suite. Contains an `it.each` block that asserts each of the four routes (`UsersList`, `UserCreate`, `UserTarget`, `UserEdit`) declares the expected `meta.access` value and `meta.can` tuple (action + subject).
- **"declares no route this file does not know about" test** — a completeness guard: asserts the full set of route names equals exactly the four listed, catching any newly added route that lacks an explicit access decision.

## Relationships

- **`src/modules/users/routes.ts`** — the sole subject under test. This spec imports its default export (`routes`, a flat array of `RouteRecordRaw`) and inspects each record's `name`, `meta.access`, and `meta.can` fields. No other interaction exists.

## Notes

- Expected access values are **written out literally** (e.g. `'auth'`, `['read', 'User']`) rather than derived from a shared source, so a silent mutation of `meta.access` fails the test immediately.
- The completeness test uses `.toSorted()` on both sides so it is order-independent; the assertion set must be updated whenever a route is added or removed in `routes.ts`.
- The file deliberately avoids bootstrapping the full app or router; it operates on the raw route-record array, keeping the test fast and isolated.
