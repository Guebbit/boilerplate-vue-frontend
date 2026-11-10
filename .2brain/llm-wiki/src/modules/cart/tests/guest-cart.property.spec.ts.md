---
source: src/modules/cart/tests/guest-cart.property.spec.ts
sha256: 5b759ddaaf164bfb868bf47419e0fb75b58a3852edbf30df182b594f29ea0fc9
signature: 6b9d9c0cb82bc5657c16b1b6f6f70f69a850d9f8d9553f6ea6002732e43476b6
generated_at: 2026-11-10T04:07:04.534268+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart.property.spec.ts

## Purpose

Property-based tests (fast-check + vitest) that verify the guest-cart domain invariants hold after **every** possible sequence of guest operations, not just the hand-picked boundary cases covered by the example specs. It exercises the pure domain functions and the `localStorage`-backed storage layer, asserting that validity, round-trip fidelity, merge/additivity, and subtraction properties are preserved universally.

## Key elements

- **`RUN`** – Fixed seed (`20_261_004`) and `endOnFailure: true`; makes every counterexample reproducible and shrunk to a paste-ready snippet.
- **`productId()`** – Arbitrary that returns product IDs biased 75 % toward `'a'`–`'d'` (to force line collisions) and 25 % toward random `[\w-]{1,64}` strings.
- **`Operation`** / **`operation()`** – Union type and generator for the three guest actions (`add`, `set`, `remove`). `set` quantities deliberately exceed the cap on both sides (−2000 … 2000, doubles) because the API is documented to clamp.
- **`apply()`** – Applies a single operation the way the store does; a refused `add` leaves the cart unchanged.
- **`reachableCart()`** – Generates any cart reachable by up to 40 operations starting from empty.
- **`Addition`** / **`additionsOf()`** / **`addAll()`** – Helpers to generate and apply batches of additions (used in merge and hand-edited-list tests).
- **`byProduct()`** – Converts `GuestCartLine[]` to a `Map<productId, quantity>` for order-independent comparison.
- **`problemsWith()`** – Returns a list of human-readable violations (too many lines, duplicate product, out-of-range or non-integer quantity); empty array means the cart is valid.
- **`afterEach`** – Clears `localStorage` so storage round-trip tests start clean.
- **`describe` blocks** – Four groups: validity after any operation run; total-and-idempotent storage reads; merge/additivity and badge counting; removal idempotence and safety.

## Relationships

- **`src/modules/cart/domain/guest-cart.ts`** (via the `../domain` barrel) – The file under test. Imports `MAX_GUEST_LINES`, `MAX_GUEST_LINE_QUANTITY`, `addGuestLine`, `guestCartQuantity`, `parseGuestCart`, `removeGuestLines`, `setGuestLineQuantity`, `subtractGuestLines`, and the `GuestCartLine` type.
- **`src/modules/cart/domain/index.ts`** – Barrel re-export; the actual import target is `../domain`.
- **`src/modules/cart/guest-cart-storage.ts`** – Imports `readGuestCart` and `writeGuestCart` to test round-trip persistence through `localStorage`.

No other listed graph neighbors are imported or referenced in this file.

## Notes

- The file explicitly positions itself as the complement to `guest-cart.spec.ts` and `guest-cart-storage.spec.ts`: those own exact boundary values (999th unit, 101st product); this file owns the universal "holds after every sequence" claims.
- Seed is fixed per the project convention referenced in `docs/tools/property-testing.md`; changing the seed will change which counterexample is reported but not whether one exists.
- `endOnFailure: true` means a single failing run stops at the first shrunk case—useful for pasting a minimal reproduction into an ordinary `it()` block.
- The `set` operation generator uses `fc.double` (not `fc.integer`) with negative values, exercising the documented clamping path of `setGuestLineQuantity`.
- Product-ID collision is intentional (weighted toward 4 IDs) so that line-merge and cap-clamping paths are hit frequently rather than by chance.
