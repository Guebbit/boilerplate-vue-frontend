---
source: src/modules/cart/tests/add-to-cart-button.spec.ts
sha256: 4c7776eddbb3e7fa25c2d31f1b65bfe617ada99ea97870fba39c95ee194241c7
generated_at: 2026-10-02T14:59:49.855368+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/add-to-cart-button.spec.ts

## Purpose
Unit tests for the `AddToCartButton` component in isolation — verifying stock gating, guest gating, the add-one-unit contract, stale-cart safety, and the in-flight double-click guard. The hosting product page is deliberately out of scope (lives in the `products` module's tests).

## Key elements
- **`vi.mock('@api', …)`** — Partial mock: only `addCartItem` is wrapped (`vi.fn(actual.addCartItem)`); all other exports pass through. Most tests instead spy on the store's `addCartItem` action, which never reaches this mock. Only the in-flight-guard test uses it directly.
- **`wireModulesIntoCore()`** (from `tests/support/unit/wire-modules.ts`) — Called at module scope to register the cart module in the DI core so the store is resolvable.
- **`nextRenderTick(wrapper)`** (from `tests/support/unit/mounted-vm.ts`) — Waits for one extra Vue render tick; used in the in-flight guard test after a click that leaves `cart.loading` truthy.
- **`EMPTY_CART`** / **`IN_STOCK`** — Typed fixtures (`CartResponse`, `Product`) used as default stub values.
- **`signIn()`** — Sets `session.accessToken` and `session.viewer` so the button is not gated behind login.
- **`mountButton(product)`** — Mounts `AddToCartButton` with the given product prop, Vuetify, and i18n plugins.
- **`describe('the shelf')`** — Three tests: out-of-stock disables, in-stock enables, guest disables.
- **`describe('adding')`** — Four tests covering: add-one-unit contract (FA30), stale in-memory cart doesn't inflate quantity, and in-flight guard (FA39).

## Relationships
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, invoked once at module scope before any test runs to wire cart-module services into the test DI container.
- **`tests/support/unit/mounted-vm.ts`** — Provides `nextRenderTick()`, awaited in the FA39 in-flight guard test to let Vue flush the disabled-state re-render after the first click's promise is still pending.

## Notes
- The `@api` mock calls through to the real implementation by default; it only becomes a no-op when a test explicitly overrides with `mockReturnValueOnce`. This keeps the mock surface minimal.
- The FA39 test (in-flight guard) requires a *genuinely* pending promise because `cart.loading` is TanStack-tracked state — a resolved mock cannot set it. The test rejects the gated promise after asserting the disabled state.
- `beforeEach` resets Pinia *and* loads the `'en'` locale; forgetting either will produce cascading failures that look unrelated to the component under test.
