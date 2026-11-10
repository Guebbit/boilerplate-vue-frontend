---
source: src/modules/cart/tests/e2e/actions.cy.ts
sha256: a93320f6aa094f553276e2c2cbc931df15a87ff232e8ab6c7a8cca7bf42a6ace
signature: a93320f6aa094f553276e2c2cbc931df15a87ff232e8ab6c7a8cca7bf42a6ace
generated_at: 2026-11-10T04:04:15.521384+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/actions.cy.ts

## Purpose

Declares two end-to-end failure scenarios for the cart module via the shared `actionTable` runner. Each scenario verifies that when a server fault occurs during a cart mutation (line removal, add-to-cart), the UI keeps the relevant row/button in place, displays a specific error alert, and that a retry succeeds. The file is side-effect-only; it has no exports.

## Key elements

- **`actionTable('cart', [ … ])` call** — Registers two test definitions under the `"cart"` scope:
  - **Failed line removal** — Prepares a single cart line (deletes existing, adds `product.inStock`), waits for shipping-method options to render (`prepare`), clicks the first `[data-test=cart-remove]` button, intercepts the `DELETE /cart/items/{productId}` request, and asserts the `[data-test=cart-item]` row remains listed alongside the `cart-line-action-error` alert ("The removal failed").
  - **Failed add-to-cart** — Navigates to a product page, clicks `[data-test=add-to-cart]`, intercepts the `POST /cart/items` request, and asserts the `[data-test=add-to-cart]` button remains alongside the `add-to-cart-error` alert ("The add failed").
- Both cases use `kind: 'row'`, `persona: 'user'`, and supply `route`, `trigger`, `intercept`, `alert`, `message`, and `listed` fields consumed by the runner.

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` runner. This file is a pure caller: it supplies the scenario definitions (route, trigger, intercept, expected alert/message/selector) and the runner is responsible for executing the failure-injection loop, asserting the listed selector persists, checking the alert, and performing the retry. No other local imports exist.

## Notes

- The first case includes a `prepare` step that waits for `[data-test=shipping-method-standard]` to exist before the trigger fires. This is because shipping methods load asynchronously after cart lines render, and the typed assertions (handled by the runner) read values only once both are present. Without this guard, the trigger could race the async load.
- The `route` functions use `cy.subjectId('product.inStock')` to obtain a stable fixture id rather than hard-coding one.
- Intercepts use wildcard URLs (`**/cart/items/*`, `**/cart/items`) plus an `operation` identifier, which the runner matches against the fault-injection stub.
