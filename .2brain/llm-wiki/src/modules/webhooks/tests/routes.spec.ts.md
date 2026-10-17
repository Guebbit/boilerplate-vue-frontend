---
source: src/modules/webhooks/tests/routes.spec.ts
sha256: 5f0b0ed42a5a594f364411a76a7b72a7fcca828f7f48425fc616655826b0500f
generated_at: 2026-10-17T01:51:31.973069+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/routes.spec.ts

## Purpose

A Vitest spec that pins the `meta.access` and `meta.can` values declared on every webhooks route, checked by name against the module's raw route records (not a resolved router). It guarantees that no route silently loses its access declaration and that no route is added to the module without an explicit access decision.

## Key elements

- **`byName(name)`** — local (non-exported) helper that finds a `RouteRecordRaw` by its `name` property in the imported `routes` array.
- **`describe('webhooks route access')` → `it.each` table** — five `[name, access, action, subject]` tuples assert that each route exists, its `meta.access` string matches, and its `meta.can` equals `[action, subject]` (or is `undefined`).
- **"declares no route this file does not know about"** — sorts the actual route names and compares them to the hardcoded list of five, failing if a new route appears without a corresponding entry above.

## Relationships

- **`src/modules/webhooks/routes.ts`** — imports its default export (`routes: RouteRecordRaw[]`) as the sole subject under test. No other interaction.
- **`vue-router`** — imports the `RouteRecordRaw` type (type-only) for the `byName` helper's return annotation.
- **`vitest`** — uses `describe`, `expect`, `it`, and `it.each`.

## Notes

- Expected access values are **hardcoded** per route, not derived from a shared constant or the route definition itself. This is intentional: it makes any drift in `meta.access` visible in the diff.
- The file header docblock explicitly distinguishes this spec (proves declarations *exist*) from the router-level spec (proves enforcement is *attached*). If a route's `meta` is removed, this file catches it; if the middleware is miswired, the router spec does.
- The "no unknown routes" test means that **adding a route to `routes.ts` requires adding a new row to the `it.each` table** in the same change, or the suite fails.
- `byName` is deliberately module-private; it is not shared with other specs.
