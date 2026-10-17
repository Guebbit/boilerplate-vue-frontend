---
source: tests/e2e/specs/journeys/in4-replay-a-failed-delivery.cy.ts
sha256: 330e93b405d7bec5c8f2d7e4e3dae480e7c7028e86fe2f96efbdeb51a94267ba
generated_at: 2026-10-17T02:17:30.854287+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in4-replay-a-failed-delivery.cy.ts

## Purpose

E2E test for the IN4 journey: an admin replays a failed webhook delivery from the delivery log. It covers two distinct failure modes — an endpoint that is down (each replay increments the attempt counter and the row shows *why* it failed) and a subscription the shop has switched off (replay is refused until re-enabled, then the same replay delivers to the receiver).

## Key elements

- **`DEAD_PATH`** (`/in4-dead`) — the URL path on the demo receiver's own origin that both sinks answer with 503; used to create a subscription pointing at a dead endpoint.
- **`DOWN`** (regex) — matches either `ECONNREFUSED` (no receiver listening) or `Endpoint answered 5\d\d` (receiver's own 5xx).
- **`replayButtonOf(deliveryId)`** — locates the Replay button on a specific delivery row by its `aria-label`.
- **`replayInTheLog(deliveryId)`** — intercepts the `POST …/replay` call, clicks the button, and asserts a 200.
- **`openTheLogOf(subscriptionId)`** — visits the delivery log page filtered to one subscription and waits for the page shell.
- **`describe` / single `it`** — the test body; runs two sequential scenarios (dead endpoint → disabled subscription) inside one `seededSubscription().then(…)` chain, with `liveProfile`-conditional branches for broker-awareness.

## Relationships

- **`tests/support/e2e/harness.ts`** — imports `webhooksReceived` to poll the receiver's received-request log and confirm a replay actually arrived.
- **`tests/support/e2e/integrator.ts`** — imports the bulk of domain actions: `seededSubscription`, `sinkEndpoint`, `placeOrderAsCustomer`, `newDelivery`, `deliveryNow`, `deliveriesOf`, `eventOf`, `setEnabledInTheForm`.
- **`tests/support/e2e/steps.ts`** — imports `eventually` for polling until an async backend state settles (used in both the dead-endpoint and disabled-subscription paths).

## Notes

- The file header declares `requires-module: account, cart, orders, products, webhooks`; the backend must boot with all five modules or the test will fail at setup.
- The dead endpoint lives on the receiver's own origin specifically because the SSRF guard exempts that origin; the path must contain the substring `dead` for both sinks to return 503.
- In **live** profile the broker is active, so the test waits (`eventually`) for the broker's own attempt to finish before the admin's replay to avoid a 409 lease conflict. In **demo** profile no broker runs, so the first replay *is* the first attempt.
- The disabled-subscription scenario asserts the log's status filter: the row appears under "Exhausted" but not under "Succeeded".
- `setEnabledInTheForm` toggles the subscription via its edit form (not an API call), matching the real admin UI flow.
