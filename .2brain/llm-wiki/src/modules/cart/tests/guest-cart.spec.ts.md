---
source: src/modules/cart/tests/guest-cart.spec.ts
sha256: f53d376b92db341d2e480c6b0c920c5ded51c5543ee2c20f01dafb28b8199837
generated_at: 2026-10-17T00:41:18.805421+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart.spec.ts

## Purpose

Vitest spec that exercises every exported function of the guest cart domain module. It locks down the behavioral contract—clamping rules, caps, immutability, and defensive parsing of untrusted storage—so regressions in `guest-cart.ts` surface immediately.

## Key elements

- **`describe('addGuestLine')`** — verifies creating a new line, growing an existing one, immutability of the input array, per-line quantity cap, line-count cap (rejects new products, still grows existing ones).
- **`describe('setGuestLineQuantity')`** — verifies exact-set semantics, floor at 1 (0 / negatives clamp to 1), ceiling at `MAX_GUEST_LINE_QUANTITY`, truncation of fractions, and no-op for unknown products.
- **`describe('removeGuestLines')`** — verifies multi-product removal preserves order of survivors and is a no-op for absent products.
- **`describe('subtractGuestLines')`** — verifies the merge-subtraction logic: full removal, partial subtraction, dropping lines the guest already lowered below the sent quantity, leaving unrelated lines untouched, immutability, and empty-subtract as identity.
- **`describe('guestCartQuantity')`** — verifies total-unit counting (sum of quantities, not line count) and the empty-cart case.
- **`describe('parseGuestCart')`** — the largest block; verifies round-trip, rejection of non-array inputs (`undefined`, `null`, strings, numbers, single objects), per-line shape validation (type, id length ≤ 64, quantity ≥ 1, quantity ≤ cap, no fractional/text quantities), deduplication of duplicate product ids, and the hard cap on total line count.
- **`FULL`** (module-level const) — a `GuestCartLine[]` with `MAX_GUEST_LINES` entries, used as the "cart is full" fixture.

## Relationships

- **`src/modules/cart/domain/index.ts`** — the barrel the spec imports all functions and the `GuestCartLine` type from (`from '../domain'`).
- **`src/modules/cart/domain/guest-cart.ts`** — the implementation under test; every `describe` block targets a function defined there.

## Notes

- Immutability is asserted explicitly for `addGuestLine` and `subtractGuestLines` (the input array must not be mutated). The other functions are not given the same explicit check, so a future refactor that mutates `setGuestLineQuantity` or `removeGuestLines` inputs would not be caught by this spec.
- `parseGuestCart` treats a single non-array object (e.g. `{ productId, quantity }`) as "not a list" and returns `[]`—it does not attempt to coerce it to an array.
- The product-id length boundary is 64 characters (inclusive). The test uses `'x'.repeat(64)` for the valid case and `'x'.repeat(65)` for the rejected case.
- `setGuestLineQuantity` floors to 1 rather than removing the line; removal is a separate call (`removeGuestLines`). This distinction is called out in the test name.
