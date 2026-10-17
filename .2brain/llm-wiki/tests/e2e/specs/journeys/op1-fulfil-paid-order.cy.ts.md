---
source: tests/e2e/specs/journeys/op1-fulfil-paid-order.cy.ts
sha256: 819754b6e4ecfb882fc61c7ab45bb93c94b14b969ee2e9713667cc1d059c627d
generated_at: 2026-10-17T02:18:33.057255+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op1-fulfil-paid-order.cy.ts

## Purpose

Smoke-tagged E2E journey that walks a paid express order through its full lifecycle (paid → processing → shipped → delivered) via the admin shipment panel, asserting at every step that only the correct action button is visible and that express shipping is gated behind a tracking code. Also verifies the customer receives a mail containing the tracking code and can view it on their own order page.

## Key elements

- **`TRACKING_CODE`** (`'TRK-E2E-OP1'`) – fixed code typed into the ship form; used later to assert the customer's email and the order page contain it.
- **`OrderLike`** – minimal interface (`status`, `fulfillmentStatus`) describing the shape the test expects from the order API.
- **`customerSees(orderId, status)`** – helper that calls `GET /orders/:id` as the `user` role and asserts the `status` field, tying each step to a persisted state rather than a UI screen.
- **`describe('OP1 · …', { tags: '@smoke' })`** – single `it` block that sequences the five steps (open, mark started, ship with code, mail check, mark delivered) and a final customer-side verification.

## Relationships

- **`scripts/e2e/mail-message.ts`** – provides `mailMentions(mail, TRACKING_CODE)`, a predicate passed to `cy.emailTo` to confirm the customer's inbox contains the tracking code after the ship step.

## Notes

- The test's central contract is **button mutual exclusion**: every step asserts the expected button *and* the absence of the other two (`mark-started`, `open-ship`, `mark-delivered`). A regression that leaves a stale button visible will fail even if the happy-path action works.
- Express shipping is the variant tested here: `ship-submit` is disabled until a tracking code is typed. A non-express order would not have this gate.
- `beforeEach` calls `cy.restore()` between two `cy.visit('/en')` calls; the double visit is intentional to ensure a clean session after fixture reset.
- `cy.subjectId('order.paidExpress')` pulls the order fixture; the test never creates or mutates order data itself.
- The `OrderLike.fulfillmentStatus` field is declared but never asserted in this file — it is present for future expansion or to document the API shape.
