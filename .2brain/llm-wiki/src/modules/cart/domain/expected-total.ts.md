---
source: src/modules/cart/domain/expected-total.ts
sha256: 2137c93f86da2cb2f281883d93d73a97b6a6399a8260c3a986af14ee846a3ac1
generated_at: 2026-10-17T00:35:39.054354+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/expected-total.ts

## Purpose
Pure helper module that computes the integer-minor-unit total a buyer sees before "Place order" and shapes it into the `{ amount, currency }` form the `POST /cart/checkout` endpoint expects. The server rejects with 409 `CART_TOTAL_CHANGED` if its own calculation differs, so this file exists to keep the client-side number math precise and testable without any `Intl` or locale dependency.

## Key elements
- **`ExpectedTotal`** (type) — structural alias for `CheckoutRequest['expectedTotal']`; the wire shape `{ amount: number, currency: string }`.
- **`toMinorUnits(amount, digits)`** — converts a decimal amount to integer minor units using `Math.round(amount * 10 ** digits)`.
- **`fromMinorUnits(minor, digits)`** — inverse conversion for display purposes.
- **`expectedTotalOf(summary, digits)`** — takes a `CartSummaryResponse` and returns the `ExpectedTotal` object, pulling `summary.totalPrice` and `summary.currency`.

## Relationships
- **`src/modules/cart/domain/checkout-errors.ts`** — defines the `CART_TOTAL_CHANGED` error the server raises when this module's output no longer matches the server's own total; the two files are the client/server contract pair for the total.
- **`src/modules/cart/domain/index.ts`** — barrel file that re-exports this module's symbols so the rest of the cart domain can import them via the domain entry point.
- **`src/modules/cart/store.ts`** — calls `expectedTotalOf` (or the individual converters) when assembling the `CheckoutRequest` payload before dispatching the checkout API call.
- **`src/modules/cart/views/Cart.vue`** — displays `fromMinorUnits` output as the human-readable total the buyer sees; the value shown here is what the checkout request must carry.
- **`src/modules/cart/tests/expected-total.spec.ts`** — unit tests covering rounding edge cases and the shape of `expectedTotalOf`.

## Notes
- `toMinorUnits` deliberately uses `Math.round` rather than `Math.floor` to survive floating-point drift (e.g. `1.13 * 100 → 112.999…`). Truncation would silently drop a cent.
- The currency's decimal-places count (`digits`) is always passed in by the caller; the module never inspects the currency code itself. This keeps it pure and JPY/KWD-safe.
- `fromMinorUnits` is provided for display round-tripping only; it is **not** part of the checkout request path.
