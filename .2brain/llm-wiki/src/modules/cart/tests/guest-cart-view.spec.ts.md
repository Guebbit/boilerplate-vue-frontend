---
source: src/modules/cart/tests/guest-cart-view.spec.ts
sha256: 2093b96033042a661892784cef20c954a2bb049e4ea53a24fa44c4dafd94a2b6
signature: df75cc8c633bd4d7cbe893db55986826c8e53e50be4d3a6132887ba1bbd08d1d
generated_at: 2026-11-10T04:06:46.080538+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-view.spec.ts

## Purpose

Vitest spec that mounts `GuestCart.vue` against a real router and a stubbed `searchProducts` endpoint, verifying the guest's view of their cart: empty state, batched pricing, quantity steppers, sign-in redirect, line removal, cart clearing with confirmation, and graceful handling of products that are no longer available.

## Key elements

- **`mountPage(lines, catalogue?, gate?)`** — Mounts `GuestCart` with a pre-seeded guest cart, configures the `searchProducts` mock, flushes promises, and returns `{ cart, wrapper }`. The optional `gate` parameter can defer or reject the product read.
- **`catalogAnswers(catalogue, gate?)`** — Wires `searchProducts` to filter the provided catalogue by the requested `id` array, returning an `orval`-shaped `contractResponse`.
- **`aProduct(id, price)`** — Minimal `Product` fixture factory (EUR, in-stock, buyable, `NO_PRODUCT_ACTIONS`).
- **Router** — A `createMemoryHistory` router built from `collectModuleRoutes(enabledModules)`, so the `/en/login?continue=/en/cart` link resolves exactly as in the app.
- **Test blocks** — `describe` groups: empty cart, pricing/totals, sign-in link, quantity steppers (incl. `MAX_GUEST_LINE_QUANTITY` ceiling), line removal, cart clear (dialog confirm + double-click guard), unavailable/off-sale product handling, and an axe-a11y check.

## Relationships

- **`src/modules/cart/components/GuestCart.vue`** — The component under test; all assertions target its `data-test` attributes and rendered text.
- **`src/modules/cart/domain/index.ts`** — Imports `MAX_GUEST_LINE_QUANTITY` to assert the stepper ceiling.
- **`src/modules/cart/store.ts`** — Imports `useCartStore` to seed `guestLines` and to assert post-interaction state.
- **`tests/support/stub.ts`** — `asStub` wraps mock return values in the shape the component expects.
- **`tests/support/unit/axe.ts`** — `axeViolations` runs the accessibility scan against the mounted DOM.
- **`tests/support/unit/fixtures.ts`** — `NO_PRODUCT_ACTIONS` supplies the empty actions array in product fixtures.
- **`tests/support/unit/orval-fixture-schema.ts`** — `contractResponse` produces a typed, schema-valid API response envelope.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers modules so the router picks up cart routes.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** — Sibling spec covering property-based (fuzzed) invariants for the same component; this spec covers concrete, deterministic scenarios.

## Notes

- `wireModulesIntoCore()` is called at module top level (outside `beforeEach`) so it runs once for the whole spec file.
- The `gate` parameter (a `() => Promise<unknown>`) is a deliberate pattern: passing `() => new Promise(() => undefined)` holds the product read open forever, used to test the "no total while unresolved" case; a rejecting promise simulates a read failure.
- The clear-cart double-click test fires both clicks via `Promise.all` before either dialog resolves, asserting the dialog `confirm` is called exactly once (debounce/guard in the component).
- `document.body.innerHTML = ''` in `afterEach` is required because `attachTo: document.body` is used for axe and router-link tests.
