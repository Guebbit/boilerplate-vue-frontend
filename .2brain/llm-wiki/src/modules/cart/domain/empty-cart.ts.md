---
source: src/modules/cart/domain/empty-cart.ts
sha256: 7cf3c84a89cde8ec7d5919c66b0b423f6a01074765c2f7a86ff8d807e029617d
signature: 0c7ae7fb3dfca38fa4872e587d7f564079ad86427275cfe6c0e636b6f551641d
generated_at: 2026-11-10T03:57:06.469724+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/empty-cart.ts

## Purpose

Provides a single pure function that constructs the exact `CartResponse` shape the server returns after a successful checkout empties the cart. It exists so the local store can synchronously update its state to the known-empty shape without an extra network round-trip or guessing the response.

## Key elements

- **`emptyCart(currency: string, zero: string): CartResponse`** — The sole export. Returns an object with `items: []`, a zeroed `summary` (counts and monetary fields set to the caller-supplied `zero` string, `currency` preserved), `shipping: { required: false, options: [] }`, and `checkoutable: false`. Takes the zero string as a parameter so currency-specific formatting (e.g. `"0.00"` vs `"0"`) is decided by the caller, not hardcoded here.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel file; re-exports `emptyCart` so other modules can import it via the domain path.
- **`src/modules/cart/store.ts`** — Consumes `emptyCart` to set local cart state immediately after a successful checkout response, avoiding a redundant re-fetch.
- **`src/modules/cart/tests/empty-cart.spec.ts`** — Unit tests covering the shape and parameterization of the returned object.

## Notes

- The `zero` parameter is intentionally a string (not a number) because `CartResponse` monetary fields are formatted strings. Callers must pass the correct representation for the active currency.
- This function never reads external state; it is a pure shape factory. All variability is injected via arguments.
