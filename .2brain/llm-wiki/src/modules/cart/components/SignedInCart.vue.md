---
source: src/modules/cart/components/SignedInCart.vue
sha256: e8d8d97a3911b08eb45e8bb7b68a414e03120654982f24d53a8a4ea169ebc5be
signature: e8d8d97a3911b08eb45e8bb7b68a414e03120654982f24d53a8a4ea169ebc5be
generated_at: 2026-11-10T03:54:27.684461+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/SignedInCart.vue

## Purpose

The signed-in cart page. Renders the shopper's line items (via `CartLineCard`), a shipping/payment/address section, and a gated checkout button. Layers a debounced local quantity stepper on top of the store's update endpoint so rapid clicks collapse into one request per line, and reacts to server-side checkout refusals (short stock, unavailable items, open-order limit, purchase hold) with targeted UI updates rather than a single generic error.

## Key elements

- **Component name block (`<script>`)** — gives the SFC a stable `name: 'SignedInCart'` for devtools and `<KeepAlive>`; `<script setup>` cannot declare one itself.
- **`shippingMethodId` (ref) + two watchers** — mirrors `cart.shipping.selected` into local state and, on shopper-initiated change, calls `setShippingMethod` immediately (server-validated). A refusal reverts to the previous choice and toasts a classified error.
- **`shipsToAddress` (computed)** — true when the cart requires shipping *and* the chosen method needs an address; the single condition under which billing can be "same as shipping."
- **`canCheckout` (computed)** — gates the checkout button: requires `cart.checkoutable`, a billing entry (always, unless a shipping address is set), a shipping method when `cartShipping.required`, and an address when the method demands one.
- **`placing` (ref)** — synchronous double-click guard; set before any async work so a second press in the same task is blocked.
- **`runCheckout`** — calls `store.placeOrder`, then on success toasts and navigates to the new order's page (via `useOrderLink`); on refusal delegates to `useCheckoutRefusals.handleRefusal`.
- **`shortfallText`** — maps a `CheckoutShortfallLine` (fewer left / out of stock / unavailable) to a specific i18n key.
- **`openOrderTargets` (computed)** — resolves the ids from a `CART_OPEN_ORDER_LIMIT_REACHED` refusal into routable links (empty when the build ships no order page).
- **`hasLaterLine` (computed)** — true when any line is preorder or backorder; drives a single "these lines won't ship now" notice near the shipping picker.
- **Checkout draft persistence** — `notes`, `paymentMethodId`, `addressId` are written to per-viewer storage on every change (`writeCheckoutDraft`) and restored on mount (`readCheckoutDraft`); cleared by checkout completion and logout.
- **`useCheckoutRefusals`** — centralises the refused-checkout UI state (`insufficientStockLines`, `unavailableLines`, `openOrderIds`, `holdSignal`, `checkoutError`) and exposes `handleRefusal` + `resetRefusals`.
- **`useCartStockPoll` / `useCartFocusRefresh`** — background stock polling and a window-focus refresh so stale stock or price data is re-fetched when the shopper returns.

## Relationships

- **`src/modules/cart/store.ts` (useCartStore)** — single source of truth for `cart`, `cartItems`, `cartSummary`, `cartShipping`, `loading`; the page calls `fetchCart`, `updateCartItem`, `removeCartItem`, `clearCart`, `setShippingMethod`, and `checkout` on it.
- **`src/modules/cart/components/CartLineCard.vue`** — renders each individual line (title, price, availability, quantity stepper).
- **`src/modules/cart/components/CartEmptyState.vue`** — shown in place of the line list when the cart has no items.
- **`src/modules/cart/components/MergeReportAlert.vue`** — displayed when a cart merge produced a report the shopper should see.
- **`src/modules/cart/composables/use-line-quantity.ts`** — provides the debounced stepper logic; the page passes the store's `updateCartItem` as the commit callback.
- **`src/modules/cart/composables/use-checkout-refusals.ts`** — owns the refusal-state machine; the page supplies `onShippingMethodRefused` to clear the picker.
- **`src/modules/cart/composables/use-cart-stock-poll.ts`** — polls stock so `availability` labels stay current without a full cart refetch.
- **`src/modules/cart/composables/use-cart-focus-refresh.ts`** — re-fetches the cart when the browser tab regains focus.
- **`src/modules/cart/composables/use-checkout-draft.ts`** — read/write/clear helpers for the per-viewer localStorage draft.
- **`src/modules/cart/domain/index.ts`** — re-exports `MIN_LINE_QUANTITY`, `classifyCheckoutError`, and the `CheckoutShortfallLine` type used throughout the page.
- **`src/modules/cart/domain/checkout-errors.ts`** — provides the error classification (`classifyCheckoutError`) consumed when a shipping-method or checkout request is refused.
- **`src/infrastructure/utils/logger.ts`** — infrastructure logging utility available to the module.
- **`src/modules/cart/tests/cart-view.spec.ts` / `src/modules/cart/tests/cart-line-price.spec.ts` / `src/modules/cart/tests/mount-cart-page.ts`** — unit and integration tests that mount or render this component.

## Notes

- The file uses **two script blocks**: a plain `<script>` solely to set `name` (required for `<KeepAlive>` matching) and the main `<script setup>` for all logic. Omitting the first block breaks KeepAlive.
- `shippingMethodId` is **dual-source**: it mirrors the cart's `shipping.selected` *and* drives a `PUT` on change. The "skip if already selected" guard in the change-watcher prevents a redundant request when the mirror-watcher fires.
- `placing` is set **synchronously** (before `await`), unlike `loading` which flips inside a later microtask — this is the intentional double-press guard documented in `docs/modules/cart-checkout.md`.
- The checkout draft is keyed by `viewer.id` but falls back to `readCheckoutDraft('')` (anonymous key) when there is no viewer; writes are skipped entirely when `viewer` is falsy.
- `notes` is normalised to `undefined` when blank so the API contract never receives an empty string for an omitted field.
- The component imports cross-module UI (`ShippingSelector`, `PaymentMethodSelector`, `AddressPicker`, `PurchaseHoldNotice`) and product utilities (`useProductLines`) — it is a composition root, not a leaf.
