---
source: src/modules/cart/tests/add-to-cart-button.spec.ts
sha256: 7f74ce45a4ec2e8f6c410279d32ac54fd12a2b4e4e2d4417a85496bc0e5cd72b
generated_at: 2026-10-17T00:37:21.193164+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/add-to-cart-button.spec.ts

## Purpose

Unit tests for `AddToCartButton` mounted in isolation with a `Product` prop. Covers button availability states (in-stock, out-of-stock, off-sale, preorder, no-permission, guest), guest-local cart mutations, and the server "add" contract (always sends quantity 1). The hosting product page is intentionally out of scope — it belongs to the `products` module's tests.

## Key elements

- **`mountButton(product)`** — mounts `AddToCartButton` with Vuetify + i18n plugins; returns a Vue Test Utils wrapper.
- **`signIn()`** — seeds the session store with a token, viewer, and `update:Cart` ability so the button renders enabled.
- **`EMPTY_CART` / `IN_STOCK`** — fixture shapes for `CartResponse` and `Product` used across assertions.
- **`vi.mock('@api')` (call-through)** — wraps `addCartItem` in `vi.fn(actual.addCartItem)` so the real implementation runs unless a specific test overrides the return. Only the in-flight-guard test needs a controllable pending promise.
- **`wireModulesIntoCore()`** — one-time setup registering shared modules for the test runtime.
- **`beforeEach`** — clears `localStorage` (guest cart), resets Pinia, loads the `en` locale.
- **Test groups:**
  - *the shelf* — disabled/enabled states, permission gating, label text per availability.
  - *a guest adding* — local `guestLines` mutation, `MAX_GUEST_LINES` cap, no server call.
  - *adding* — signed-in `addCartItem(productId, 1)` contract, stale-cart guard, in-flight double-click lock.

## Relationships

- **`AddToCartButton.vue`** — the component under test; all assertions target its rendered output (`[data-test=add-to-cart]`, `[data-test=add-to-cart-error]`).
- **`store.ts` (`useCartStore`)** — tests spy on `addCartItem` and `fetchCart` actions, and read `guestLines` / `cart` state directly.
- **`domain/index.ts`** — imports `MAX_GUEST_LINES` to seed a full guest cart in the cap test.
- **`tests/support/unit/wire-modules.ts`** — calls `wireModulesIntoCore()` once at module level to register cross-cutting dependencies before any test runs.
- **`tests/support/unit/mounted-vm.ts`** — imports `nextRenderTick` to await a reactive DOM update after the in-flight guard toggles `disabled`.

## Notes

- **Call-through mock pattern:** because `vi.fn(actual.addCartItem)` invokes the real implementation by default, most tests never need to mock the API. The in-flight test is the sole exception — it must produce a genuinely pending promise because `cart.loading` is real TanStack-tracked state that only an in-flight request can flip.
- **Quantity is always 1:** a dedicated test seeds a stale 5-unit line into `cart.cart` to prove the button never reads the in-memory cart to compute a total; the server owns arithmetic.
- **`localStorage.clear()` is mandatory** in `beforeEach`: the guest cart persists in `localStorage` and survives Pinia resets, so a stale guest line would leak between tests otherwise.
- **Permission test** uses `setAbilities({ tenant: [], platform: [] })` to assert the button is absent entirely (not merely disabled) when the signed-in role lacks the `update:Cart` key.
