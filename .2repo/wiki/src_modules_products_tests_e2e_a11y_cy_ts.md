# src/modules/products/tests/e2e/a11y.cy.ts

## Purpose

Co-located route list that feeds the shared a11y sweep for the products module. It exists alongside the module so that deleting the module also removes its accessibility coverage, and so that the cross-cutting `a11y-coverage.spec.ts` can verify every routed module ships one of these files.

## Key elements

- **`productDetail`** — resolves the detail-page URL for the "rich" seeded product via `cy.productInRole('rich')`, returning a Cypress chain of `/en/products/{id}`.
- **`productEdit`** — same lookup, returning `/en/products/{id}/edit`.
- **`sweepA11y('products — public', …)`** — registers three public-facing routes: the product list, the product detail page, and the product list under the dark theme.
- **`sweepA11y('products — admin', …, 'admin')`** — registers two admin routes (create, edit) plus a "submitted empty" variant that clicks the submit button first so validation messages are rendered for axe to audit.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — provides the `sweepA11y` function that turns this file's route entries into actual axe accessibility runs. This file supplies only the route list, names, and optional `prepare` hooks; all sweep mechanics live in the support module.

## Notes

- Detail and edit URLs use the **"rich"** role (not a bare in-stock product) so that axe actually encounters rendered description, category chips, and product image markup.
- The dark-theme entry reuses the same `/en/products` route but exercises a different colour palette that can pass on white and fail on dark.
- The "submitted empty" case is the only entry using a `prepare` hook; it ensures `.v-messages__message` elements are visible before axe runs, because axe cannot audit unrendered error text.
- A central (non-co-located) a11y route list is deliberately avoided: `tests/cross-cutting/a11y-coverage.spec.ts` enforces the co-location contract, so a module deletion cannot orphan routes in a shared list.
