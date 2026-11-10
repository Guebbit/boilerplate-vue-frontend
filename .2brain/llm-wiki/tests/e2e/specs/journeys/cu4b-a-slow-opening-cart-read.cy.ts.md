---
source: tests/e2e/specs/journeys/cu4b-a-slow-opening-cart-read.cy.ts
sha256: b683280b2824eef9916c5f023c28f1f018a7ff6fe57cf115dabb90debdccd0fd
signature: 9c056dbab9cfff8a7e386fe8070c28c7af369e65d55c2e24c873a9e2fa990d07
generated_at: 2026-11-10T07:01:16.531784+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu4b-a-slow-opening-cart-read.cy.ts

## Purpose

E2E journey test for the "CU4b" scenario: a customer opens the cart page via the app bar (route change, not reload) and picks a shipping method while the initial `GET /cart` read is still in flight. Verifies that the radio button reflects the server's current state and the checkout button stays enabled, regardless of which response (read vs. pick) arrives last.

## Key elements

- **`holdAnswers(method, url, alias, delayMs)`** – Local helper that intercepts a matching request and sets a response delay via `response.setDelay()`, then aliases it for `cy.wait()`. Not exported.
- **`describe('CU4b · A slow cart read around a shipping pick')`** – Suite containing two tests:
  - *read slower than the pick*: 2 s delay on `GET **/cart`; user clicks the pickup radio before the read resolves; asserts radio stays checked and checkout is enabled after the read lands.
  - *pick slower than the read*: 1 s delay on the read, 3 s delay on `PUT **/cart/shipping-method`; asserts the radio does not uncheck when the (stale) read arrives first, then confirms it is still checked once the pick's response finally lands.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()` (reset state), visits `/en` again to get a clean page.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports `addToCartFromStorefront` to seed a cart via the storefront flow before navigating to the cart page. This is the sole dependency on a graph-neighbor file.

## Notes

- The `requires-module: account, cart, inventory, products` comment indicates this spec depends on four backend services being available; the backend is **not** mocked—only response timing is artificially slowed.
- `holdAnswers` intercepts and delays the real response rather than stubbing a body, so the assertion logic tests genuine server payloads.
- The two tests cover complementary race orders (read-last vs. pick-last); both assert on `[data-test=shipping-method-pickup] input` and `[data-test=cart-checkout]` selectors.
- Delays are generous (1 000–3 000 ms) to avoid flakiness from timing-sensitive assertions.
- The spec also calls several custom Cypress commands (`cy.loginAs`, `cy.goToCart`, `cy.step`, `cy.restore`) registered elsewhere in the support layer.
