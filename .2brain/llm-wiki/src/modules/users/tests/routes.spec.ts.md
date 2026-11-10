---
source: src/modules/users/tests/routes.spec.ts
sha256: 08708725a51e991c090c73431c13af33add2f0a525fce1da8b3e54db0da331b5
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T06:06:46.215972+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` values declared on every users route, verifying them by route name against the module's raw route records (not a resolved router). Its job is to catch a route that silently loses its access declaration—making it indistinguishable from a public route—by asserting each expected value explicitly rather than deriving it.

## Key elements

- **`byName(name: string): RouteRecordRaw | undefined`** — Lookup helper that finds a route record by its `name` property within the imported `routes` array.
- **`describe('users route access')`** — Top-level suite. Contains an `it.each` table covering four routes (`UsersList`, `UserCreate`, `UserTarget`, `UserEdit`) asserting the expected `meta.access` string and `meta.can` tuple (`[action, subject]`) for each.
- **Completeness test** (`'declares no route this file does not know about'`) — Asserts the sorted list of all route names matches the four known names, catching any new route added without an access decision.

## Relationships

- **`src/modules/users/routes.ts`** — The sole subject under test. This spec imports its default export (the route array) and reads `name`, `meta.access`, and `meta.can` from each record. No mocking or router instance is involved.

## Notes

- This file proves declarations are *there*; a separate router spec (not in this directory) proves enforcement is *attached*. The two are complementary.
- Every expected value is written out literally (not derived from the source) so that a missing or changed declaration fails the test visibly.
- The completeness check means adding a new route to `routes.ts` without updating this table will break CI—intentional, to force an access decision.
- Operates on the raw array of route records; no locale prefix, app bootstrap, or router instance is required.
