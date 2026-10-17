---
source: src/modules/cart/tests/expected-total.spec.ts
sha256: d15e3f72ca561a9a62d5521728e9758dd5a5daa725e482b62dac00ac6cad8a45
generated_at: 2026-10-17T00:39:56.754106+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/expected-total.spec.ts

## Purpose

Vitest spec that verifies the cart domain's money-conversion helpers (`toMinorUnits`, `fromMinorUnits`, `expectedTotalOf`) produce exact integer minor units with no floating-point drift, and that `checkoutFingerprint` generates distinct, stable identifiers from a checkout's expected total, cart lines, and shipping selection. Because the tested functions are pure, no mocks or store setup are needed.

## Key elements

- **`describe('toMinorUnits')`** — Table-driven cases confirm specific decimal→minor-unit conversions at 0, 2, and 3 decimal places. A `fast-check` property asserts correctness for *every* two-decimal amount the server could display (0–1 000 000 00), and another asserts the `toMinorUnits` / `fromMinorUnits` round-trip invariant.
- **`describe('expectedTotalOf')`** — Single case verifying that the function returns `{ amount, currency }` with shipping included (e.g. 0.56 + 0.50 → 106 minor units).
- **`describe('checkoutFingerprint')`** — Builds a minimal `CartResponse` via `asStub` and checks that the fingerprint:
  - changes when the expected total changes,
  - is stable for identical inputs,
  - degrades to `{ body: null, lines: [], shipping: null }` when both arguments are `undefined`,
  - encodes cart line `[productId, quantity]` pairs and the selected shipping method,
  - changes when any line quantity or shipping method differs.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Barrel re-export; the spec imports `checkoutFingerprint`, `expectedTotalOf`, `fromMinorUnits`, `toMinorUnits` from here.
- **`src/modules/cart/domain/expected-total.ts`** — Source of the four functions under test.
- **`src/modules/cart/domain/checkout-attempt.ts`** — Defines the `checkoutFingerprint` signature and the shape of the fingerprint it produces (body / lines / shipping).
- **`tests/support/stub.ts`** — Provides `asStub<T>()`, a shallow-clone helper used to construct minimal `CartResponse` fixtures without a full mock.

## Notes

- The file carries `@module` in its doc comment: it has **no exports** of its own.
- Property-based tests use `fast-check` (`fc.assert` + `fc.property`), not Jest/Vitest snapshot or mock utilities.
- `asStub` produces a plain object (not a class instance); tests that compare `checkoutFingerprint` output parse it with `JSON.parse`, confirming the fingerprint is a serializable string.
