# tests/e2e/specs/keyboard.cy.ts

## Purpose

Cypress E2E spec that verifies keyboard-interactive accessibility behaviours the app cannot be tested for via static axe/DOM checks: focus order, focus movement after navigation, focus trapping in overlays, and activation via real keystrokes (Tab, Enter, Space, Escape, ArrowDown). Each case guards a specific implementation in the app source that no unit test can exercise because it requires a browser-level focus traversal.

## Key elements

- **`PHONE`** — `[390, 844]` viewport constant; the iPhone 14-class size below which the nav bar collapses into the drawer.
- **`SHOWN_TOOLTIP`** — Selector (`.v-tooltip.v-overlay--active .v-overlay__content`) that matches an *active* Vuetify tooltip. Used because Cypress's visibility check misreports tooltip content (it has `pointer-events: none` and a fixed position that `elementFromPoint` can't hit).
- **`describe('keyboard', …)`** — Top-level suite; `beforeEach` visits `/en` and calls `cy.resetState()`.
  - *Skip link test* — Asserts the first focusable element in DOM order carries `.skip-link`, then presses Enter to confirm it lands on `[data-main-content]`.
  - *Focus after navigation* — Clicks a visible nav link, asserts focus moves to `[data-main-content]` and `document.title` updates.
  - *Drawer open/close* — Opens the hamburger at phone width, asserts focus enters the drawer's first entry, then `Escape` closes it and returns focus to the trigger.
  - *Bar entry naming* — Tabs to the first nav link; asserts it has no `aria-label`, non-empty visible text, and no tooltip.
  - *Pinned entry tooltip* — Uses Shift+Tab to achieve `:focus-visible`; asserts the visible tooltip text is a prefix of the element's `aria-label`.
  - *Admin menu* — `ArrowDown` opens (`aria-expanded=true`, `[role=menuitem]` present); `Escape` closes and keeps focus on the trigger.
  - *Dialog focus trap* — Triggers a cancel-confirmation dialog; Tabs 4× and asserts focus stays inside `.v-overlay--active`; `Escape` dismisses (order remains cancellable).
  - *Facet chip toggle* — `Enter` sets `aria-pressed="true"`; `Space` sets it back to `"false"`.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **`cy.realPress()` (from `cypress-real-events`) is required**, not `.type('{tab}')`. Cypress's simulated events dispatch on an element and do not trigger the browser's native focus traversal. `cypress-real-events` routes keystrokes through the Chrome DevTools Protocol, so only Chromium-family browsers work — which is what the CI `cypress run` configuration uses.
- **`:focus-visible` vs `.focus()`**: The tooltip test deliberately uses `realPress('Tab')` then `realPress(['Shift','Tab'])` rather than `.focus()` because the tooltip binds to `:focus-visible`, which a script-initiated focus does not set.
- **First-Tab assertion is DOM-order, not keystroke-based**: Pressing Tab from a fresh `cy.visit()` first lands on the Cypress runner's iframe boundary. The test instead queries all focusable elements and checks `.first()`.
- **`cy.orderInRole('cancellable')`** (used in the dialog test) is a custom command that selects an order whose status makes the cancel button — and therefore the confirmation dialog — available.
- The file intentionally avoids `aria-label` on visible-text nav entries (WCAG 2.5.3) and asserts that absence as a test condition.
