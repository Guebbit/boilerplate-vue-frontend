---
source: tests/support/e2e/integrator.ts
sha256: 07ea55f7e978716fc1af2b8eacd0b66e897b174f8362ee3f5328238a08c98d20
generated_at: 2026-10-17T02:25:59.711204+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/integrator.ts

## Purpose

Shared step functions for the integrator journeys (IN1–IN7). Encapsulates the repetitive webhooks-module workflow—locating the shop's seeded demo receiver, placing an order via API to trigger a webhook, and reading the delivery log and receiver capture as structured data. Kept separate from `steps.ts` because it speaks the webhooks module's own vocabulary rather than generic UI steps.

## Key elements

- **`SubscriptionRow` / `DeliveryRow`** — Structural interfaces mirroring the backend's `WebhookSubscription` and `WebhookDelivery` fields that these journeys read.
- **`seededSubscription()`** — Finds the one subscription whose description is `"Demo sink (webhook-tester)"`; throws if there is not exactly one.
- **`sinkEndpoint(path)`** — Returns a full URL on the seeded receiver's origin so every e2e subscription targets the SSRF-exempt sink.
- **`setEnabledInTheForm(subscriptionId, url, enabled)`** — Toggles a subscription on/off through the edit form UI and waits for the save confirmation.
- **`placeOrderAsCustomer()`** — Frees the account's open-order slots, then places a pickup-by-card order via the API. Returns the new order id. Safe to call repeatedly in one spec.
- **`deliveriesOf(subscriptionId)`** — Fetches up to 100 delivery-log rows for a subscription, newest first.
- **`newDelivery(subscriptionId, knownIds)`** — Polls until a row appears that is not in `knownIds`, then yields it (the `order.created` delivery).
- **`deliveryNow(subscriptionId, deliveryId)`** — Re-reads a single delivery row from the API.
- **`receivedAtLeast(receiverUrl, count)`** — Polls the receiver until at least `count` webhooks are captured.
- **`eventOf(received)`** — Parses a captured webhook body and returns `{ type, orderId }`.
- **`expectVerifiesUnder(received, secrets)`** — Asserts which `whsec_…` secret(s) successfully verify the capture's signature.
- **`latestOf(received)`** — Returns the most-recently captured webhook (or throws if empty).
- **`datetimeLocalIn(fromNowMs)`** — Formats a future timestamp as `YYYY-MM-DDTHH:mm` in local wall-clock time for `<input type="datetime-local">`.
- **`freeTheOpenOrderSlots()`** *(module-private)* — Cancels all `pending` orders for the user so the per-account cap does not block the next checkout.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `checkoutAs` and the `eventually` polling helper.
- **`tests/support/e2e/harness.ts`** — Imports `signatureVerifies`, `webhooksReceived`, and the `ReceivedWebhook` type.
- **IN1–IN7 journey specs** (`in1-…` through `in7-…`) — Primary consumers; each spec imports the relevant functions above to drive its scenario.
- **`scripts/e2e/webhook-tester.ts`** — The live demo sink that `seededSubscription` locates by its seeded description; not imported, but its existence on the backend is a precondition.

## Notes

- **Do not import `scenario.ts`.** The file's header comment warns that a second copy of `scenario.ts` in a spec file goes stale (see `cy.accountOf`). This module imports only `harness.ts` and `steps.ts`.
- **`sinkEndpoint` path must not contain the word `dead`.** The sink answers that path with a 503.
- **`freeTheOpenOrderSlots` runs before the order, never after.** A cancellation announces itself as a webhook event; its delivery row must be older than the `order.created` row the spec waits for.
- **`seededSubscription` requires exactly one match.** If the backend seed is missing or duplicated the assertion fails with a hint to check `NODE_WEBHOOK_DEMO_SINK_URL`.
- **`datetimeLocalIn` compensates for the browser's timezone offset** so the form's `datetime-local` input (which interprets its value as local time) sees the intended wall-clock digits.
