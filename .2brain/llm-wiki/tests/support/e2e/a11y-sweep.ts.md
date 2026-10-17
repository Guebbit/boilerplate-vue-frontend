---
source: tests/support/e2e/a11y-sweep.ts
sha256: 6ec8ed93766526cb16dbd290997a8527d105854eced43928e70a2793760633ca
generated_at: 2026-10-17T02:24:10.200531+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/a11y-sweep.ts

## Purpose

Shared helper that runs an axe-core accessibility sweep over a set of routes at a given authentication level. It lives under `tests/support/` so every module can import it without hardcoding a central route list — the routes stay owned by each module's spec, and a cross-cutting coverage spec (`tests/cross-cutting/a11y-coverage.spec.ts`) verifies no route is missed.

## Key elements

- **`A11ySweepCase`** — interface describing one audited state: `name`, `route`, optional `prepare` (Cypress commands run before axe), optional `theme: 'dark'`, optional `viewport` tuple.
- **`A11ySweepRoute`** — union of a literal path string or a `() => Cypress.Chainable<string>` factory (for resolving record IDs against the live backend).
- **`sweepA11y(label, routes, role?)`** — the main export. Registers a `describe` block; per route it visits the page, waits for content to settle (`h1` exists, network idle, no `.v-btn--loading` / `.v-data-table--loading`), optionally switches theme via the app-bar toggle, runs the caller's `prepare` step, then calls `cy.checkPageA11y(name)`. A `role` parameter triggers `cy.loginAs(role)` in `beforeEach`.
- **`toCase` / `resolveRoute`** (internal) — normalize the terse `[name, route]` tuple spelling into a full case, and wrap a static string into a `cy.wrap` chainable.
- **`THEME_TOGGLE`** — `'[data-test=theme-toggle]'` selector, locale-agnostic so the `/it/` sweep finds it too.

## Relationships

Imported by every module's `a11y.cy.ts` spec (account, api-keys, cart, example, feedback, inventory, locales, observability, orders, payments, products, returns, stats, users, webhooks). Each spec calls `sweepA11y` with its own module's routes and an optional role. This file imports no other project module; it depends only on global Cypress commands (`cy.visit`, `cy.loginAs`, `cy.trackNetwork`, `cy.settleNetwork`, `cy.checkPageA11y`, `cy.restore`, `cy.subjectId`).

## Notes

- **Failure gate is `serious` + `critical` only** (enforced inside `cy.checkPageA11y`); advisory/contrast findings are logged to `reports/a11y/` but do not fail the run.
- **Wait strategy is deliberately narrow**: `h1` + network settle + two Vuetify loading selectors. A broader wait (e.g. `.v-progress-circular`) would match the app shell's permanently-mounted, CSS-hidden spinner and hang.
- **Theme switching goes through the UI toggle**, not a direct Vuetify prop, so the audited state is one a real visitor can reach.
- **Viewport is set before `cy.visit`** so the page lays out at that size from the first paint; Cypress resets it between tests automatically.
- The file intentionally names no routes and no domains — all routing knowledge lives in the calling module's spec.
