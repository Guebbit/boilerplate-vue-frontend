---
source: tests/e2e/specs/journeys/cu4b-a-slow-opening-cart-read.cy.ts
sha256: b683280b2824eef9916c5f023c28f1f018a7ff6fe57cf115dabb90debdccd0fd
generated_at: 2026-10-17T02:13:44.020127+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu4b-a-slow-opening-cart-read.cy.ts

## Purpose

E2E test verifying that the cart page correctly handles a race between the initial `GET /cart` read (triggered by opening the cart page) and a `PUT /cart/shipping-method` pick. Two response-ordering scenarios are covered: the read landing *after* the pick is confirmed, and the read landing *before* the pick's answer. In both cases the shipping-method radio must reflect the server's value and the checkout button must remain enabled.

## Key elements

- **`holdAnswers(method, url, alias, delayMs)`** — Intercepts a request, lets it reach the real backend, then delays the response by `delayMs` via `response.setDelay()`. Returns the Cypress alias for later `cy.wait`.
- **`describe('CU4b · A slow cart read around a shipping pick')`** — Top-level suite; `beforeEach` visits `/en`, runs `cy.restore()` to clear stubs, and revisits.
- **Test 1 – "keeps the delivery method picked while the opening read was still out"** — Adds `product.rich` to cart, delays `GET **/cart` by 2 s, navigates to cart, clicks the pickup radio, then waits for the delayed read and asserts the radio is still checked and checkout is not disabled.
- **Test 2 – "keeps the pick when the read answers first, with no method, and the pick answers last"** — Delays both the read (1 s) and the pick (3 s); asserts the radio survives the early read *and* the later pick, and checkout stays enabled.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `addToCartFromStorefront`, which drives the storefront UI to add a product to the cart before the cart page is opened.

## Notes

- Responses are **not** mocked; `holdAnswers` only adds latency so the real backend still answers. Do not replace with `cy.server()`/`cy.route()` stubs without understanding the intent.
- `cy.restore()` in `beforeEach` is required to clear any lingering intercepts from previous specs or earlier tests in the same run.
- The file depends on custom Cypress commands (`cy.loginAs`, `cy.goToCart`, `cy.step`) and on the `product.rich` fixture; these are not defined here.
- The `// requires-module:` header comment lists the backend modules this journey exercises (account, cart, inventory, products) for CI/CD scoping.
