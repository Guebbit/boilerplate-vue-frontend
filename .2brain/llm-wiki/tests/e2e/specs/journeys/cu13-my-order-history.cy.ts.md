---
source: tests/e2e/specs/journeys/cu13-my-order-history.cy.ts
sha256: 06bab14b514499255d4165fdef2b44dc707c2f7a3b72eb70e89c93c0b82d7154
signature: 530ae0a81adcc860aa8e522b62db26b998f65ab8d3d477a1e23c28c4a4a5346b
generated_at: 2026-11-10T06:54:48.711296+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu13-my-order-history.cy.ts

## Purpose

Cypress E2E journey test (CU13) that verifies a customer's order-history list is personal, numbered (not DB-id'd), filterable by status, paginable, and that a delivered order's detail page renders its number, statuses, payment/shipping info, and invoice link. It cross-checks every UI claim against the API for the same account.

## Key elements

- **`LARGEST_PAGE` / `SMALLEST_PAGE`** — page-size option values (`'50'` / `'10'`) used to force all rows onto one page or spill onto a second.
- **`ListedOrder`** — minimal shape (`id`, `orderNumber?`, `status`) read from the `/orders` API response.
- **`rowIds()`** — helper that extracts the trailing id segment from every `[data-test=row-view]` href in the current list, returning a `Cypress.Chainable<string[]>`.
- **`describe('CU13 · My order history')`** — single `it` block broken into labelled `cy.step` sections:
  - *List is mine & numbered* — row count, id set, and `orderNumber` text all match the API; foreign orders (`order.softDeleted`, `order.otherPending`) are absent.
  - *Status filter* — selecting "Delivered" yields exactly the API's delivered set.
  - *Pagination* — page 2 of a 10-row page contains no foreign ids.
  - *Order detail* — number, payment/fulfillment status, shipping method (pickup: no address), shipment status, and invoice opens via the `windowOpen` stub to a `blob:` URL in `_blank`.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `resetSearch`, which clears the current filter/search form before re-selecting page size to isolate pagination from prior filter state.

## Notes

- The file header declares `requires-module: delivery, orders, payments`; running it without those fixtures will fail.
- The seeded "delivered" order is intentionally a **pickup** (no shipping address), so `order-shipping-address` is asserted to *not* exist. Address read-out is covered by CU15.
- The `windowOpen` alias (set up via `cy.stubWindowOpen()`) intercepts the invoice link click to verify it opens as a `blob:` URL in `_blank` without actually navigating.
- The test never performs a payment; card/budget state is left untouched.
