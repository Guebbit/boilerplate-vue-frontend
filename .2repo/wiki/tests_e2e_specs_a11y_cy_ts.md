# tests/e2e/specs/a11y.cy.ts

## Purpose

Accessibility sweep for the "shell" routes — the landing page, prose pages (about, faq, terms, privacy), the 404 and error pages, and the shared chrome (app bar, drawer, language menu, theme toggle, account/admin menus). These routes have no owning module, so their a11y coverage lives here rather than inside a module's test directory. Only `serious` and `critical` axe violations fail the run; lighter findings are logged to `reports/a11y/`.

## Key elements

- **`PHONE`** — `[390, 844]` viewport constant (iPhone 14 portrait) used to trigger the nav-drawer breakpoint.
- **`sweepA11y('the shell', …)`** — Main sweep covering all unowned routes: `/en`, `/en/about`, `/en/faq`, `/en/terms`, `/en/privacy`, `/en/this-route-does-not-exist` (404), `/en/error/500/error-page.not-found`, `/it` (locale coverage), dark theme, drawer-open, and language-menu-open states.
- **`sweepA11y('the shell chrome', …)`** — Audits the nav tooltip with it actually rendered (uses `cy.realPress('Tab')` to trigger `:focus-visible`, then asserts the Vuetify tooltip overlay is active).
- **`sweepA11y('the shell chrome, signed in', …, 'user')`** — Account-menu-open state, run under the `user` role.
- **`sweepA11y('the shell chrome, signed in as an admin', …, 'admin')`** — Administration menu and admin drawer sections, run under the `admin` role.
- Each entry is either a `[name, route]` pair or an object with `name`, `route`, optional `theme`, `viewport`, and a `prepare` callback that drives the UI into the state to audit.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides `sweepA11y`, the function this file calls. It encapsulates visiting a route, running axe, gating on `serious`/`critical`, writing reports, and applying the optional role/viewport/theme/prepare hooks.
- **`docs/tools/accessibility-testing.md`** — The documentation that describes the a11y testing workflow and tooling this spec is part of.

## Notes

- **Coverage guarantee is external:** `tests/cross-cutting/a11y-coverage.spec.ts` parses `src/app/router/index.ts` and fails if any route is missing from this file (or a module's equivalent). There is no lint rule here; completeness is enforced by that separate spec.
- **Tooltip visibility trick:** Vuetify tooltip content is `pointer-events: none`, so Cypress's `.should('be.visible')` fails on it. The test instead asserts on the `.v-tooltip.v-overlay--active` class and checks content length.
- **`cy.realPress('Tab')` vs `.focus()`:** The tooltip opens on `:focus-visible`, which programmatic `.focus()` does not set. The test must use a real keyboard press.
- **Error-page route shape:** `:status` is required and `:message?` is an i18n key the page translates — the test hits both (`500` + `error-page.not-found`) to mirror what the error handler actually sends.
- **Runs under the demo profile** in `ci.yml`, same as every other e2e spec in the suite.
