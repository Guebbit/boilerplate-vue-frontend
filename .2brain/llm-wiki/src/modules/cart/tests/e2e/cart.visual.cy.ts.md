---
source: src/modules/cart/tests/e2e/cart.visual.cy.ts
sha256: 3232a8ad014862e706d496f2e22c01b69e8b120025defc70a0c73a7939d86594
signature: 43907e235c978fa01001033e9356d84504f81edb3941c4c92c050761531d0b40
generated_at: 2026-11-10T04:04:49.833089+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/cart.visual.cy.ts

## Purpose

Declares the visual-regression scenes for the cart screen. The actual sweep logic lives in the shared helper; this file is purely a declarative list of routes, viewports, themes, and prep steps to photograph. Baselines (PNGs) are stored in `__snapshots__/` alongside this file so that deleting the module also deletes its captures.

## Key elements

- **`cartWithOneLine()`** – `Cypress.Chainable<string>` factory. Clears the authenticated user's cart via `DELETE /cart/items`, picks an in-stock product, adds one unit via `POST /cart/items`, then yields the route path `/en/cart`. Ensures the first paint already shows a single line item.
- **`sweepVisual('cart', [...], 'user')`** – Top-level call into the shared sweep runner. The scenes array captures:
  - `cart` – default page at `#cart-page`.
  - `cart, one line` (phone) – stacked layout with one item.
  - `cart, one line` (phone, dark theme) – same scene, dark palette.
  - `cart, checkout` (phone) – scrolls to `[data-test=cart-summary]` to expose address, payment, and checkout button.
  - `cart, clear confirm` (phone) – clicks the clear button and waits for the fullscreen `app-dialog`.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** – Provides the `sweepVisual` function imported at the top of this file. All screenshot orchestration (viewport cycling, waiting for readiness, naming baselines) is delegated to that helper; this file only supplies configuration.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** – Sibling test in the same module directory; no code-level interaction. Both exercise cart behavior but through different strategies (property-based unit vs. visual e2e).

## Notes

- This file is **excluded from `npm run complete`**. Run it explicitly: `npm run test:e2e:visual`.
- Re-recording baselines (`npm run test:e2e:visual:update`) is expected only after visually inspecting the diff image. Blind re-recording is called out in the header as the single worst failure mode for the suite.
- All non-default scenes are phone-viewport because the cart layout stacks vertically below the desktop breakpoint; desktop adds no new visual structure worth a separate baseline.
- The `theme: 'dark'` key is an extension to the default scene object; it is consumed by `sweepVisual`, not by any component in this file.
