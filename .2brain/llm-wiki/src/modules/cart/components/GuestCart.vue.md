---
source: src/modules/cart/components/GuestCart.vue
sha256: a006754a31bbdcea5fbda39bb85f567a9823f71b4c984ee75e1ac730025f67d4
signature: 904bf01ec25019c75e6f27471feecbc80bbf26c3bf5429e70e04b7288676eb84
generated_at: 2026-11-10T03:53:35.825286+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/GuestCart.vue

## Purpose

The cart view rendered for signed-out visitors. It displays the lines the shopper has added (persisted in the browser), prices them via one batched product read, and presents sign-in as the path to checkout. It deliberately omits shipping, address, and payment fields because those require an account.

## Key elements

- **`refreshLines()`** – Loads products for all guest lines, resets the `readAnswered` flag, and records the locale at start so a mid-flight locale switch is detectable.
- **`readAnswered` (ref)** – Gates the "product is gone" logic. A read that was canceled (e.g. by a locale change) does **not** mark products as removed.
- **`isGone(productId)`** – Returns `true` only when a full, same-locale read has completed without the product.
- **`isOffSale(productId)`** – Returns `true` when the product exists but `purchasable` is `false`.
- **`stepLine(line, step)`** / **`removeLine(productId)`** – Delegate to the cart store for quantity updates and line removal.
- **`handleClearCart()`** – Wrapped in `singleFlight`; asks for confirmation via `useDialogStore` before calling `cartStore.clearGuestCart()`.
- **`signInTo` (computed)** – Builds a router-link to the `Login` route with `continue: route.fullPath`, or `undefined` if no account module is present (button is then hidden).
- **`itemsTotal` / `allPriced` / `currency` (computed)** – Derive the pre-shipping total, whether it can be shown, and the display currency.

## Relationships

- **src/modules/cart/components/CartEmptyState.vue** – Rendered in place of the cart grid when `guestLines` is empty.
- **src/modules/cart/components/CartLineCard.vue** – Renders each line (title, price, quantity stepper, remove button, availability badges).
- **src/modules/cart/domain/guest-cart.ts** / **src/modules/cart/domain/index.ts** – Supplies the `GuestCartLine` type and the `MAX_GUEST_LINE_QUANTITY` constant.
- **src/modules/cart/store.ts** – Source of `guestLines`, `guestQuantity`, and the mutation actions (`updateGuestItem`, `removeGuestItems`, `clearGuestCart`).
- **src/modules/cart/views/Cart.vue** – Parent view that switches between this guest cart and the signed-in cart.
- **src/modules/cart/tests/guest-cart-view.spec.ts** – Unit tests for this component's behavior.

## Notes

- **Locale-race guard:** `refreshLines` captures `locale.value` before the read and compares it after. If the locale changed mid-flight, `readAnswered` stays `false`, so a product missing from a stale read is never incorrectly labelled "No longer available."
- **Removed products are never auto-purged.** A product that disappears from the read gets a "No longer available" badge and its Remove button; it stays in the guest cart until the shopper deletes it. A product that later reappears is still there.
- **`signInTo` is defensive:** `linkIfRouted` returns `undefined` on builds without an account module, and the template simply hides the button rather than throwing on an unknown route.
- **`singleFlight` on clear:** Prevents a double-click from issuing two confirmation dialogs or two clear calls.
