---
source: src/modules/cart/tests/routes.spec.ts
sha256: 3cca500e9e6f45882350fafca6250946b4937b95633634f31ad6c37b70b5fd4d
generated_at: 2026-10-17T00:42:23.241071+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/routes.spec.ts

## Purpose

Verifies that the cart module's route records carry the access declarations the domain expects. It exists because a route that silently loses its `meta.access` is indistinguishable from a public one—no other test in the suite would flag it. Asserting literal expected values (rather than deriving them from the records) makes that failure visible.

## Key elements

- **`byName(name)`** — helper that looks up a `RouteRecordRaw` from the imported `routes` array by its `name`.
- **`'Cart' declares access: 'open'`** (via `it.each`) — confirms the `Cart` route exists and its `meta.access` is exactly `'open'`.
- **`'needs the key that lets a role shop'`** — confirms `meta.can` is `['update', 'Cart']`, meaning signed-in visitors must hold the `update` permission on `Cart`.
- **`'declares no route this file does not know about'`** — asserts the full set of route names is `['Cart']`; a new route added to the module will fail here until this spec is updated.

## Relationships

- **`src/modules/cart/routes.ts`** — the sole production dependency. The test imports its default export (`routes`, an array of `RouteRecordRaw`) and inspects each record's `name`, `meta.access`, and `meta.can` directly. It does not instantiate a router or resolve paths, so no app context, locale prefix, or middleware is involved.

## Notes

- Access values are hard-coded literals, not read from the records. This is deliberate: if a route's `meta.access` is removed, `expect(...).toBe('open')` fails on `undefined` rather than silently matching a derived value.
- The "no unknown routes" test is a completeness guard, not a behavior test. Adding a second cart route (e.g. a checkout sub-route) requires a new line in this spec; forgetting to do so fails the suite.
- `open` (not `auth`) is the expected access because guests own a browser-local cart until sign-in merges it. The `meta.can` key is only enforced on signed-in visitors, so guests are not blocked.
- The module is colocated with the cart domain (not a platform-wide spec) so deleting the cart module cannot leave a dangling reference in a shared test. See `docs/theory/modules.md`.
