---
source: src/modules/cart/tests/guest-cart.property.spec.ts
sha256: 14330c36c77cb0120bab6ac02019d239e8e3ca5de5bbf6b41357ccd1e5473865
generated_at: 2026-10-17T00:41:08.855744+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart.property.spec.ts

## Purpose

Property-based tests (via `fast-check`) that verify the guest cart's invariants hold for **every** reachable state, not just hand-picked edge cases. It exercises two layers: the pure domain operations in `domain/guest-cart.ts` (add, set, remove, subtract, parse, quantity) and the `localStorage` persistence in `composables/guest-cart-storage.ts`. Example specs elsewhere cover specific boundaries (999th unit, 101st product); this file proves the rules survive arbitrary operation sequences.

## Key elements

- **`RUN`** – Shared `fc` config: `seed: 20_261_004`, `numRuns: 300`, `endOnFailure: true`. One seed per file so failures shrink to a pasteable counterexample.
- **`productId()`** – Weighted arbitrary: 75 % from `'a'`–`'d'` (encourages line collisions), 25 % random `[\w-]{1,64}`.
- **`Operation` / `operation()`** – Union type and generator for the three guest actions: `add` (qty 1–1500), `set` (qty −2000 to 2000, deliberately out-of-range to exercise clamping), `remove` (≤ 3 ids).
- **`apply(lines, step)`** – Mirrors the store's dispatch: a refused `add` leaves the cart unchanged.
- **`reachableCart()`** – Composes up to 40 operations into a valid cart; the primary input for most properties.
- **`addAll(start, list)` / `additionsOf(max, len)`** – Sequential-add helpers used by the merge and subtraction properties.
- **`byProduct(lines)`** – Converts a cart to `Map<productId, quantity>` for order-independent equality.
- **`problemsWith(lines)`** – Returns an array of human-readable violations (line count, duplicate product, out-of-range quantity); empty array means valid.
- **`describe` blocks** – Four groups: *cart invariants*, *storage read robustness*, *merge semantics*, *removal semantics*.

## Relationships

- **`src/modules/cart/domain/guest-cart.ts`** (via `../domain` and `../domain/index.ts`) – The SUT. Imports `addGuestLine`, `setGuestLineQuantity`, `removeGuestLines`, `subtractGuestLines`, `parseGuestCart`, `guestCartQuantity`, `MAX_GUEST_LINES`, `MAX_GUEST_LINE_QUANTITY`, and the `GuestCartLine` type.
- **`src/modules/cart/composables/guest-cart-storage.ts`** – The SUT for the persistence properties. Imports `readGuestCart` and `writeGuestCart`; the spec calls them against real `localStorage` (cleared in `afterEach`).
- **`src/modules/cart/tests/guest-cart-view.spec.ts`** – Sibling example spec; covers exact boundary cases this file's random generation subsumes.
- **`tests/support/unit/cart-fixtures.ts`** – Provides shared fixtures for cart-related unit tests (not directly imported here but part of the same test-support layer).

## Notes

- **Seeded & reproducible.** The fixed seed (`20_261_004`) means a failure is deterministic; see `docs/tools/property-testing.md` for the project-wide convention. Change the seed only intentionally.
- **`endOnFailure: true`** stops the run at the first shrunk counterexample, keeping the failure output short enough to paste into a regression `it()`.
- **Deliberate out-of-range inputs.** `add` quantities go to 1500 and `set` to ±2000 to confirm the domain clamps rather than the caller.
- **`fc.jsonValue()`** (arbitrary JSON of any shape) is thrown at `parseGuestCart` to prove the parser is total—never throws, always returns a valid cart.
- **`localStorage` is the real backing store** in the storage properties; `afterEach` clears it. Tests are not mocked at the storage layer.
- **Order matters for some assertions.** The merge property checks insertion order (first-added first), while `byProduct` is used where order is semantically irrelevant.
