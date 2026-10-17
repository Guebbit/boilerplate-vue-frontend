---
source: tests/e2e/specs/journeys/fr13-a-slow-network.cy.ts
sha256: eaecb6f4b3216d180743b7722ee33fdc24b34b25caea6adb768898f59b0ef8f6
generated_at: 2026-10-17T02:15:46.524350+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr13-a-slow-network.cy.ts

## Purpose

E2E journey test for FR13 ("A slow network"). Verifies that every user-facing control (add-to-cart, wishlist toggle, cart quantity steppers, invoice buttons) correctly signals a busy state (disabled + corner activity indicator), sends exactly one request even under rapid interaction, and still delivers a debounced step to the server when the user navigates away before the debounce window closes.

## Key elements

- **`slow(method, pattern, alias)`** — Registers a `cy.intercept` that holds the *response* for `SLOW_MS` (1500 ms), so the UI can be asserted in its in-flight state. The alias is used for `cy.wait` and `@alias.all` call-count assertions.
- **`SLOW_MS`** (1500) — How long every intercepted response is delayed; long enough to assert busy state inside the window.
- **`expectIdle()` / `expectBusy()`** — Assert the `[data-test=activity-indicator]` element is `display:none` or `display:block` respectively, isolating the action's own indicator from residual fades.
- **`firstLineQuantity()`** — Extracts the numeric quantity from the first cart line's `[role=status]` text.
- **`INDICATOR`** — Selector constant for the corner activity indicator.
- **`describe('FR13 · A slow network')`** — Single `it` block covering four scenarios in sequence: add-to-cart, wishlist unsave, quantity-stepper debounce + navigation, and invoice download (view/download buttons both disable; `window.open` stubbed and called once).

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `searchAndOpenProduct` to navigate from the product listing to the `product.rich` detail page. The `cy.step`, `cy.loginAs`, `cy.goToCart`, `cy.navigateTo`, `cy.subjectId`, and `cy.stubWindowOpen` commands are also sourced from this support layer (custom Cypress commands registered globally via the same module).

## Notes

- The delay is applied to the **response**, not the request: `request.on('response', …)` → `response.setDelay(SLOW_MS)`. The backend work is complete by the time the page learns of it.
- The debounce scenario relies on a **400 ms** client-side debounce window (not in this file). Two stepper clicks plus a header-nav click are batched into one `Task` so the navigation fires within that window; the test then asserts exactly one `PUT **/cart/*` arrived with `quantity = before + 2`.
- `beforeEach` visits `/en`, calls `cy.restore()`, then visits again — a fixture-reset pattern to start each test from a clean seeded state.
- The file header comment explicitly notes what is **not** tested here: "reload with a step still in the debounce window" — a product reload is FR4 territory, and nothing flushes on `pagehide` today.
- `cy.stubWindowOpen()` (from the support layer) replaces `window.open` so the invoice PDF download is asserted via `@windowOpen` call count rather than a real navigation.
