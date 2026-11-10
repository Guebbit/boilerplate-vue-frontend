---
source: tests/e2e/specs/journeys/op34-staff-buy-like-anyone.cy.ts
sha256: cba5f397b4635ca367d2a240518d11440ecc859cfd93075074a88331f0c42e29
signature: 4b12a1de777e63f4352704c9427fef8bfb1d863c8da06d6e2e87643db818f5cb
generated_at: 2026-11-10T07:17:02.411448+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op34-staff-buy-like-anyone.cy.ts

## Purpose

Cypress E2E journey test for **OP34**: staff members (warehouse worker, moderator) purchase from the storefront and pay by card like any customer, and a moderator can refund their *own* order. Verifies that the refund permission is role-based (not owner-based) and that the resulting audit row is tagged with `metadata.ownOrder: true`.

## Key elements

- **`buyByCard(product: string): Cypress.Chainable<string>`** — shared helper. Adds the named product to the cart, selects standard shipping, fills a new address ("Work", Modena, Italy), checks out, pays with the `Card that pays` test card, asserts payment success, and returns the order ID extracted from the final URL path segment.
- **`AuditRowLike`** — minimal structural type (`metadata?: { ownOrder?: boolean }`) used only to shape the audit-log API response.
- **`describe('OP34 · Staff buy like anyone')`** — suite with a `beforeEach` that visits `/en`, calls `cy.restore()`, and re-visits to reset app state.
- **Test 1** — logs in as `warehouse`, calls `buyByCard('product.rich')`, then asserts the order appears in `/en/orders` and opens on its detail page.
- **Test 2** — logs in as `moderator`, calls `buyByCard('product.rich')`, clicks *Refund only* on the order edit page (asserts no re-auth dialog appears), then uses `eventually` to poll the admin audit API until a row with `metadata.ownOrder === true` is present.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports three step helpers used directly in this file:
  - `addToCartFromStorefront` — adds a product (by guarantee name) to the cart from the storefront UI.
  - `fillAddressDialog` — fills the address form fields in the add-address dialog.
  - `eventually` — polls a function repeatedly until a predicate passes (used here to wait for the audit row to appear).

## Notes

- The `// requires-module: account, cart, orders, payments` comment at the top declares which backend modules this journey exercises; the test infrastructure likely uses it to skip or gate the spec.
- `cy.restore()` is called in `beforeEach` to roll back any data mutations between tests; re-visiting `/en` after restore ensures a clean client session.
- The order ID is derived by splitting the URL pathname on `/` and taking the last segment — this assumes the order-confirmation route ends with the numeric ID.
- The refund test does **not** re-authenticate (`reauth-dialog` must be absent); the audit check is performed by a separate `admin` session via `cy.apiAs`, not the moderator's browser.
