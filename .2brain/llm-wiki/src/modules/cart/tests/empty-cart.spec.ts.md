---
source: src/modules/cart/tests/empty-cart.spec.ts
sha256: 5980b1147fd34536f68eae9edee397aaafeb0106446ae30dd5eaf095ca5da6cd
signature: 5980b1147fd34536f68eae9edee397aaafeb0106446ae30dd5eaf095ca5da6cd
generated_at: 2026-11-10T04:05:16.696993+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/empty-cart.spec.ts

## Purpose

Vitest spec for the `emptyCart` factory: verifies that the cart a successful checkout produces is structurally correct (all counts zeroed, no shipping options, not checkoutable) and that the currency/zero-string the caller passes in is faithfully preserved at every monetary field.

## Key elements

- **`describe('emptyCart')` block** — two `it` cases:
  - *Full-shape assertion (EUR):* calls `emptyCart('EUR', '0.00')` and `toEqual`s the entire returned object — empty `items` array, zeroed summary fields, `shipping.required === false` with no options, `checkoutable === false`.
  - *JPY zero-passthrough:* calls `emptyCart('JPY', '0')` and asserts that `itemsTotal`, `shippingCost`, and `totalPrice` are all the literal string `'0'`, confirming the function does not reformat the zero it receives.

## Relationships

- **`src/modules/cart/domain/empty-cart.ts`** — the function under test; this spec imports `emptyCart` from the domain barrel (`../domain`).
- **`src/modules/cart/domain/index.ts`** — the barrel that re-exports `emptyCart`; the test imports through this barrel rather than the module directly.

## Notes

- The second test exists specifically to guard against a "normalise to two decimals" side effect: JPY has no sub-unit, so the zero must remain `'0'`, not become `'0.00'`. If you change how money fields are formatted, this test is the tripwire.
- The test imports via the barrel (`../domain`), not the concrete file. Adding a new export to `empty-cart.ts` without re-exporting it in `index.ts` would not be caught here.
