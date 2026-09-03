# src/modules/products/tests/e2e/products.visual.cy.ts

## Purpose

Declares the list of screens for the products module's visual-regression sweep. It registers a single screen (`products-list`) so the shared `sweepVisual` harness can capture and compare a screenshot of the rendered page.

## Key elements

- **`sweepVisual('products', …)` call** — the sole statement in the module. Passes the module name and an array of screen tuples to the harness.
- **Screen tuple `['products-list', '/en/products', '#products-list-page']`** — defines one screen: a human-readable name, the URL to navigate to, and a CSS selector that anchors the screenshot crop.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` function. This file is its consumer: it supplies the module name and screen definitions that the harness iterates over to drive navigation, waiting, and screenshot capture.

## Notes

- Excluded from `npm run complete`. Invoke via `npm run test:e2e:visual`.
- Re-recording snapshots (`npm run test:e2e:visual:update`) should only be done after visually inspecting the diff image — the doc-block makes this a hard requirement, not a suggestion.
- Adding a new screen is as simple as appending another `[name, url, selector]` tuple to the array; no other wiring is needed.
