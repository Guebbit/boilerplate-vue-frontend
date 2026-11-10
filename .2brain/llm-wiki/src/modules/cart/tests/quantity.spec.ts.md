---
source: src/modules/cart/tests/quantity.spec.ts
sha256: 5770b28bbdbf7e84424db8e41f0e5d84005b6f7ab15e476880aa7b7951a13fa5
signature: 5770b28bbdbf7e84424db8e41f0e5d84005b6f7ab15e476880aa7b7951a13fa5
generated_at: 2026-11-10T04:09:18.644302+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/quantity.spec.ts

## Purpose

Unit tests for the `steppedQuantity` pure function from the cart domain. They verify that quantity stepping behaves correctly at the boundaries defined by the OpenAPI contract (`minimum: 1`), particularly that the function clamps rather than allowing a line quantity to drop to zero or below. The file exists as a guard against the module's internal floor constant drifting out of sync with the API contract.

## Key elements

- **`describe('steppedQuantity', …)`** — single test suite covering five scenarios:
  - *steps up* — positive delta increments the quantity.
  - *steps down* — negative delta decrements the quantity.
  - *clamps at the floor instead of reaching zero* — `steppedQuantity(1, -1)` returns `1`, not `0`.
  - *clamps however far the step overshoots* — a large negative delta (`-50`) still lands on `1`.
  - *lifts a line that is already below the floor* — a pre-existing `0` value is raised back to `1`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — the barrel file from which `steppedQuantity` is imported (`import { steppedQuantity } from '../domain'`).
- **`src/modules/cart/domain/quantity.ts`** — the module that actually defines `steppedQuantity` (and the `MIN_LINE_QUANTITY` constant). This spec does not import the constant directly; it hard-codes `1` to track the OpenAPI `minimum` instead.

## Notes

- The floor assertions use the literal `1` (the value in `openapi.yaml`), **not** `MIN_LINE_QUANTITY`. This is deliberate: if the constant is ever changed without a contract change, these tests fail.
- The doc comment notes the clamp is tested via the function's return value, not via a separate predicate or a `disabled` attribute on `SignedInCart.vue`. The double-click race that lets a second click land before the guard updates is the motivating scenario.
- No Pinia, no component mount, no HTTP — purely a function-in / number-out test, so it runs fast and isolates the rule from UI state.
