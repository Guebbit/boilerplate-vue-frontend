---
source: tests/e2e/specs/journey.cy.ts
sha256: 831962f3a73790cd83d7ade36d03225a919fb92310aa92db35a362fd5de9e2e3
generated_at: 2026-10-17T02:03:52.085145+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journey.cy.ts

## Purpose

End-to-end test that walks the full customer lifecycle in one continuous session: a guest browses and hits the sign-in wall, then an authenticated user filters, buys, checks out, cancels, and verifies the shelf's stock count recovers. After login the test navigates exclusively through in-app links and buttons (no `cy.visit`) to prove state survives across pages without a full reload.

## Key elements

- **`describe('The customer journey')`** — single test suite; the only `it` block covers the entire guest→customer→cancel→recovery arc.
- **`stockBeforeBuying`** — module-level variable holding the product's initial `available` count, read via admin API, later asserted to confirm stock restoration after cancel.
- **`beforeEach`** — calls `cy.restore()` then a *double* `cy.visit('/en')` so the in-memory session is truly cleared and the page re-boots as a guest.
- **Guest segment** — navigates to products, applies a category filter, asserts a single card, opens it, verifies in-stock flag (no numeric count visible), confirms add-to-cart is enabled but checkout is gated behind sign-in.
- **Customer segment** — logs in (`cy.loginAs('user')`), re-filters, adds to cart, goes to cart, checks out with `'standard'` shipping.
- **Email assertion** — conditionally (skipped when `liveProfile` is true) reads the outbox for `seedAccount('user').email` and calls `expectMailTemplate(email, 'orders.order-confirm')`.
- **Cancel segment** — clicks the order's cancel button, confirms the app-level dialog, verifies the cancel button is gone and reorder button appears.
- **Recovery assertion** — dismisses stacked Vuetify alerts, navigates back to products (filter still active), re-reads stock via admin API and asserts it equals `stockBeforeBuying`.

## Relationships

- **`tests/support/e2e/commands.ts`** — supplies `expectMailTemplate` (imported directly) and registers the majority of custom commands used throughout: `cy.navigateTo`, `cy.filterByNarrowestCategoryOf`, `cy.loginAs`, `cy.goToCart`, `cy.checkoutWith`, `cy.subjectId`, `cy.apiAs`, `cy.restore`.
- **`tests/support/e2e/scenario.ts`** — supplies `seedAccount`, used to look up the demo user's email address for the outbox check.

## Notes

- Header comment `requires-module: cart, inventory, orders, products` signals the backend fixtures these modules must provide; the test will fail at setup if any is absent.
- The filter chip **persists** across navigation. Returning to `/en/products` shows the already-filtered list; clicking the same chip again would *toggle the filter off*, so the test relies on the persisted state rather than re-applying it.
- Stock counts are only ever read via the admin API (`cy.apiAs('admin', …)`); the storefront exposes only a boolean "In stock" flag.
- `beforeEach` deliberately visits `/en` twice: the first visit triggers the old session's boot, `cy.restore()` wipes the server-side token, and the second visit gives the page a clean guest boot.
- Toast/alert dismissal (`.v-alert`) is required before interacting with product cards again — alerts overlap the action column and intercept clicks.
