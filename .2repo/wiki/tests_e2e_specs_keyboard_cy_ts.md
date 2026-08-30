# tests/e2e/specs/keyboard.cy.ts

## Purpose

Cypress E2E spec that verifies keyboard accessibility behaviours (Tab order, focus management, focus trapping, Escape semantics) that static analysis tools like axe cannot observe because they cannot press a key. Each case exercises a real keystroke through Chrome DevTools Protocol to confirm the shell's keyboard contract holds.

## Key elements

- **`PHONE`** — `[390, 844]` viewport dimensions for mobile/drawer tests (iPhone 14-class portrait, the breakpoint below which nav collapses).
- **`SHOWN_TOOLTIP`** — CSS selector (`.v-tooltip.v-overlay--active .v-overlay__content`) for detecting an active Vuetify tooltip; used because `pointer-events: none` makes Cypress treat the overlay as "covered."
- **`describe('keyboard', …)`** — seven `it` blocks:
  - *Skip link first Tab* — asserts DOM-order first focusable is `.skip-link` and that Enter lands on `[data-main-content]`.
  - *Focus after navigation* — verifies router `afterEach` moves focus to main and updates `<title>`.
  - *Drawer open/Escape* — focus enters drawer on open, Escape returns focus to the hamburger.
  - *Tooltip on focus* — real Tab to an icon-only nav entry; asserts tooltip text matches `aria-label`.
  - *Menu ArrowDown / Escape* — opens admin menu with ArrowDown, closes with Escape, focus stays on trigger.
  - *Dialog focus trap* — Tab wraps within `.v-overlay--active`; Escape declines (order remains cancellable).
  - *Facet chip toggle* — Enter and Space flip `aria-pressed` on a category chip.

## Relationships

- **`src/app/layout/LayoutDefault.vue`** — provides the skip link and the `[data-main-content]` focus target that the first two tests assert against.
- **`src/app/components/AppDialogHost.vue`** — renders the confirmation dialog whose focus trap and Escape-escape are exercised by the "keeps focus inside the confirmation dialog" test.
- **`src/app/components/AppNavIconButton.vue`** — the icon-only nav entries whose `:focus-visible` tooltip is verified in the tooltip test.
- **`src/app/components/AppNavMenu.vue`** — the admin menu opened via `ArrowDown` and closed via `Escape` in the menu test.
- **`src/modules/products/views/ProductsList.vue`** — renders the `[data-test=category-chip]` facet chips toggled by Enter/Space.
- **`package.json`** — supplies `cypress-real-events` (the `cy.realPress` / `cy.realClick` API used throughout) and the Cypress runner configuration.
- **`docs/tools/accessibility-testing.md`** — documents the broader accessibility testing strategy (axe + behavioural E2E) of which this spec is the keyboard-behaviour half.
- **`docs/theory/layers.md`** — describes the shell/layout/component layering that these tests span (layout → nav components → view content).

## Notes

- **`cy.realPress()` is mandatory, not optional.** `.type('{tab}')` dispatches a synthetic event that the browser does not translate into actual focus traversal. `cypress-real-events` sends the keystroke via CDP so the browser performs the real tab move. Consequence: the spec runs only in Chromium-family browsers.
- **Tooltip assertion workaround.** Vuetify tooltips use `pointer-events: none`, so Cypress' `elementFromPoint`-based visibility check reports them as hidden. The `SHOWN_TOOLTIP` selector matches Vuetify's `v-overlay--active` class instead.
- **Focus-visible distinction.** The tooltip test uses a real Tab sequence (skip-link → logo → entry) rather than `.focus()` because the tooltip is gated on `:focus-visible`, which script-driven focus does not trigger.
- **Runs under the demo profile** in CI (see `ci.yml`), same as other E2E specs.
- **No unit-test coverage for these behaviours.** The file header explicitly notes that none of the targeted components have a unit test capable of pressing Tab; this spec is the sole guard.
