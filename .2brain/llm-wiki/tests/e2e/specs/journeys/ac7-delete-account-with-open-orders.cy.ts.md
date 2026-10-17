---
source: tests/e2e/specs/journeys/ac7-delete-account-with-open-orders.cy.ts
sha256: da10d0c0163443d5dab0ee9ef17df111afd3231b55ce53124ff0b4953be6420f
generated_at: 2026-10-17T02:06:58.977391+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac7-delete-account-with-open-orders.cy.ts

## Purpose

End-to-end test for acceptance criterion 7: a user deletes their account while holding both a paid and an unpaid open order. Verifies that the paid order is detached from the user but preserved as a shippable invoice, and the unpaid order is cancelled with its personal data scrubbed by the reaping sweep.

## Key elements

- **`TRACKING_CODE`** (`'TRK-E2E-AC7'`) — searchable tracking code used when staff ships the express order.
- **`OrderLike` / `ProductLike`** — minimal read-only interfaces for the order and product fields the test asserts on (status, userId, email, shippingAddress, items, available).
- **`readAsStaff(orderId)`** — `cy.apiAs('admin', …)` GET on `/orders/:id`; asserts non-null and returns the order.
- **`availableAsStaff(productId)`** — same pattern on `/products/:id`; returns the `available` unit count.
- **`beforeEach`** — visits `/en`, calls `cy.restore()`, visits again to get a clean session.
- **Single `it` block** — walks through: seed assertions → stock reservation check → account-delete flow (UI + mail confirmation) → login rejection → stock release → paid-order detachment → staff shipping → `POST /__test/jobs/reap-orders` → scrub assertions on the unpaid order and preservation assertions on the paid one.

## Relationships

- **`tests/support/e2e/commands.ts`** — provides `expectMailTemplate` (asserts the rendered template name) and `mailedLinkUrl` (extracts the confirmation URL from a mail body).
- **`tests/support/e2e/steps.ts`** — provides `shipTheOpenGroup(trackingCode)` which drives the multi-step "start → ship" UI flow for an order group.

## Notes

- Gated behind `cy.skipUnlessDemo()`; also requires the demo outbox (in-memory mail capture) and the `account`, `delivery`, `orders` modules (see `requires-module` comment).
- The reaping sweep is triggered via `POST /__test/jobs/reap-orders`, a test-only route that a production deployment does not mount. The test reads the response `body.result` and asserts it is > 0.
- `cy.restore()` in `beforeEach` resets fixtures; the subsequent `cy.visit('/en')` re-primes the app state.
- Stock-release assertion compares `available` before vs. after and expects the delta to equal the ordered quantity of `items[0]`.
- Scrub assertion on the unpaid order checks `userId` becomes `undefined` and `email` changes from the pre-deletion value; the paid order's `email` and `shippingAddress.fullName` must survive the sweep.
