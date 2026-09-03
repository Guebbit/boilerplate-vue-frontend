# tests/e2e/specs/a11y.cy.ts

## Purpose

Accessibility sweep for the app "shell" — routes and chrome that belong to no domain module. Module-owned routes carry their own a11y spec alongside the module so that deleting a domain deletes its coverage; this file is the residual home for the landing page, four prose pages, the error page, and the shared chrome (app bar, drawer, language menu, theme toggle, account/admin menus) that every page inherits.

## Key elements

- **`PHONE`** — `[390, 844]`, the viewport breakpoint below which the nav collapses into a drawer.
- **`sweepA11y('the shell', …)`** — primary sweep (no auth role). Covers: home, about, FAQ, terms, privacy, 404, the error page by its own address, home in Italian, home in dark theme, home with the drawer open on a phone, and home with the language menu open.
- **`NAV_TOOLTIP_SHOWN`** — page config that opens the pinned (cart) nav tooltip via a real `Tab` / `Shift+Tab` keystroke (because `.focus()` does not set `:focus-visible`) and asserts the Vuetify overlay content is rendered.
- **`sweepA11y('the shell chrome, signed in', …, 'user')`** — runs as the `user` role; audits the nav tooltip and the account menu open.
- **`sweepA11y('the shell chrome, signed in as an admin', …, 'admin')`** — runs as the `admin` role; audits the administration menu and the phone drawer with its admin section visible.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — provides the `sweepA11y` helper that this file calls three times. Each call passes a group name, an array of page configs (route + optional `prepare` / `viewport` / `theme`), and an optional auth role. The helper handles navigation, axe-core execution, and report writing.

## Notes

- **Gate severity:** only `serious` and `critical` axe violations fail the run. Advisory findings (e.g. contrast) are logged to `reports/a11y/` but do not block. The rationale: a gate that fires on advisory contrast is one that gets disabled.
- **Coverage guarantee is external:** `tests/cross-cutting/a11y-coverage.spec.ts` parses `src/app/router/index.ts` against this file and fails if any route is unvisited. This file is not self-enforcing for completeness.
- **Tooltip test uses `cy.realPress`, not `.focus()`:** Vuetify's tooltip opens on `:focus-visible`; Cypress's `.focus()` does not trigger it. Tab away and back is the only reliable way.
- **Vuetify overlay vs. Cypress visibility:** tooltip content carries `pointer-events: none`, which Cypress interprets as "covered" (not visible). The test therefore asserts on the `.v-tooltip.v-overlay--active` class instead of using `.should('be.visible')`.
- **Italian locale check:** included solely to catch a translated label whose `aria-*` counterpart was lost during i18n; no other structural difference is expected.
- **Vuetify handles most input a11y** (labels, ARIA state on form controls). These sweeps primarily guard hand-written markup: skipped heading levels, icon-only buttons missing `aria-label`, images without alt text, and colour-contrast choices.
- Runs under the demo profile, same as every other spec in `ci.yml`.
