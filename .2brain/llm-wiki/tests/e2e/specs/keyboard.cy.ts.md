---
source: tests/e2e/specs/keyboard.cy.ts
sha256: cb671901d6fc14582f65408c48c1313a9b758203bc3dc091a45906ef44d55343
signature: cb671901d6fc14582f65408c48c1313a9b758203bc3dc091a45906ef44d55343
generated_at: 2026-11-10T07:23:20.416386+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/keyboard.cy.ts

## Purpose

E2e spec that verifies keyboard-driven accessibility behaviours of the app shell—Tab order, focus trapping, focus restoration, and Escape handling—things that a static axe sweep cannot observe because they require real key events. Every case targets a specific focus/keyboard behaviour implemented in a shell component (`LayoutDefault.vue`, `AppNavigation.vue`, `DialogHost.vue`, etc.) that no unit test can exercise.

## Key elements

- **`SHOWN_TOOLTIP`** – CSS selector (`.v-tooltip.v-overlay--active .v-overlay__content`) for asserting Vuetify tooltip visibility; used because `pointer-events: none` makes Cypress's visibility check misread the overlay as hidden.
- **`describe('keyboard', …)`** – The single top-level suite. Each `it` block covers one contract:
  - *Skip link first-Tab* – DOM-order check that the first focusable element is `[data-test=skip-link]`, then Enter moves focus to `[data-main-content]`.
  - *Page-change focus & title* – Router `afterEach` moves focus to main and updates `document.title`; live region (`[data-test=route-announcer]`) re-announces on revisit.
  - *Drawer open / Escape close* – Focus enters drawer's first entry on open, returns to hamburger on Escape.
  - *Bar entry naming* – Second Tab stop is a `nav a` with non-empty visible text and no `aria-label`; no tooltip.
  - *Pinned-entry tooltip on focus* – Tab → Shift+Tab triggers `:focus-visible`, opening the tooltip whose text starts with the entry's `aria-label`.
  - *Admin menu ArrowDown / Escape* – `aria-expanded` flips; focus moves into `[role=menu]`; Escape returns focus to the trigger.
  - *Language switcher ArrowDown / Escape* – Same pattern as admin menu.
  - *Confirmation-dialog focus trap* – Repeated Tab stays inside `.v-overlay--active`; Escape declines (dialog disappears, list remains).

## Relationships

- **`tests/support/e2e/apply-viewport.ts`** – Imported as `applyViewport`; called in the drawer test (`applyViewport('phone')`) to resize the viewport to the phone breakpoint before asserting the drawer interaction.

## Notes

- **`cy.realPress()` (cypress-real-events), not `.type('{tab}')`** – Dispatched Tab events do not trigger the browser's native focus traversal; real keystrokes go through the Chrome DevTools Protocol. This limits the spec to Chromium-family browsers, which is what `cypress run` uses in CI.
- **`cy.freezeAnimations()`** – Called before asserting post-transition states (tooltip, admin menu) to avoid racing Vuetify's transition animations, especially under the CPU contention of four parallel e2e shards.
- **Skip-link "first Tab" is asserted via DOM order**, not by pressing Tab from a fresh `cy.visit`, because the first real Tab lands on Cypress's runner iframe boundary before entering the page.
- **Pinned-entry tooltip uses Tab → Shift+Tab** rather than `.focus()` to trigger `:focus-visible`, which script-driven `.focus()` does not set.
- **Dialog test uses `/en/users`** rather than a shop-owned destructive action because the users page reliably seeds multiple rows (and thus a visible delete button) under the demo profile, exercising the same `DialogHost.vue` overlay.
