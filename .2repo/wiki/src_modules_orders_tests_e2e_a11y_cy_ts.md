# src/modules/orders/tests/e2e/a11y.cy.ts

## Purpose

Cypress a11y sweep definition for the orders module. It declares which routes to audit (orders list, detail, edit) and at which viewports, delegating the actual axe-core checks to the shared `sweepA11y` helper. The file is co-located with the module so that deleting the module also removes its a11y coverage; a cross-cutting spec (`tests/cross-cutting/a11y-coverage.spec.ts`) enforces that every routed module has one.

## Key elements

- **`PHONE`** — `[390, 844]` const tuple representing an iPhone 14 portrait viewport; used to audit the `DataTable.vue` mobile-stack layout that the desktop sweep never exercises.
- **`orderDetail()`** — Resolves the URL of a pending "cancellable" order via `cy.orderInRole`, returning `/en/orders/:id`. Pending status ensures all action buttons are rendered (vs. disabled/missing), which matters for a11y assertions.
- **`orderEdit()`** — Same resolution pattern, returns `/en/orders/:id/edit` (admin-only route).
- **`sweepA11y('orders — signed in', …)`** — Audits the orders list in default and phone viewports as a regular user profile.
- **`sweepA11y('orders — admin', …)`** — Audits the detail and edit pages as an admin profile.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` helper that this file imports. The helper accepts a test title, a list of route descriptors (name + route or resolver, optional viewport), and a profile role, then drives the accessibility audit. This file is purely declarative configuration for that helper.

## Notes

- The "cancellable" role is resolved dynamically at test time via `cy.orderInRole`; it maps to whatever backend profile is active, not a hardcoded order ID.
- The phone-viewport entry on the orders list is intentionally a separate descriptor object (with `viewport` key) rather than a second route string — `sweepA11y` treats it as a distinct audit pass.
- Detail and edit pages are **not** swept in the signed-in profile because they are owner-/admin-only; only the list is visible to both roles.
