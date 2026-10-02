---
source: src/modules/cart/tests/e2e/resilience.cy.ts
sha256: 9b146dfa7100b2a1afc9d59ffeb069f4bea49201c8d650e9c352b5ef37026f53
generated_at: 2026-10-02T15:02:05.375801+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/resilience.cy.ts

## Purpose

Cart-module contribution to the shell's end-to-end resilience sweep. Verifies that the `/en/cart` route renders without unexpected console errors and fits the viewport — both when the cart is empty and when it holds a single line item. It deliberately avoids asserting on specific values (prices, quantities beyond item count) so it catches rendering/breakage that value-focused specs would miss.

## Key elements

- **`beforeEach`** — visits `/en` (to seed the session), calls `cy.restore()` to reset state, and logs in as the `user` fixture.
- **`it('serves an empty cart quietly and inside the viewport')`** — issues `DELETE /cart/all` via `cy.apiAs`, then calls `assertRouteIsHealthy('/en/cart', '#cart-page')`.
- **`it('serves a cart holding a line quietly and inside the viewport')`** — clears the cart, fetches an in-stock product id via `cy.subjectId('product.inStock')`, adds it with `POST /cart`, then asserts route health *and* that exactly one `[data-test=cart-item]` element exists.
- **`assertRouteIsHealthy`** (imported) — the shared helper that performs the console-error / viewport-fit checks.

## Relationships

- **`tests/support/e2e/resilience.ts`** — provides `assertRouteIsHealthy`, the single import this file depends on. All resilience assertions in this file delegate to that helper.
- **`tests/e2e/specs/resilience.cy.ts`** (referenced in the doc comment, not imported) — the central resilience sweep file whose rationale this file inherits; this file is the cart-specific slice of that sweep.

## Notes

- The file intentionally does **not** assert on prices, labels, or other content values. The doc comment explains the rationale: a page can throw a `TypeError` or push content off-screen while every value-naming spec remains green. This test is the safety net for those failure modes.
- `cy.apiAs`, `cy.subjectId`, `cy.restore`, and `cy.loginAs` are custom Cypress commands defined elsewhere; they are not standard Cypress API.
- The cart item count is the **only** value assertion in this file (`have.length, 1`), kept as a minimal structural check rather than a content check.
