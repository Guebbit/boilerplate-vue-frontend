---
source: src/modules/cart/tests/guest-cart-view.spec.ts
sha256: ad2adbddbd8161f9b05d3810dd756617e8027098851d83ac532c41562c7d1dfe
generated_at: 2026-10-17T00:40:52.570821+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-view.spec.ts

## Purpose

Vitest unit test spec for the `GuestCart.vue` view. It verifies the guest cart's user-facing behavior—empty state, batched pricing, quantity steppers, sign-in hand-off, line removal, cart clearing, and graceful handling of unavailable products—by mounting the component against a real (memory-history) router with the product-read API stubbed.

## Key elements

- **`aProduct(id, price)`** — factory that builds a minimal `Product` fixture (title, EUR price, in-stock).
- **`catalogueAnswers(catalogue, gate?)`** — reconfigures the mocked `searchProducts` to filter `catalogue` by the request's `id` array and return a schema-valid response. The optional `gate` promise can delay the answer (loading-state tests) or reject (failure tests).
- **`mountPage(lines, catalogue?, gate?)`** — sets `cart.guestLines`, arms the product-read mock, mounts `GuestCart` with router/Vuetify/i18n plugins, flushes promises, and returns `{ cart, wrapper }`.
- **`router`** — real `createRouter` with `createMemoryHistory` and `collectModuleRoutes(enabledModules)`, so the sign-in link's `continue` param resolves exactly as in production.
- **Test suites** — empty cart; pricing (single batched request, totals, partial-price state); sign-in URL; quantity steppers (inc/dec/remove, bounds, aria-labels); clear-cart confirmation dialog; unavailable-product lines (marked "No longer available", no toast, removable).
- **Module-level `wireModulesIntoCore()`** — one-time registration of enabled modules into the kernel before any test runs.

## Relationships

- **`../components/GuestCart.vue`** — the component under test; every assertion targets its rendered DOM via `data-test` attributes.
- **`../domain/index.ts`** — provides `MAX_GUEST_LINE_QUANTITY`, the upper stepper bound exercised in the "cannot step past" case.
- **`../store.ts`** — provides `useCartStore`; tests read and assert on `cart.guestLines` directly.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` bootstraps module registration so the real router can resolve the `/login` route.
- **`tests/support/stub.ts`** — `asStub` casts mock return values to satisfy the API's generic types.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — `contractResponse` wraps fixtures into the shape the real HTTP client expects, keeping the mock schema-valid.
- **`tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts`** — sibling journey test exercising the same cart domain end-to-end; no direct import or shared fixture with this file.

## Notes

- The `searchProducts` mock is scoped to a `vi.mock('@api', …)` that spreads the original module and overrides only `searchProducts`, so other API exports remain untouched.
- `catalogueAnswers` filters on `body.id` (an array), matching the batched-read contract; passing a product whose id is not in the request will not appear in the response, which is how the "product gone" tests work.
- The `gate` parameter (a promise that never resolves) is used to assert the total is *absent* while a price is pending—not to test a timeout.
- Selectors are exclusively `data-test` attributes; the file never relies on CSS classes or element text for locating controls.
- `axe-core` is imported but no `describe`/`it` in the visible portion calls it; it may be used in the truncated remainder or reserved for future accessibility assertions.
- The spec is a component-integration test (real router, real Pinia, real i18n, Vuetify), not an isolated unit test—behavior that depends on route resolution or store state is covered here rather than in the property-based spec (`guest-cart.property.spec.ts`).
