---
source: tests/support/e2e/integrator.ts
sha256: 53d43f20119983831ca35f16f25375325bb88f9e561b1fbf4dcc0f087c2a5645
signature: bde336966b5afdf9c3eb347208d15eef160c040c6c63bb97ceb539e7fb46cf14
generated_at: 2026-11-10T07:31:40.667026+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/integrator.ts

## Purpose

Shared step functions for the integrator journeys (IN1–IN8) and related webhooks e2e specs. It encapsulates the repeatable actions those specs perform—locating the seeded receiver, placing an order as the customer, reading the delivery log, and inspecting captured webhooks—using the webhooks module's own vocabulary. Kept separate from `steps.ts` so that the webhooks domain language stays isolated.

## Key elements

- **`SubscriptionRow` / `DeliveryRow`** – structural interfaces mirroring the backend's `WebhookSubscription` and `WebhookDelivery` fields as read by these journeys (avoids importing `contracts/`).
- **`seededSubscription()`** – finds the demo receiver subscription by its description (`"Demo sink (webhook-tester)"`); asserts exactly one exists.
- **`sinkEndpoint(path)`** – builds a URL on the seeded receiver's origin (the SSRF-exempt origin); `path` must not contain the word `dead`.
- **`setEnabledOnTheDetailPage(subscriptionId, url, enabled)`** – toggles a subscription on/off via the UI detail page, confirming the resulting notice.
- **`placeOrderAsCustomer()`** – cancels the customer's pending orders (as admin, to avoid the purchase-hold cap), then places a pickup-and-card order via the API; returns the new order id.
- **`deliveriesOf(subscriptionId)`** – fetches one page (≤100) of delivery rows for a subscription, newest first.
- **`newDelivery(subscriptionId, knownIds)`** – polls until a delivery row not in `knownIds` appears; yields that row.
- **`deliveryNow(subscriptionId, deliveryId)`** – re-reads a specific delivery row from the log.
- **`receivedAtLeast(receiverUrl, count)`** – polls the receiver until it has captured ≥ `count` webhooks; yields them oldest-first.
- **`eventOf(received)`** – parses a captured webhook body to extract `{ type, orderId }`.
- **`expectVerifiesUnder(received, secrets)`** – asserts signature verification (or non-verification) under each supplied `whsec_…` secret.
- **`latestOf(received)`** – returns the newest captured webhook or throws.
- **`datetimeLocalIn(fromNowMs)`** – formats a future instant as `YYYY-MM-DDTHH:mm` in the browser's local time for `datetime-local` inputs.
- **`freeTheOpenOrderSlots()`** (private) – cancels all `pending` orders as admin before `placeOrderAsCustomer` runs.

## Relationships

- **Imports** `checkoutAs`, `eventually` from `./steps` and `signatureVerifies`, `webhooksReceived`, `ReceivedWebhook` from `./harness`.
- **Sits alongside** `tests/support/e2e/fixtures.ts` in the same support directory.
- **Semantically coupled to** `scripts/e2e/webhook-tester.ts`, the "Demo sink" whose subscription description `seededSubscription()` matches and whose origin `sinkEndpoint()` builds on.
- **Graph neighbors (journey specs):** `tests/e2e/specs/journeys/in1-a-key-does-what-it-was-given.cy.ts`, `in2-a-key-follows-its-minter.cy.ts`, `in3-an-order-fires-a-signed-webhook.cy.ts`, `in4-replay-a-failed-delivery.cy.ts`, `in6-keep-a-webhook-healthy.cy.ts`, `in7-a-key-has-limits.cy.ts`, `in8-an-endpoint-that-never-answers.cy.ts`, `at5-webhooks-filters.cy.ts`, and `op32-people-and-keys-ask-a-fresh-session.cy.ts`.
- **Graph neighbors (module e2e specs):** `src/modules/webhooks/tests/e2e/a11y.cy.ts`, `actions.cy.ts`, `webhooks.cy.ts`.
- **Graph neighbor:** `src/modules/cart/tests/guest-cart.property.spec.ts`.

## Notes

- **No `scenario.ts` import.** The file deliberately avoids importing `scenario.ts` because a second copy in a spec file goes stale (see `cy.accountOf` pattern in `steps.ts`).
- **`freeTheOpenOrderSlots` runs as admin.** Customer-initiated cancellations count toward the purchase hold, so admin cancels are used to keep `placeOrderAsCustomer` callable multiple times in one spec.
- **Ordering matters.** `placeOrderAsCustomer` must run *before* the order a spec asserts on; the cancellation it triggers produces its own delivery row that would otherwise be indistinguishable from the target `order.created`.
- **`sinkEndpoint` path constraint.** The `webhook-tester` sink returns 503 for any path containing `dead`; avoid it when choosing unique paths.
- **Seed coupling.** `seededSubscription` identifies the receiver purely by the description string `"Demo sink (webhook-tester)"`; a change to the seed in `scenarios/webhooks.ts` breaks this lookup.
