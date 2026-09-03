# src/modules/locales/tests/e2e/a11y.cy.ts

## Purpose

Declares the locales module's routes (and one dialog state) to the shared `sweepA11y` runner, which visits each route and asserts against axe. It exists so the locales pages — including their mobile-stacked table layouts and the entry-creation dialog — are covered by the accessibility sweep without duplicating axe logic per page.

## Key elements

- **`PHONE`** — Constant tuple `[390, 844]` (iPhone 14-class portrait). Used as the viewport for mobile-variant sweeps; sits below the `sm` breakpoint where `DataTable.vue` stacks rows into cards.
- **`sweepA11y('locales', [...], 'admin')`** — The single top-level call. Registers seven sweep entries (three desktop routes, three phone-viewport routes, one dialog-open state) under the `'admin'` role. Each entry is either a `[name, route]` tuple or an object with optional `viewport` and `prepare` hooks.
- **Route selection** — Uses `/en/locales/it` (Italian) rather than `/en/locales/es` for the entries page because `it` has exactly one seeded entry, guaranteeing a populated table without depending on a larger fixture's row count.
- **`prepare` hook (dialog entry)** — Clicks `[data-test=entry-create]` and waits for `[data-test=entry-form]` to be visible, simulating the modal-over-table state that axe must audit.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides `sweepA11y`, the shared runner this file calls. The runner owns the axe execution, viewport setup, and role-based auth; this file only supplies the route/state list and module name.

## Notes

- The file is a side-effect module: it has no exports. Importing it in a Cypress spec registers the sweep entries.
- `it` was chosen over `es` deliberately; swapping locales here changes what axe sees (empty vs. populated table) and can hide or create false positives.
- The phone-viewport entries exist specifically because the desktop sweep never exercises the stacked-card layout that `DataTable.vue` produces below `sm`.
