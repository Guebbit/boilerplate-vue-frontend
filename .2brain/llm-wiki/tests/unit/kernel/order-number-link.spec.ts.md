---
source: tests/unit/kernel/order-number-link.spec.ts
sha256: 2477c7d8b7204995106f7b81ae7289250f63235c2bce9eeef93ca4c1b54643cc
signature: dfeee051f1eae766372e7bbd04e0f82e746841b3d33870613ba7e0240d087fc0
generated_at: 2026-11-10T08:09:50.966213+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/order-number-link.spec.ts

## Purpose

Unit tests for `useOrderNumberLink` (from `@/kernel/order-link`), verifying that the hook produces a `SalesOrders` route with an `orderNumber` query param only when that route is registered and a number is supplied, and returns `undefined` otherwise.

## Key elements

- **`routed`** — module-level `string[]` acting as the set of route names the stubbed router reports as existing; reset to `[]` in `beforeEach`.
- **`vi.mock('vue-router', …)`** — replaces `useRouter` with a stub whose `hasRoute(name)` checks membership in `routed`.
- **`describe('useOrderNumberLink')`** — two cases:
  - *links a number to the staff orders list filtered by it* — asserts the returned object matches `{ name: 'SalesOrders', query: { orderNumber: '2026-000041' } }`.
  - *gives nothing for a build without the staff list, or without a number* — asserts `undefined` when `routed` is empty, and `undefined` when the argument is `undefined`.

## Relationships

- **`@/kernel/order-link`** — the module under test; provides the `useOrderNumberLink` composable.
- **`vue-router`** — mocked at the module level so no real router instance is created; the test controls `hasRoute` results via the `routed` array.

## Notes

- The mock is registered once at the top level (not inside `beforeEach`); only the `routed` array is reset per test.
- The hook is exercised as a curried call: `useOrderNumberLink()(number)` — first invocation returns the function, second invocation supplies the order number.
