# src/modules/inventory/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility (a11y) e2e coverage for the inventory module's routes. It registers the module's routes with the shared a11y sweep so that deleting the module automatically removes its a11y tests — avoiding a central list that references routes the app no longer serves.

## Key elements

- **`PHONE`** — `[390, 844]` viewport constant; matches iPhone 14-class portrait, the width at which `DataTable.vue`'s `mobile-breakpoint` stacks rows below `sm`.
- **`sweepA11y('inventory', routes, 'admin')`** — the single test invocation. Declares two entries: the inventory ledger route at default viewport, and the same route at the `PHONE` viewport (to exercise `StockBoard` and the 7-column `MovementLedger` rendered as stacked cards). Authenticated as `admin`.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — provides the `sweepA11y` function that actually runs the accessibility checks. This file supplies only the route list and role; all sweep logic lives in that support module.

## Notes

- A cross-cutting guard (`tests/cross-cutting/a11y-coverage.spec.ts`) asserts that every routed module has a file like this one, so the co-location split cannot silently lose a domain.
- The phone-viewport entry exists specifically because the inventory ledger's data tables reflow into cards below the `sm` breakpoint; the default-viewport entry would not surface a11y issues in that stacked layout.
