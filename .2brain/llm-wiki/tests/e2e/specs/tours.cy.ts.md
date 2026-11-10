---
source: tests/e2e/specs/tours.cy.ts
sha256: cca4e9d222ef1203ced9ae8154ea53803b1f2d68299c57b8f09287d7671083e6
signature: cf2f09ea5294eb133826ac716ab1e66ad28b8dd674f86c16a0101efd3cc138fd
generated_at: 2026-11-10T07:25:19.534596+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/tours.cy.ts

## Purpose

Cypress E2E spec that exercises the guided-tour feature in a browser: verifying the welcome tour appears on first sight of an account, can be skipped and stays closed, reopens from the account menu, and that page-specific tours open via the `?tour=` query parameter (and the parameter is stripped). It exists because every other spec in the suite runs with tours disabled globally, so this is the only place the feature is tested.

## Key elements

- **`POPOVER` / `POPOVER_CLOSE`** — CSS selectors for driver.js's popover container (`.driver-popover`) and its close (×) button (`.driver-popover-close-btn`). Every assertion about tour visibility targets these.
- **`visitWithTours(path)`** — Thin wrapper around `cy.visit` that injects `__APP_CONFIG.TOURS_ENABLED = 'true'` on the window during `onBeforeLoad`, overriding the global "tours off" flag set by the shared support layer.
- **`describe('Guided tours', …)`** — Top-level suite. Its `beforeEach` visits `/en`, calls `cy.restore()`, revisits, and signs in with `cy.loginAs('user')` (tours still off during sign-in).
- **Four test cases:**
  1. *opens the welcome tour on first sight, and stays closed once skipped* — asserts popover appears, closes it, then asserts a second `visitWithTours` does not bring it back.
  2. *reopens from the account menu* — closes the welcome tour, clicks through `[data-test=user-menu]` → `[data-test=show-tour]`, verifies the popover reappears.
  3. *opens a page tour from `?tour=` and removes the parameter* — adds a product to the cart, then visits `/en/cart?tour=checkout`; asserts the checkout tour popover shows and the `tour=` param is stripped from the URL.
  4. *ignores a tour id it does not know* — visits `/en?tour=nonsense`; asserts no popover appears and the param is still removed.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **Tours are globally off in the suite.** `support/e2e/commands.ts` sets `TOURS_ENABLED: 'false'` in a `window:before:load` hook for every spec. This file's `visitWithTours` uses `onBeforeLoad`, which Cypress runs *after* that hook, so it overrides the flag per-visit without touching shared state.
- **`TOURS_ENABLED` is a string** (`'true'` / `'false'`), not a boolean — set via the `__APP_CONFIG` object on `window`.
- **driver.js** is the underlying tour engine; the only DOM the tests interact with is its popover.
- Custom commands used here (`cy.step`, `cy.loginAs`, `cy.navigateTo`, `cy.filterByNarrowestCategoryOf`, `cy.restore`) are defined in the `support/e2e/` layer, not in this file.
- The `// requires-module: account, cart, products` comment at the top indicates which application modules this spec depends on (likely used by a test-runner or dependency tool).
