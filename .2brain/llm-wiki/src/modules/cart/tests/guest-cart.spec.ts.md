---
source: src/modules/cart/tests/guest-cart.spec.ts
sha256: 47c99945c169bec4823fd00cac21cbda18096227a668ef06bac1b2718a3817e3
signature: 737b71f9b2b73a395c671d0e58ffbb8aa1b604230b11d34e8cc7fc62988878e5
generated_at: 2026-11-10T04:07:17.855420+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart.spec.ts

## Purpose
Vitest spec for the guest cart domain logic. It pins down the mutation rules (add, set, remove, subtract), the clamping behaviour, the defensive `parseGuestCart` reader for untrusted storage, and verifies that the domain's two caps mirror the values generated into the API contract.

## Key elements
- **`FULL`** – helper constant: a cart at exactly `MAX_GUEST_LINES` distinct products, each qty 1. Used as the "full cart" fixture.
- **`describe('the caps')`** – asserts `MAX_GUEST_LINES` / `MAX_GUEST_LINE_QUANTITY` equal the `mergeCartBodyLinesMax` / `mergeCartBodyLinesItemQuantityMax` exported by `@api/schemas`.
- **`describe('addGuestLine')`** – covers creating a new line, growing an existing one, immutability of the input array, clamping to the per-line cap, refusing a new product at full capacity, and still growing an existing line in a full cart.
- **`describe('setGuestLineQuantity')`** – exact set, floor at 1 (zero/negative → 1), cap at `MAX_GUEST_LINE_QUANTITY`, fractional flooring, and no-op for an unknown product.
- **`describe('removeGuestLines')`** – drops named products, preserves order of survivors, no-op for missing ids.
- **`describe('subtractGuestLines')`** – models the post-send reconciliation: drops fully-sent lines, keeps only post-send additions, drops lines lowered below sent qty, leaves unrelated lines untouched, is immutable, and no-ops on an empty send list.
- **`describe('guestCartQuantity')`** – sums quantities across lines; zero for empty cart.
- **`describe('parseGuestCart')`** – the most extensive suite: round-trips valid data, treats non-array input as `[]`, filters malformed lines (wrong type, missing fields, bad id shape/length, qty out of range, fractional qty), deduplicates by product id, and caps the result at `MAX_GUEST_LINES`.

## Relationships
- **`src/modules/cart/domain/index.ts`** – barrel re-export; this spec imports every public function and the `GuestCartLine` type from this path.
- **`src/modules/cart/domain/guest-cart.ts`** – the implementation under test; all `describe` blocks exercise its exports.
- **`@api/schemas`** (external to the graph neighbors) – supplies `mergeCartBodyLinesMax` and `mergeCartBodyLinesItemQuantityMax`, the generated contract values the caps test compares against.

## Notes
- The caps test is a *contract mirror* guard: if the API schema changes the max, the domain constants will fail until updated.
- `parseGuestCart` tests intentionally feed garbage (strings, numbers, `null`, oversized ids, fractional quantities) to document that localStorage is treated as untrusted input.
- Immutability is asserted explicitly for `addGuestLine` and `subtractGuestLines` but *not* for `setGuestLineQuantity` / `removeGuestLines`, so do not assume those are pure.
- `setGuestLineQuantity` floors fractional input (2.9 → 2) rather than rounding; the test locks this in.
- The `it.each` block for non-list inputs uses `%j` formatting – adding a new case requires matching the `[storedValue]` tuple shape.
