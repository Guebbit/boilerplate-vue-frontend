# src/modules/orders/tests/e2e/orders.visual.cy.ts

## Purpose

Declares which screens in the orders module are captured by the shared visual-regression sweep. The file is a one-line route list; all screenshot, comparison, and reporting logic lives in the imported helper.

## Key elements

- **`sweepVisual('orders', routes, 'user')`** — invokes the shared helper with:
  - module name `'orders'` (used for snapshot naming/foldering),
  - a single-entry route array: `[['orders-list', '/en/orders', '#orders-list-page']]` (test label, URL, selector to wait for),
  - auth role `'user'` (the session context for the visit).

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — sole import. Provides the `sweepVisual` function that drives the actual page-load, settle, screenshot, and diff-compare cycle. This file contributes nothing beyond the route list and module label.

## Notes

- **Not in `npm run complete`.** Run explicitly via `npm run test:e2e:visual`.
- **Re-recording requires visual inspection.** `npm run test:e2e:visual:update` overwrites baselines; the file's own docblock stresses that re-recording without looking at the diff image defeats the purpose of the suite.
- **Baselines are co-located** in `__snapshots__/` beside this file (module-scoped), so deleting the module removes its PNGs automatically.
- Adding a new screen to the orders module means appending another `[label, url, selector]` tuple to the existing array; no other wiring is needed.
