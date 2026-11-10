---
source: src/modules/cart/composables/use-checkout-refusals.ts
sha256: 102097c46feb76a6f2482cfdbb0d869a932065df8c0c2a8fc52482b4843a68c6
signature: 382822109e70600fd6bb9d10f5c9d28a2cdf73fb5a8747416df302b603947407
generated_at: 2026-11-10T03:55:35.448067+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/composables/use-checkout-refusals.ts

## Purpose

Maps each classified checkout-error verdict to its specific UI reaction on the cart page (toast, inline shortfall lines, cart refetch, shipping-method picker reopen, or navigation to orders) and owns the reactive state those reactions leave on screen. It exists so the cart component never inspects raw error shapes itself — it calls one `handleRefusal` entry and reads the returned refs.

## Key elements

- **`useCheckoutRefusals(hooks)`** — the composable. Accepts a `CheckoutRefusalHooks` object (currently just `onShippingMethodRefused`) and returns `{ insufficientStockLines, unavailableLines, openOrderIds, holdSignal, checkoutError, resetRefusals, handleRefusal }`.
- **`CheckoutRefusalHooks`** — interface for page-owned side-effects (reopening the shipping-method picker).
- **`handleRefusal(error)`** — public entry point. Classifies the rejection via `classifyCheckoutError`, then delegates to the internal `react` switch.
- **`react(verdict, error)`** — exhaustive `switch` over every `CheckoutErrorVerdict` kind, guarded by a `satisfies never` default. Each case performs its reaction (toast, inline list, refetch, navigation, or button-block).
- **`reactToServerError(error)`** — special 500 handling: if `cartItems` is empty the order was written (toast + navigate to OrdersList); otherwise the generic blocking error is shown on the checkout button.
- **`refetchCart` / `toastAndRefetch(key)`** — re-read the cart after stale-basket refusals; a failed refetch blocks the checkout button via `useBlockingError`.
- **`totalChangedMessage(expected, actual)`** — builds the locale-formatted "total moved" toast; falls back to a generic message if either amount is missing.
- **`resetRefusals()`** — clears `insufficientStockLines`, `unavailableLines`, `openOrderIds`, and the blocking-error state before the next checkout attempt. Does **not** reset `holdSignal`.
- **`formatAmount(money)`** — local helper wrapping `formatCurrency` for `ExpectedTotal` values.

## Relationships

- **`src/modules/cart/domain/index.ts`** (→ `checkout-errors.ts`, `expected-total.ts`) — source of `classifyCheckoutError` and the `CheckoutErrorVerdict`, `CheckoutShortfallLine`, `ExpectedTotal`, `UnavailableCartLine` types. The composable is the sole consumer of `classifyCheckoutError`.
- **`src/modules/cart/store.ts`** — `useCartStore` provides `fetchCart` (re-read after stale-basket refusals) and `cartItems` (read after a 500 to distinguish written vs. lost orders).
- **`src/modules/cart/components/SignedInCart.vue`** — the page component that calls `useCheckoutRefusals`, supplies `onShippingMethodRefused`, renders the inline line lists, and wires `handleRefusal` into the checkout button's error path.
- **`tests/cross-cutting/module-map.spec.ts`** — verifies this file's position in the module dependency graph.

## Notes

- `holdSignal` is a monotonically increasing counter (incremented, never set to a specific value). Consumers watch it reactively; it is intentionally **not** reset by `resetRefusals` so the hold banner re-reads the buyer's record each time.
- The `total-changed` case toasts but does **not** refetch — the store already refreshed the cart during checkout, so the on-screen total is already current.
- `reactToServerError` fires `router.push` with `void` and an eslint-disable: a `NavigationFailure` must not surface as an error to the shopper because the order was in fact written.
- The `other` verdict kind is the only one that blocks the checkout button in place (via `useBlockingError`) rather than showing a dismissible toast or inline list.
- Exhaustiveness is enforced at compile time: adding a new `CheckoutErrorVerdict` kind without a `case` here produces a `satisfies never` type error.
