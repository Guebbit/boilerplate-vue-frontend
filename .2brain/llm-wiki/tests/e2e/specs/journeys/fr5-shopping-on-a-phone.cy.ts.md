---
source: tests/e2e/specs/journeys/fr5-shopping-on-a-phone.cy.ts
sha256: 17047c3e5c454ab2dc50e8b0bd52fa63b13365980c2293749179036f7b6bbbf5
signature: 8e80f1f4fa8401028acfb8c5a923e16c786d8e34f8217180bcfa2d0b73679c0a
generated_at: 2026-11-10T07:07:21.666732+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr5-shopping-on-a-phone.cy.ts

## Purpose

End-to-end journey test (FR5) that validates a full mobile shopping flow — guest sign-in via drawer menu, product purchase by card with a new address added mid-checkout, and logout — at a 390 × 844 touch-screen viewport. It exists to guarantee that every step of the purchase is reachable and fits on a small phone screen without horizontal scroll or off-screen dialogs.

## Key elements

- **`DRAWER`** (`'#app-drawer'`) — constant for the mobile navigation drawer element; referenced via `aria-controls` on the hamburger button.
- **`openDrawer()`** — taps the hamburger and asserts the drawer is visible.
- **`dismissToasts()`** — closes all `.v-alert` toasts (which would otherwise stack over drawer links on a phone) and asserts none remain.
- **`fitsTheScreen(step)`** — calls `cy.checkLayout` with `viewport: 'phone'` and checks for `overflow`, `overlay-fit`, and `clipped` elements; the `step` string labels the state in test reports.
- **`describe('FR5 · Shopping on a phone')`** — single `it` block covering: guest drawer links → sign in → customer drawer sections → product discovery → cart/checkout with new address → card payment → logout via drawer.

## Relationships

- **`tests/support/e2e/apply-viewport.ts`** — `applyViewport('phone')` in `beforeEach` sets the 390 × 844 viewport and touch-pointer emulation for the entire spec.
- **`tests/support/e2e/steps.ts`** — provides `openProductCard`, `addOpenProductToCart`, and `fillAddressDialog`, shared multi-step helpers for the product-page and address-dialog interactions.

## Notes

- All user interactions use `.tap()` rather than `.click()` to emulate a finger-sized pointer with no hover states.
- `beforeEach` visits `/en`, calls `cy.restore()`, then visits `/en` again — a double-visit pattern to reset app state between runs.
- After the logout tap, the test must wait for the drawer to become invisible *before* reopening it; a premature tap would toggle the drawer shut again (noted in an inline comment).
- The test requires the `account`, `cart`, `delivery`, `inventory`, `orders`, `payments`, and `products` modules (declared via `requires-module` comment) and uses a seeded `user` account so no real mailbox is needed.
- Relies on a custom `cy.checkLayout` command (not part of standard Cypress) for the per-element layout assertions.
