---
source: src/modules/wishlist/tests/routes.spec.ts
sha256: 6f1419645193af255bf56373d7bf6cea852b75160b0c655ca172cbac75f17a7e
signature: 6f1419645193af255bf56373d7bf6cea852b75160b0c655ca172cbac75f17a7e
generated_at: 2026-11-10T06:20:27.446844+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/routes.spec.ts

## Purpose

Guards the wishlist route definitions against two failure modes: a route silently losing its `meta.access: 'auth'` declaration (which would leave it publicly accessible), and unrecognised routes appearing in the array. It exists so that access-control regressions are caught at test time rather than discovered in production.

## Key elements

- **`describe('wishlist route access')`** — top-level suite; no setup/teardown hooks, purely assertion-based.
- **`Wishlist declares access: auth`** — looks up the route by `name === 'Wishlist'` and asserts both that it exists and that `route.meta.access` equals the string `'auth'`.
- **`declares no route this file does not know about`** — maps the exported `routes` array to its `name` fields and asserts strict equality with `['Wishlist']`, catching any new route that hasn't been accounted for in this spec.

## Relationships

- **`src/modules/wishlist/routes.ts`** (via `../routes`) — the sole import under test. This spec asserts on the shape and metadata of the default-exported route array; changes to that file's exports (adding routes, renaming, or dropping the `meta` field) will break these tests.

## Notes

- The access-guard pattern mirrors the account module's equivalent spec: the comment at the top explicitly calls out the failure mode ("a route that quietly loses its `meta.access` keeps rendering and is simply open"). If new wishlist routes are added, the second test will fail immediately until the expected-names array is extended.
- The file uses `route?.meta?.access` (optional chaining) for the access assertion but a hard `toBeDefined()` guard before it, so a missing route produces a readable "undefined" failure rather than a TypeError.
