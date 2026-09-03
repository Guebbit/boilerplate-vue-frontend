# src/modules/orders/tests/e2e/orders.visual.cy.ts

## Purpose

Cypress visual-regression test for the orders module. It registers a single route (`/en/orders`, anchored on `#orders-list-page`) with the shared `sweepVisual` helper so that a screenshot baseline exists for the orders list page under the `user` role. The file exists to make the orders module part of the cross-module visual-sweep suite without duplicating setup logic.

## Key elements

- **`sweepVisual('orders', …, 'user')`** — the sole statement in the file; registers the module name, a route list (`[['orders-list', '/en/orders', '#orders-list-page']]`), and the auth role with the shared visual-sweep runner.
- **Import: `sweepVisual`** — pulled from `tests/support/e2e/visual-sweep.ts`; handles baseline comparison, screenshot capture, and the re-record flow.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — sole dependency. Exports `sweepVisual`, which this file calls once at the top level. All actual test execution, viewport handling, and image diffing live in that module; this file is purely a route/role registration.

## Notes

- **Not included in `npm run complete`.** Run explicitly via `npm run test:e2e:visual`.
- **Re-recording is gated by convention:** `npm run test:e2e:visual:update` should only be used after visually inspecting the diff image. Blind re-recording is discouraged per the file's doc comment.
- The file is a `@module` (no named exports); its entire side effect is the single `sweepVisual` call at import time.
