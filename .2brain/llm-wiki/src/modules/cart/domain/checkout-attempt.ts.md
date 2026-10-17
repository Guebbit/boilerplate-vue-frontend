---
source: src/modules/cart/domain/checkout-attempt.ts
sha256: 3004bd30cc14e0ff9dd7e33d6658453a8d3ee853c277bfcafd338e8826ea825d
generated_at: 2026-10-17T00:35:17.995296+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/checkout-attempt.ts

## Purpose

Defines the fingerprint for a single checkout attempt — a stable string derived from the request body, the cart's lines, and the selected shipping method. The server uses an `Idempotency-Key` bound to this fingerprint; if a repeat arrives with the same fingerprint, the recorded response is replayed. The function is pure: no I/O, no store access.

## Key elements

- **`checkoutFingerprint(body, cart)`** — The sole export. Takes an optional `CheckoutRequest` and an optional `CartResponse`, returns a JSON string. The string includes the full body (or `null`), a reduced list of `[productId, quantity]` pairs from `cart.items`, and `cart.shipping.selected` (or `null`). Two checkouts produce identical strings if and only if they describe the same order.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel file for the cart domain; re-exports `checkoutFingerprint` so consumers can import from the domain namespace rather than the leaf path.
- **`src/modules/cart/store.ts`** — Consumes the fingerprint to decide whether an in-flight or completed checkout is a repeat (same key + same fingerprint → replay) versus a new attempt.
- **`src/modules/cart/tests/expected-total.spec.ts`** — Exercises cart-domain logic that `checkoutFingerprint` reads from (line items, totals); kept in the same test cluster to guard against the fingerprint drifting from the data it summarizes.

## Notes

- Only `productId` and `quantity` are extracted from each cart line; other item fields (prices, names, metadata) are intentionally excluded so the fingerprint tracks *what* is ordered, not how it is displayed.
- The body is serialized as-is (`body ?? null`), so adding a field to `CheckoutRequest` automatically changes the fingerprint — no per-field bookkeeping needed.
- Shipping uses `cart.shipping.selected`, not the full shipping object; a change in available options that doesn't alter the selected method does **not** change the fingerprint.
- Pure and side-effect free; safe to call anywhere without triggering store subscriptions or storage writes.
