---
source: src/modules/products/tests/e2e/products.cy.ts
sha256: 10b9f0089066f6d1538990c2498cbe34408831fdbc3f9e631be1113a94c52be2
signature: 10b9f0089066f6d1538990c2498cbe34408831fdbc3f9e631be1113a94c52be2
generated_at: 2026-11-10T05:23:40.340866+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/products.cy.ts

## Purpose

Cypress end-to-end spec covering the products list and detail screens in a real browser against the seeded backend. It verifies what anonymous visitors see (storefront grid, public-only products) versus what admins see (back-office table with CRUD actions), plus sorting, free-text i18n search, and navigation to the product detail page.

## Key elements

- **`PAGE_ONE_SIZE`** (`10`) — constant matching the list's default page size; used to cap assertions so they only compare against one rendered page of results.
- **`describe('Products list')`** — the bulk of the spec. Exercises visibility rules (soft-delete, `active`), grid-vs-table rendering, the admin-only "Create product" button, server-side price sort, locale-aware free-text search, and product-card link navigation.
- **`describe('Product detail')`** — seeds a `product.rich` fixture via `cy.subjectProduct`, then asserts title, price, description, and a "Go to products list" link render correctly.
- **Custom Cypress commands used** — `cy.createProduct`, `cy.softDeleteProduct`, `cy.deactivateProduct`, `cy.publicProducts`, `cy.subjectProduct`, `cy.loginAs`, `cy.restore` (restores seed data in `beforeEach`).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Transition-style visibility tests**: the soft-delete and `active` tests each create a product, confirm it is visible, then hide it and confirm it disappears. This distinguishes "the filter works" from "the row was never there" (a pre-hidden fixture cannot make that distinction).
- **Page-size awareness**: length and title/price assertions are capped at `PAGE_ONE_SIZE` because a paginated list only renders one page; comparing against the full catalogue would fail by design once the seed outgrows one page.
- **Title-addressed lookups**: rows are matched by product title (via `cy.contains`) rather than by index, because API sort order (`createdAt`) can be non-deterministic across seed rows that share a millisecond.
- **Detail assertions read from the API response**: the `subject` variable is populated from `cy.subjectProduct('product.rich')`, so the page is checked against the actual record served, not a hard-coded catalogue value.
- **i18n search test** uses a unique word (`parolaunica<timestamp>`) that appears only in the Italian translation to prove the search queries the translations collection rather than a single-language derived index.
