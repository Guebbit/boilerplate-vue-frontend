---
source: src/modules/cart/tests/quantity.spec.ts
sha256: 2e5f8d05346ce1fa70a4a5dc7bf7a8fc9e46bfcae5c2cdb5bb115c9567e7f6b1
generated_at: 2026-10-17T00:42:13.242433+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/quantity.spec.ts

## Purpose

Vitest unit tests for the `steppedQuantity` domain rule. The tests assert the rule's contract (step arithmetic and floor clamping) in isolation—no component rendering, no Pinia store, no HTTP—so a regression in the rule's logic is caught without a DOM.

## Key elements

- **`describe('steppedQuantity', …)`** — single suite covering every branch of the function:
  - `steps up` — positive step increments the quantity.
  - `steps down` — negative step decrements the quantity.
  - `clamps at the floor instead of reaching zero` — `steppedQuantity(1, -1)` must return `1`, not `0`. The expected value is the literal `1` (matching `openapi.yaml` `minimum: 1`), deliberately **not** the module's `MIN_LINE_QUANTITY` constant, so a drift between the two would fail the test.
  - `clamps however far the step overshoots` — a large negative step (e.g. `-50`) still lands on `1`.
  - `lifts a line that is already below the floor` — defensive guard: a quantity already at `0` is raised back to `1`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — the barrel from which `steppedQuantity` is imported (`import { steppedQuantity } from '../domain'`). Tests exercise the public re-export, not the internal module path.
- **`src/modules/cart/domain/quantity.ts`** — defines `steppedQuantity` (and presumably `MIN_LINE_QUANTITY`). This file is the sole SUT; no other symbols from it are tested here.

## Notes

- The floor value is asserted as the **literal `1`**, not `MIN_LINE_QUANTITY`. This is intentional: if the constant is changed to `2` while `openapi.yaml` still says `minimum: 1`, the test should fail. Don't "fix" the test to use the constant.
- The doc comment explicitly frames these tests as statements about the *rule*, not about a `disabled` attribute on `Cart.vue`. Component-level guard tests belong elsewhere.
- The `double-click` scenario (rapid consecutive decrements) is the real-world motivation for the clamp tests; the guard in `Cart.vue` is the first line of defence, `steppedQuantity` is the backstop.
