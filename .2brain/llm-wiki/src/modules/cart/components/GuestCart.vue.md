---
source: src/modules/cart/components/GuestCart.vue
sha256: 4e1fb66a388e089b27be0f1621c585919c65387b9bdfd33ff6cfdb1b86cdd236
generated_at: 2026-10-17T00:33:42.101174+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/GuestCart.vue

## Purpose

Renders the cart view for signed-out visitors: the product lines stored in their browser, priced by a single batched product read. It deliberately omits shipping, address, and payment (all of which require an account) and instead offers a "Sign in to check out" link that deep-links back to this page after login, where the same lines are promoted into the real cart.

## Key elements

- **`readAnswered` (ref)** — Set `true` only when `loadProducts` resolves *and* the locale hasn't changed since the call started. Guards `isGone` so a cancelled or failed read is never misread as "product deleted."
- **`refreshLines()`** — Calls `loadProducts` with all line product IDs, toggles `readAnswered`, and routes failures into `useBlockingError`. Invoked on mount.
- **`isGone(productId)`** — Returns `true` only when `readAnswered` is `true` *and* `useProductLines().isRemoved` says the product is absent. The line is never auto-removed; the template just shows a "No longer available" chip.
- **`stepLine(line, step)`** — Adjusts quantity by ±1, clamped by `MAX_GUEST_LINE_QUANTITY`; delegates to `cartStore.updateGuestItem`.
- **`removeLine(productId)` / `handleClearCart()`** — Single-line removal and full-cart clear (the latter behind a `useDialogStore().confirm` prompt).
- **`allPriced` / `itemsTotal` / `currency`** — Computed guards: the total is displayed only when every line has a resolved product; currency is taken from the first priced line, falling back to `shopCurrency`.
- **`signInTo` (computed)** — Resolves the `Login` route via `linkIfRouted` + `routerLinkI18n`, passing the current `route.fullPath` as a `continue` param. Yields `undefined` on builds without an account module, hiding the button.
- **Template** — Two-column grid (line list + sticky summary card); empty state with a CTA to the product list; per-line quantity steppers, price line, remove button, and removed-chip; `InlineErrorAlert` for load failures.

## Relationships

- **`../domain` (`guest-cart.ts` / `index.ts`)** — Imports the `GuestCartLine` type and the `MAX_GUEST_LINE_QUANTITY` constant that caps per-line quantity.
- **`../store.ts`** — Consumes `useCartStore` for `guestLines`, `guestQuantity` (via `storeToRefs`), and the mutation actions `updateGuestItem`, `removeGuestItems`, `clearGuestCart`.
- **`views/CartEntry.vue`** — Parent view that conditionally renders this component for signed-out visitors (vs. the signed-in cart).
- **`tests/guest-cart-view.spec.ts`** — Unit/E2E spec that exercises this component's rendering, quantity steppers, removed-line display, and clear-cart flow.

## Notes

- **`readAnswered` locale guard:** `refreshLines` captures `locale.value` at call time and only sets `readAnswered = true` if the locale is unchanged at resolution. A language switch mid-flight cancels the read; without this check a missing product would be flagged "removed" based on stale data.
- **Lines are never auto-purged:** A product that disappears from the read gets a warning chip and a visible Remove button, but the line persists in the store. Only the shopper (or `clearGuestCart`) removes it.
- **Total visibility is all-or-nothing:** If even one line lacks a resolved product, the summary hides the items-total row rather than showing a partial sum.
- **`signInTo` is intentionally optional:** On builds where the account module is absent, `linkIfRouted` returns `undefined` and the sign-in button is simply not rendered—no error is thrown.
- **`onMounted` only:** Product pricing is loaded once on mount; there is no watch on `guestLines` to re-trigger a read. New lines added elsewhere (e.g., via a PDP) rely on the existing product dictionary already containing them or a page re-navigation.
