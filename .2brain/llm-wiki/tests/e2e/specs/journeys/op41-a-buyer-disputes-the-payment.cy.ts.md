---
source: tests/e2e/specs/journeys/op41-a-buyer-disputes-the-payment.cy.ts
sha256: a38c38b3665bc8b4a8edc9fe9e79647249f09bbeafb51f6d44e5413e53d1f308
signature: 622fa043d659c63cf74e110cd8d4e0f75c66823f8654cc7aa95ef2b14e57ca3b
generated_at: 2026-11-10T07:19:06.599300+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op41-a-buyer-disputes-the-payment.cy.ts

## Purpose

E2E journey test (OP41) that verifies the full chargeback lifecycle: a signed payment-webhook dispute opens, the moderator sees the order in "Needs attention" with an evidence deadline, the payment drawer shows the chargeback and suppresses the refund button, the staff timeline records `dispute_opened` (while the buyer's timeline does not), and when the shop wins the dispute the refund button returns, the attention row clears, and the timeline records `dispute_closed`.

## Key elements

- **`TimelineRowLike`** — minimal `{ type: string }` shape used to read timeline rows.
- **`PaymentLike`** — minimal `{ providerRef?, amount, currency }` shape matching the order's payment slice.
- **`timelineTypes(role, orderId)`** — fetches the order timeline for a given role and returns the array of row `type` strings.
- **`report(payment, startedAt, minutes, status)`** — builds a `PaymentWebhookDispute` payload with a fixed dispute ref (`dp_op41`), computed `evidenceDueBy` (start + 7 days) and `observedAt` (start + N minutes), and sets `fundsWithdrawn` via the expression `status !== 'won'`.
- **`describe` / single `it` block** — the test body: fetches a `order.paid` subject, posts two webhooks (open → won), and asserts UI state at each step.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `postPaymentWebhook` (sends a signed webhook event to the test server) and the `PaymentWebhookDispute` type used to shape the dispute payload.
- **`scripts/e2e/payment-webhook.ts`** — the server-side webhook endpoint that receives the signed events posted by `postPaymentWebhook`; the test's 204 assertions target this handler.

## Notes

- Module precondition: `account`, `orders`, `payments` (declared in the `requires-module` comment).
- The dispute is a **provider delivery** — it arrives via a signed webhook using `E2E_PAYMENT_WEBHOOK_SECRET`; it is not triggered by any user action in the UI.
- Webhook events use fixed IDs (`evt_op41_opened`, `evt_op41_won`) so the server can deduplicate; the same `providerRef` ties both events to the order's payment.
- The test asserts role separation explicitly: `dispute_opened` appears in the moderator timeline but **not** in the buyer's.
- `beforeEach` visits the site, restores fixtures, then visits again — the double visit is the harness's established pattern for a clean session after restore.
