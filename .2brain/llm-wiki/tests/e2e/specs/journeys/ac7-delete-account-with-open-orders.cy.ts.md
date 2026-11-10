---
source: tests/e2e/specs/journeys/ac7-delete-account-with-open-orders.cy.ts
sha256: 49e0cfb66655fb63d874b992ac5b12a52cac3db01bc7d6be2f9b2b0f5ae38300
signature: eb0d5601f3de678833d2ab334f46499a53f55cee8c1529ad021b664cb6ef5185
generated_at: 2026-11-10T06:49:23.708463+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac7-delete-account-with-open-orders.cy.ts

## Purpose

E2E Cypress journey for acceptance criterion AC7: a customer deletes their account while one order is paid-and-open and another is unpaid. Verifies the full lifecycle — immediate lock, grace-period purge, stock release on the unpaid order, detachment of the paid order as a staff-shippable invoice, and a final sweep that scrubs personal data from the unpaid order while leaving the invoice intact.

## Key elements

- **`PAST_THE_GRACE_MS`** — constant (32 days) used with `cy.travel` to jump past the maximum 31-day deletion grace period.
- **`TRACKING_CODE`** (`'TRK-E2E-AC7'`) — tracking identifier passed to `shipTheOpenGroup` so the test can assert it appears in the shipment.
- **`OrderLike` / `ProductLike`** — narrow interfaces describing only the API fields this test reads (status, userId, email, items, available stock).
- **`readAsStaff(orderId)`** — admin-credential `GET /orders/:id` wrapper via `cy.apiAs`; returns the order or fails.
- **`availableAsStaff(productId)`** — admin-credential `GET /products/:id` wrapper; returns the `available` stock count.
- **`it('the account goes, a paid order stays…')`** — the single test case. Steps through: pre-state verification → deletion request → `cy.travel` + `runJob('reap-scheduled-deletions')` → login-failure assertion → stock-release check → invoice detachment → admin shipping flow → `runJob('reap-orders')` → personal-data scrub vs. invoice-preservation assertions.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `shipTheOpenGroup`, the shared step that clicks through the "start" → "ship" dialog and types the tracking code.

## Notes

- **Demo-only:** `cy.skipUnlessDemo()` guards the test; `cy.travel` and `cy.runJob` are demo levers not mounted in a live deployment.
- **Email assertions** depend on the demo outbox (`cy.emailTo`), not a real mail service.
- The `reap-orders` sweep runs *after* the deletion purge; the test asserts it scrubs the unpaid order's `email` and `userId` but leaves the paid order's `email` and `shippingAddress.fullName` untouched (invoice preservation).
- `beforeEach` calls `cy.restore()` to reset DB state between runs; the test relies on fixture subjects (`order.paidExpress`, `order.awaitingTransfer`) seeded by that restore.
- Top-of-file comment `// requires-module: account, delivery, orders` signals which domain modules must be present for the test to be meaningful.
