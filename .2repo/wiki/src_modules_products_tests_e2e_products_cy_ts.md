# src/modules/products/tests/e2e/products.cy.ts

## Purpose

Cypress end-to-end spec covering the Products list and detail screens. It drives a real browser against a seeded backend to verify that anonymous visitors see only publicly visible products, admins see the full set with role-specific row actions, and the detail page renders the fields the API actually returned.

## Key elements

- **`describe('Products')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.resetState()` to start from a clean session.
- **`describe('Products list')`** — asserts:
  - Page title and table presence.
  - Soft-deleted and inactive products are hidden from anonymous visitors (tested as a transition: create → confirm visible → hide → confirm gone).
  - Row count matches `cy.publicProducts()` exactly (public scope parity).
  - Each row shows the product's title and price (addressed by title, not row index).
  - "Create product" button is admin-only; row actions are View-only for non-admins vs. View / Edit / Delete / Hard-delete for admins.
  - Admins *do* see soft-deleted and inactive rows.
  - Clicking View navigates to `/products/:id` (id read off the clicked row).
- **`describe('Product detail')`** — uses `cy.productInRole('rich')` to guarantee a record with title, price, and description; then asserts each field renders and a "Go to products list" link exists.
- **Custom commands relied upon** (defined elsewhere): `cy.resetState()`, `cy.createProduct()`, `cy.softDeleteProduct(id)`, `cy.deactivateProduct(product)`, `cy.publicProducts()`, `cy.loginAs(role)`, `cy.productInRole(role)`.

## Relationships

No graph neighbors are recorded for this file. It depends on custom Cypress commands and `data-test` attributes defined in the application and support files, but those links are not captured in the dependency graph.

## Notes

- **Assertions target API-served data, not literals.** Every expectation is read from the record the backend returned (`cy.publicProducts()`, `subject`), so the spec breaks if the API shape changes rather than silently passing against a stale catalogue.
- **Row order is intentionally not pinned.** The API sorts by `createdAt DESC, _id DESC`; seeded rows can share a millisecond. The spec addresses rows by title or reads the id from the clicked DOM node to stay order-independent.
- **Transition over tableau for visibility rules.** The soft-delete and deactivation tests create a product, confirm it is visible, then hide it and confirm it is gone. A pre-hidden fixture could not distinguish "filter works" from "row was never there."
- **`deletedAt` and `active` are independent fields**, so they get separate test cases to keep failure attribution unambiguous.
- **`cy.productInRole('rich')`** is used instead of `inStock` because the detail assertions read `description` and `price`; the "rich" role guarantees those fields are non-empty.
