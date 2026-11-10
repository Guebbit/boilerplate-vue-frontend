---
source: tests/e2e/specs/journeys/fr13-a-slow-network.cy.ts
sha256: d99f9b15de4c9ea9b1b1d247d57536a626cad16c51e66beba1925ece28209945
signature: 36b70dd0bbaf7e18e1eaf3957529c92ace42e2f60a4942e4580ddc5040c2ba6f
generated_at: 2026-11-10T07:04:37.257809+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr13-a-slow-network.cy.ts

## Purpose

End-to-end journey test for **FR13 (a slow network)**. Verifies that every shopper-facing control (add-to-cart, wishlist toggle, cart quantity steppers, invoice buttons) displays a visible busy state while a response is pending, that a rapid double-click produces exactly one request, and that a debounced cart-quantity change still reaches the server even when the user navigates away inside the debounce window.

## Key elements

- **`SLOW_MS`** (1500) – injected response delay, long enough to assert the busy state mid-flight.
- **`slow(method, pattern, alias)`** – registers a `cy.intercept` that calls `response.setDelay(SLOW_MS)` and assigns a wait alias; also enables `@alias.all` for call-counting.
- **`expectBusy()` / `expectIdle()`** – assert the `[data-test=activity-indicator]` is `display: block` / `display: none` respectively.
- **`firstLineQuantity()`** – reads the numeric quantity out of the first `[data-test=cart-item]` `[role=status]` text.
- **`describe` / single `it` block** – one long test that walks four sub-scenarios in sequence:
  1. Add-to-cart: button disables, indicator lights, exactly one POST.
  2. Wishlist toggle (unsave): same pattern with a DELETE.
  3. Cart quantity: clicks increase twice *and* navigates to `/en/products` inside a single task tick (400 ms debounce); asserts one PATCH carrying `before + 2`, then re-enters the cart to confirm server state.
  4. Invoice: view button click disables both view and download buttons; asserts the stubbed `windowOpen` (`@windowOpen`) was called once and a single GET.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `searchAndOpenProduct` to navigate from the product listing to a specific product detail page.

## Notes

- **Delay is on the response, not the request** (`response.setDelay`), so the backend has already finished work by the time the UI is told; the test simulates a "server did the work, answer is late" scenario.
- The quantity-stepper test deliberately performs two clicks **and** a navigation click within a single DOM task (via `then` on the button element) to guarantee all three land inside the 400 ms debounce window.
- `beforeEach` calls `cy.visit('/en') → cy.restore() → cy.visit('/en')` to reset session/state between runs.
- Custom commands used (defined in support, not visible here): `cy.step()`, `cy.loginAs()`, `cy.navigateTo()`, `cy.goToCart()`, `cy.subjectId()`, `cy.stubWindowOpen()`, `cy.restore()`.
- Header comment `// requires-module: cart, orders, products, wishlist` signals which feature slices must be present for the test to pass.
- The "reload with a step still in the debounce window" case is explicitly **out of scope** per the module docstring (nothing flushes on `unload` today).
