# src/modules/locales/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility (a11y) test for the **locales** module. It registers the module's routes with the shared `sweepA11y` runner, which visits each route and asserts accessibility with axe-core. By living inside the module's directory, deleting the module automatically removes its a11y coverage, preventing a stale central list from referencing routes the app no longer serves.

## Key elements

- **`sweepA11y('locales', routes, 'admin')`** — Single call that registers three route entries plus one dialog-state entry, all executed under the `admin` role:
  - `['languages board', '/en/locales']` — languages board page.
  - `['dictionary board', '/en/locales/dictionary']` — dictionary board page.
  - `['translation entries', '/en/locales/it']` — entries table (Italian locale chosen because it has exactly one seeded entry, guaranteeing a populated table without depending on a larger fixture).
  - **Dialog-state entry** (`'translation entries, entry dialog open'`) — visits `/en/locales/it`, clicks `[data-test=entry-create]` to open the entry form modal, then confirms `[data-test=entry-form]` is visible before the axe assertion runs.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function. This file is the sole consumer here; it calls the function once, passing the module name, a list of route/dialog descriptors, and the role. The sweep runner handles navigation, `prepare` hooks, and axe assertions for every entry in the list.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in comments) — Asserts that every routed module has a co-located `a11y.cy.ts` like this one, ensuring the per-module split cannot silently lose a domain.

## Notes

- The entry is registered with `it` (Italian) rather than `es` (Spanish) specifically because Italian has exactly one seeded entry, making the table state deterministic for the sweep regardless of other fixture row counts.
- The dialog-state entry uses a `prepare` callback to open the modal; the sweep runner invokes it before the axe check, so the assertion covers the open-dialog state (three fields, title-named modal) rather than the underlying page alone.
- All routes are prefixed `/en/locales/…`, meaning the sweep tests the English-locale path to the locales admin area.
