---
source: src/modules/cart/views/Cart.vue
sha256: 0581e081474e7b2b275ee3608384456639ae28cd81a212c44da3d60ba2e56140
generated_at: 2026-10-17T00:45:31.660749+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/views/Cart.vue

## Purpose

The cart page view. It renders the cart's lines and summary, provides quantity steppers, lets the shopper pick shipping / payment / address, and drives the checkout call. It also surfaces structured checkout refusals (insufficient stock, unavailable products, open-order limits) inline so the shopper can fix the basket without a round-trip error loop.

## Key elements

- **`CartPage`** (default export, `<script lang="ts">`) — sets the SFC's `name` for `<KeepAlive>` and devtools, since `<script setup>` cannot declare one.
- **`shippingMethodId` + two `watch`es** — mirrors `cart.shipping.selected` into a local ref; on shopper-driven change calls `setShippingMethod` and reverts the picker on server refusal.
- **`canCheckout` (computed)** — gates the Place-order button: all lines buyable, shipping method chosen (if required), address chosen (if method demands one), billing entry present.
- **`linesNeedAttention` (computed)** — true when any line's `availability` is not `in_stock` or `preorder`; blocks checkout.
- **`insufficientStockLines` / `unavailableLines` / `openOrderIds` (refs)** — populated from classified checkout refusals; rendered as inline alerts or links so the shopper corrects the basket in-place.
- **`placing` (ref)** — synchronous in-flight guard set before the store's async `checkout` call, preventing double-submission within the same task.
- **`useBlockingError`** — dedicated toast/inline slot for the generic checkout fallback error.
- **`useLineQuantity`** — debounced quantity stepper layered over `updateCartItem`; collapses rapid clicks into one request per line.
- **`useCartStockPoll` / `useCartFocusRefresh`** — background stock re-check and window-focus refresh respectively.
- **`use-checkout-draft` (`readCheckoutDraft` / `writeCheckoutDraft` / `clearCheckoutDrafts`)** — persists notes, payment choice, and address per-visitor in tab storage so a reload restores the form.
- **`useProductLines` (`titleOf`, `availabilityLabel`, etc.)** — batched product title/price/availability lookup shared with the product module.
- **`classifyCheckoutError` (from `../domain`)** — maps a raw API refusal to a typed verdict (`shipping-method-weight`, `CART_INSUFFICIENT_STOCK`, `CART_PRODUCT_UNAVAILABLE`, `CART_OPEN_ORDER_LIMIT`, …) that drives the inline UI.
- **`fromMinorUnits` / `formatCurrency`** — convert wire money to the visitor's locale for display.
- **`MergeReportAlert`** — shows a merge report when two carts are merged server-side.
- **`ShippingSelector` / `PaymentMethodSelector` / `AddressPicker`** — cross-module form widgets wired into the page's local refs.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/cart/store.ts` | Reads reactive state (`cart`, `cartItems`, `cartSummary`, `cartShipping`, `loading`); calls actions `fetchCart`, `updateCartItem`, `removeCartItem`, `clearCart`, `setShippingMethod`, `checkout`. |
| `src/modules/cart/composables/use-line-quantity.ts` | Provides the debounced stepper that wraps `updateCartItem`. |
| `src/modules/cart/composables/use-cart-stock-poll.ts` | Periodic stock re-validation while the page is open. |
| `src/modules/cart/composables/use-cart-focus-refresh.ts` | Re-fetches cart data when the browser tab regains focus. |
| `src/modules/cart/composables/use-checkout-draft.ts` | Reads/writes/clears the per-visitor checkout form draft in storage. |
| `src/modules/cart/domain/index.ts` (barrel over `checkout-errors.ts`, `expected-total.ts`, `quantity.ts`) | Exports `classifyCheckoutError`, `fromMinorUnits`, `MIN_LINE_QUANTITY`, and the `ExpectedTotal` / `CheckoutShortfallLine` / `UnavailableCartLine` types. |
| `src/modules/cart/components/MergeReportAlert.vue` | Rendered when the server reports a cart merge. |
| `src/modules/cart/views/CartEntry.vue` | Per-line item component rendered inside the cart's line list (template section). |
| `src/modules/cart/tests/cart-view.spec.ts` | Unit/E2E tests exercising this view's rendering and checkout flow. |
| `src/modules/cart/tests/cart-line-price.spec.ts` | Tests line-price calculations consumed by this view. |

## Notes

- The file uses **two script blocks**: a plain `<script>` for the `name` option and `<script setup lang="ts">` for all logic. This is the project convention for named SFCs.
- `placing` is set **synchronously** before `placeOrder()` is invoked; the store's own `loading` ref flips a microtask later. Both guards are needed to close the same-task double-click window.
- The shipping-method `watch` compares against `cart.shipping.selected` to avoid a redundant `PUT` when the server echo matches the local ref.
- `billingAddressId` is `undefined` while `shipsToAddress` is true (meaning "same as shipping"); otherwise the `AddressPicker` pre-selects the visitor's default so checkout never omits a required id.
- `openOrderTargets` uses `linkIfRouted` — if the orders module is not in the current build, those order ids render as plain text with no link.
- The file is **truncated** in the provided source; the template section and the tail of the script (likely containing the `sendKeepalive` usage and the full render block for `CartEntry`) are not visible.
