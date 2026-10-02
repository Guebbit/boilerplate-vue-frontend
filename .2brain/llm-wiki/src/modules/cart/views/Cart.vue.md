---
source: src/modules/cart/views/Cart.vue
sha256: 19887bccb613d05e0b4febaab6235fda68a72dfb72f33288f2c5dc93ac9d4fb0
generated_at: 2026-10-02T15:04:21.083389+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/views/Cart.vue

## Purpose

The cart page view. Renders the shopper's basket lines with a debounced quantity stepper, a shipping-method picker, an address picker (billing and/or shipping), a payment-method selector, free-text notes, and the checkout button. It orchestrates the full "review basket → pick shipping → pick address → pay" flow before handing off to the orders module.

## Key elements

- **`shippingMethodId` (ref)** — mirrors `cart.shipping.selected`; a `watch` (once) seeds it on first cart load, and a second `watch` persists every change via `setShippingMethod`, reverting on server refusal.
- **`useLineQuantity`** — debounced stepper composable; rapid +/- clicks collapse into one `updateCartItem` call per line.
- **`canCheckout` (computed)** — gate for the checkout button; requires a shipping method (and an address when the method demands one), or a billing address when nothing ships.
- **`runCheckout()`** — assembles the `placeOrder` payload conditionally (omits `addressId`, `billingAddressId`, `paymentMethod`, `notes` when absent), then on success clears drafts, toasts, and navigates to the new order page (falling back to `Home` if the orders route is not registered).
- **Error handling** — `classifyCheckoutError` routes refusals into specific inline alerts (`insufficientStockLines`, `unavailableLines`) or toasts; only the generic fallback lands in `useBlockingError`'s message.
- **Checkout draft persistence** — `writeCheckoutDraft` / `readCheckoutDraft` keyed by viewer id; a `watch` on `[notes, paymentMethodId, addressId]` keeps the tab's local storage current; `clearCheckoutDrafts` on success.
- **`shipsToAddress` (computed)** — true when `cartShipping.required` **and** the chosen method demands an address; controls whether billing is "same as shipping" or asked independently.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — listed as a dependency-graph neighbor; likely invoked in the truncated error-handling tail (`.catch` path of `runCheckout` or the shipping-method watcher) for structured logging of checkout failures. No direct import is visible in the shown portion.

## Notes

- The file is a **view-only** SFC: all mutations go through `useCartStore` actions; no API calls are made directly here.
- `shippingMethodId` is intentionally **not** passed into `placeOrder` — the server already has it from the `PUT /cart/shipping-method` call, so re-sending it would be redundant (and could race).
- `addressId` is conditionally spread into the checkout payload **only** when the method requires an address; omitting it for pickup/digital-only baskets avoids a `CART_ADDRESS_NOT_APPLICABLE` 409.
- The post-checkout `router.push` is fire-and-forget (`void`) so a `NavigationFailure` (e.g. orders module not built) cannot turn a completed checkout into an error toast.
- `MIN_LINE_QUANTITY` is imported from `@/modules/cart/domain` for the stepper floor; the clamping logic lives in `use-line-quantity.ts`, not here.
- The component name is `'CartPage'` (set in the options `<script>` block), distinct from the filename `Cart.vue`.
