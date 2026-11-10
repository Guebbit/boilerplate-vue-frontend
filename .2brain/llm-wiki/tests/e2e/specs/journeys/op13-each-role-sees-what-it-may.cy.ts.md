---
source: tests/e2e/specs/journeys/op13-each-role-sees-what-it-may.cy.ts
sha256: e983c64d4ee680d6765fc18fae095db1b8137f4475be7d4cc4140ababca05ac7
signature: 544de2f2123db77a63ff4a41fab4d4924926813694ae2b93f8215293e275571f
generated_at: 2026-11-10T07:12:15.590342+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op13-each-role-sees-what-it-may.cy.ts

## Purpose

Smoke-level e2e spec (OP13) that verifies the UI enforces role-based access control for four roles — guest, editor, moderator, and customer. It walks each role through the same set of pages (admin menu, product screens, order screens, and unauthorized addresses) and asserts that the user is either allowed through or turned back to Home with a notice, matching the permissions declared in `shared/rules/authorization-roles.yaml`.

## Key elements

- **`ordersShown(path?)`** (local helper) — Intercepts `POST **/orders/search`, visits the given orders path (defaults to `/en/orders`), waits for the response, and returns a `Cypress.Chainable<number>` of the visible `[data-test=list-row]` count.
- **`describe('OP13 …', { tags: '@smoke' })`** — Single top-level suite; one `it` block covers all four roles sequentially.
- **`beforeEach`** — Visits `/en`, calls `cy.restore()` to reset session state, then visits `/en` again.
- **Guest assertions** — Profile, orders, and wishlist redirect to `#login-page`; cart is accessible but checkout is absent; product page shows add-to-cart but no wishlist toggle.
- **Editor assertions** — Admin menu includes `/en/locales` but excludes `/en/users`, `/en/audit`, `/en/inventory`; can create and edit products; sees 0 own orders; is turned back from staff orders, users, and inventory.
- **Moderator assertions** — Admin menu includes `/en/users` but excludes `/en/audit` and `/en/locales`; sees all orders (row count > 1) with edit capability; can view products but not create/edit them; can perform a refund-only action on an order; is turned back from locales and audit.
- **Customer assertions** — No admin menu; can add to cart but has no edit button on product or order pages; is turned back from `/en/users` and from the order-edit URL.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `adminMenuLinks` (returns the list of admin-menu link `href`s for assertion) and `isTurnedBack(path)` (visits a forbidden path and asserts redirect-to-Home-with-notice). All four role sections rely on these helpers rather than inlining the redirect checks.

## Notes

- The spec is a **single `it` block** that switches users mid-test via `cy.switchUser`; there is no parallelism between roles. A failure in one role's section aborts the remaining roles' assertions.
- `ordersShown` couples to the internal API shape (`POST **/orders/search`) and the `[data-test=list-row]` selector; both must stay in sync with the application.
- The test depends on `cy.subjectId('product.rich')` and `cy.subjectId('order.paid')` fixture IDs (provided by the `products` and `orders` modules listed in the `requires-module` comment) to build dynamic URLs.
- The `requires-module` comment at the top (`account, locales, observability, orders, products, users`) documents which backend feature modules must be loaded for this spec to pass.
