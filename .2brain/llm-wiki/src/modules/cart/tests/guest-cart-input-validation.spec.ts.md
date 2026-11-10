---
source: src/modules/cart/tests/guest-cart-input-validation.spec.ts
sha256: cb036e6f56f1da7d6246dfe83fa533b71b5ce1137c438ab8d6ad27ca8ebed02f
signature: 3d38ab8743c7200a0371dfe481a1983fd240236ad504963622f84c88f079452c
generated_at: 2026-11-10T04:05:36.374530+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-input-validation.spec.ts

## Purpose

Property-based test suite that verifies the guest cart's quantity rules hold for **every** numeric input a caller might supply—`NaN`, `Infinity`, `-Infinity`, `0`, `-0`, and arbitrary doubles. It guards two invariants: `setGuestLineQuantity` always yields a line whose quantity is within `[1, MAX_GUEST_LINE_QUANTITY]`, and `addGuestLine` never produces a line that storage would silently drop on the next read.

## Key elements

- **`RUN`** — Frozen config object: `{ seed: 20_261_004, endOnFailure: true }`. Passed to every `fc.assert` call for reproducible shrinking and to stop on the first counterexample.
- **`anyNumber()`** — fast-check generator wrapping `fc.double()` with `fc.constantFrom(NaN, Infinity, -Infinity, 0, -0)`. Ensures special values appear frequently enough to be meaningful.
- **`afterEach`** — Clears `localStorage` so each property-based case starts from a clean storage state.
- **`describe('a quantity that is not a sensible number')`** — Three property tests:
  - *set stays in range* — asserts `line.quantity ∈ [1, MAX_GUEST_LINE_QUANTITY]` for any input.
  - *set survives a storage round-trip* — writes via `writeGuestCart`, reads via `readGuestCart`, expects the line to still exist.
  - *add produces only readable lines* — writes the result of `addGuestLine` and asserts `readGuestCart()` returns exactly those lines.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel import source for `MAX_GUEST_LINE_QUANTITY`, `addGuestLine`, and `setGuestLineQuantity` (the functions under test).
- **`src/modules/cart/domain/guest-cart.ts`** — Concrete implementation of the quantity-clamping and line-adding logic exercised by every assertion.
- **`src/modules/cart/guest-cart-storage.ts`** — Provides `readGuestCart` / `writeGuestCart`, used in the two round-trip tests to confirm no line is silently discarded on persistence.

## Notes

- The generator explicitly enumerates special numeric values because `fc.double()` hits `NaN`/`±Infinity` with negligible frequency; relying on the default generator would likely never exercise those paths.
- Tests depend on `localStorage` being available (browser or jsdom environment); the `afterEach` clear is mandatory to avoid cross-test contamination from the round-trip cases.
- The fixed seed makes failures reproducible but also means the generated values are deterministic—changing the domain logic may not surface a regression unless the seed is rotated.
