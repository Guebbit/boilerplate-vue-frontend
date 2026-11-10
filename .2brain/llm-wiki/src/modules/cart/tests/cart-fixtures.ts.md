---
source: src/modules/cart/tests/cart-fixtures.ts
sha256: 2181b0ca7caca8f741d4aa22791ad2c4fd8890f294d546180761c03f84f17a8b
signature: 8961a5ae31e53876725f4622c44d4bc29e0ee7572e49ed55a63768c166e19e19
generated_at: 2026-11-10T04:00:51.606765+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-fixtures.ts

## Purpose

Typed cart factory for cart test specs. It builds a full `CartResponse` from a list of `[productId, quantity]` lines so that every total, count, and flag is *derived* from the lines rather than hand-copied. Specs that assert "this is the cart the server last answered" compare whole objects produced by this factory, keeping arithmetic in one place.

## Key elements

- **`UNIT_PRICE`** (`'10.00'`) — the fixed per-unit price every fixture line carries; item totals are always `quantity × UNIT_PRICE`.
- **`aCart(lines, selected?, short?)`** — the sole factory. Accepts:
  - `lines` – `[productId, quantity]` pairs in list order.
  - `selected` – shipping method id (`'standard'` | `'pickup'`), `null` (explicit clear → no `selected` key), or omitted (no selection).
  - `short` – product ids to mark as `insufficient_stock`.

  Returns a `CartResponse` with computed `summary` (itemsTotal, shippingCost, totalPrice, currency `'EUR'`), per-item `availability` / `canIncrease` (capped at `LINE_MAX = 10`), a `shipping` block (options only when items exist; `selected` key only when a string was passed), and `checkoutable` (true iff items exist and none are short).
- **`LINE_MAX`** (10) – internal constant driving `canIncrease`.
- **`SHIPPING_OPTIONS`** – two fixed methods (`standard` 5.00 w/ address, `pickup` 0.00); reused by every non-empty cart.

## Relationships

All graph neighbors are spec files that import `aCart` (and in some cases `UNIT_PRICE`) to construct expected or actual cart snapshots:

- **Cart-view specs** (`cart-view-double-submit.spec.ts`, `cart-view-interleavings.spec.ts`, `cart-view-shipping-radio.spec.ts`, `cart-view-stale-refusal.spec.ts`) use `aCart` to build the "server-answered" cart they assert against in double-submit, interleaving, shipping-radio, and stale-refusal scenarios.
- **Store specs** (`store-add-key.spec.ts`, `store-checkout-key.spec.ts`, `store-double-seed.spec.ts`, `store-interleavings.spec.ts`, `store-late-answer.spec.ts`, `store-stale-answer.spec.ts`, `store-stock-poll.spec.ts`) call `aCart` to model server responses for key-based, interleaving, late-answer, stale-answer, and stock-poll flows.
- **Property & hook specs** (`guest-cart.property.spec.ts`, `use-cart-focus-refresh.spec.ts`, `use-cart-stock-poll.spec.ts`) rely on `aCart` to generate or compare cart states in property-based and hook-level tests.

## Notes

- `selected: null` and `selected: undefined` both produce a cart with **no** `selected` key on `shipping`, but `null` is the value the server uses for an explicit "clear" action. Specs that model a clear pass `null` intentionally.
- `shipping.required` and `shipping.options` are gated on `lines.length > 0`; an empty cart gets `required: false` and an empty options array.
- `checkoutable` is `false` when *any* line is in `short`, even if others are in stock.
- Totals are computed via `multiplyDecimal` / `sumDecimals` (string-based decimal math), not `Number` arithmetic — keep it that way if extending the factory.
