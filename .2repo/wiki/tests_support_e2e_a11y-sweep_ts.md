# tests/support/e2e/a11y-sweep.ts

## Purpose

Shared helper that runs a single axe accessibility sweep over a caller-supplied list of routes at a given authentication level. It exists so each module's `a11y.cy.ts` spec can own *which* routes to audit while the sweep mechanics (viewport, theme, network settling, prepare steps, axe invocation) live in one place. The split from the former central spec was driven by a deleted module leaving orphaned routes in the shared list.

## Key elements

- **`A11ySweepCase`** (interface) — one audited state of one route: `name`, `route`, optional `prepare`, `theme`, `viewport`.
- **`A11ySweepRoute`** (type) — either a literal path string or a function returning `Cypress.Chainable<string>` (for routes whose id must be resolved at test time).
- **`sweepA11y(label, routes, role?)`** (exported function) — the entry point. Emits a `describe` block; for each entry it sets viewport, starts network tracking, visits the route, waits for real content (`h1`, no `.v-btn--loading`, no `.v-data-table--loading`, settled network), optionally toggles dark theme via the app-bar button, runs `prepare`, then calls `cy.checkPageA11y(name)`.
- **`toCase`** / **`resolveRoute`** (internal helpers) — normalise the terse `[name, path]` tuple form and resolve literal-vs-dynamic routes.
- **`THEME_TOGGLE`** (constant) — `[data-test=theme-toggle]` selector used to flip dark mode the way a visitor would.

## Relationships

- Imported by every module's `a11y.cy.ts` (account, admin, cart, demo, feedback, inventory, locales, orders, products, realtime, users, wishlist) and by `tests/e2e/specs/a11y.cy.ts`; each caller supplies its own route list and optional role.
- Relies on `cy.checkPageA11y` (a custom command) to actually run axe and gate on `serious`/`critical` findings; all findings (including lighter ones) are written to `reports/a11y/`.
- `docs/tools/accessibility-testing.md` documents the broader a11y testing setup this helper is part of.

## Notes

- The file deliberately **names no domain routes**. Adding a route list here would recreate the central coupling the split removed. Callers are responsible for passing their own routes.
- Failing threshold is `serious` + `critical` only — advisory contrast findings do not fail the run.
- The content-wait sequence is deliberately narrow (`h1`, `.v-btn--loading`, `.v-data-table--loading`, settled network) to avoid waiting on the permanently-mounted app-shell spinner (`.v-progress-circular`), which would hang forever.
- Viewport and theme are applied **before** the visit so the page lays out for the correct size/theme from first paint, and so the first fetch is captured by network tracking.
- `prepare` runs **after** all settling waits and **before** axe, ensuring the page is in its interactive state (open drawer, submitted form, etc.) at audit time.
