# src/modules/cart/views/Cart.vue

## Purpose

The cart page component. Renders the current cart's line items (with quantity steppers) and a sticky order summary, and drives the checkout flow. It layers a debounced local stepper on top of the store's quantity update so rapid clicks collapse into one request per line, and handles the four distinct checkout-refusal shapes with targeted UI (inline shortfall list, stale-cart refetch, generic toast).

## Key elements

- **`checkout()`** — Places an order via the cart store's `placeOrder` action. On success: success toast + fire-and-forget navigation to `OrdersList`. On failure: routes through `classifyCheckoutError` to handle `cart-changed` (refetch), `insufficient-stock` (pop `insufficientStockLines` for inline rendering), `address-not-found` (toast), or a generic error toast.
- **`useLineQuantity(updateCartItem, onError)`** — Composable that debounces per-product quantity changes. Exposes `quantityOf` (shows pending step value), `stepQuantity`, `forget` (cancel pending), and `flushPending` (fire any in-flight step).
- **`removeLine(productId)`** — Calls `forget(productId)` before `removeCartItem` so a queued step can't resurrect a deleted line. Errors surface as toasts.
- **`lineQuantity(item)`** — Returns the quantity to display: the visitor's pending step if one is outstanding, otherwise the store's value.
- **`insufficientStockLines`** — Reactive array of `CheckoutShortfallLine` rendered as an inline `v-alert` listing each short line's title, requested, and available quantity.
- **`onMounted` / `onBeforeUnmount`** — Fetches the cart and resolves product titles on mount; flushes any pending quantity steps on unmount.
- **`shippingMethodId`** — Optional ref bound to `<ShippingSelector>`; passed into `placeOrder` only when set.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Graph neighbor via the dependency graph, but no direct import or call is visible in this file. The error path routes through `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`), which may internally use the logger, but that indirection is not expressed here.

## Notes

- The quantity floor (`MIN_LINE_QUANTITY`) is imported from `@/modules/cart/domain` — it is a domain rule, not a template concern. The composable `use-line-quantity.ts` owns the clamping logic.
- `checkout()` clears `insufficientStockLines` at the top of every call so a new attempt starts clean.
- The post-checkout `router.push` is deliberately fire-and-forget (`void`): a navigation failure must not turn a completed checkout into an error toast.
- `data-test` attributes (`cart-item`, `cart-decrease`, `cart-increase`, `cart-remove`, `checkout-shortfall`, `checkout-shortfall-line`, `cart-summary`) are the E2E hooks; prefer them over structural selectors in tests.
- The template file was truncated in the source provided; the checkout button (below `v-divider` in the summary column) and any trailing markup are not visible here.
