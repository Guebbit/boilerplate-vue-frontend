# src/modules/cart/views/Cart.vue

## Purpose

The cart page view. Renders the visitor's cart lines (product title, quantity stepper, remove) alongside a summary panel with shipping selection and checkout/clear actions. It layers a debounced local stepper on top of the store's quantity update so rapid clicks collapse into one request per line.

## Key elements

- **`checkout`** – Calls the store's `placeOrder` (passing `shippingMethodId` only when set), toasts success, and navigates to `OrdersList`. Navigation is fire-and-forget (`void`) so a `NavigationFailure` never converts a completed checkout into an error toast.
- **`lineQuantity(item)`** – Returns the pending (visitor-side) quantity from `useLineQuantity` while a step is outstanding, falling back to the store's `item.quantity`.
- **`removeLine(productId)`** – Calls `forget(productId)` *before* `removeCartItem` to discard any queued step that would otherwise fire after removal and re-create the line.
- **`useLineQuantity(updateCartItem, …)`** – Composable providing `quantityOf`, `stepQuantity`, `forget`, `flushPending`. All debouncing/race-avoidance logic lives there, not in this view.
- **`shippingMethodId`** – `ref<string | undefined>`; `undefined` means "no shipping method" (matches the API contract). Bound two-way to `<ShippingSelector>`.
- **`onMounted`** – `fetchCart()` then `resolveTitles` for all product IDs so the view can display names immediately.
- **`onBeforeUnmount(flushPending)`** – Flushes any in-flight debounced step so the request isn't lost.
- **`MIN_LINE_QUANTITY`** – Imported from `@/modules/cart/domain`; disables the decrement button at the floor.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Appears in the dependency graph but no direct import or call is visible in this file's source. Interaction (if any) is indirect, likely through `notifyErrorMessages` in `errors.ts` or the store.

## Notes

- Two `<script>` blocks: a plain one for the component `name` and a `<script setup>` for logic. This is a project convention, not a mistake.
- The stepper's clamping rule (min quantity, max) is intentionally **not** in this file — it lives in `use-line-quantity.ts` / `domain/quantity.ts`. Don't add `Math.max`/`Math.min` guards here.
- `data-test` attributes are present on every interactive element for e2e selectors; keep them when refactoring the template.
- `titleOf` and `resolveTitles` come from the cart store; the view never fetches product names independently.
- The summary card is sticky on `lg+` (`lg:sticky lg:top-20`) — layout, not behavior, but worth preserving if the grid changes.
