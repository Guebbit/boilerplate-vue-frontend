---
source: tests/e2e/specs/journeys/in4-replay-a-failed-delivery.cy.ts
sha256: c49c02683da52efac0ce4c355cf9732bf5acd878e1a6d98e8657be4aa326cbb1
signature: 306c85dbb8e54bb7b35f20b0f1896aac7e53d329317cf277ef3d129e9d30c1c3
generated_at: 2026-11-10T07:09:11.369144+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in4-replay-a-failed-delivery.cy.ts

## Purpose

End-to-end test for the "Replay a failed delivery" admin journey (IN4). Verifies two failure modes and their recovery: (1) an endpoint that is unreachable — each Replay is counted as an additional attempt and the row shows the error; (2) a subscription the shop has disabled — the Replay button is absent, the API returns 409, and re-enabling the subscription allows the same Replay to deliver successfully to the receiver.

## Key elements

- **`DEAD_PATH`** — constant `'/in4-dead'`; a path on the demo receiver's own origin that both sink implementations answer with 503, simulating a dead endpoint while bypassing the SSRF guard.
- **`DOWN`** — regex matching either `ECONNREFUSED` (no receiver in single-process demo) or `Endpoint answered 5\d\d` (receiver present and returning 5xx).
- **`replayButtonOf(deliveryId)`** — selector helper that finds the Replay button in the delivery log row for a given delivery ID.
- **`replayInTheLog(deliveryId)`** — clicks the Replay button and asserts the `POST …/replay` call returns 200.
- **`openTheLogOf(subscriptionId)`** — navigates to the delivery log filtered to one subscription and waits for the page to render.
- **`describe('IN4 · Replay a failed delivery')`** — single test case covering both the dead-endpoint retry-counting scenario and the disabled-then-re-enabled subscription scenario, branching on the `liveProfile` env flag for broker timing differences.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `loginDevice` (obtain an authenticated device token for the 409 assertion) and `webhooksReceived` (poll the receiver to confirm the payload actually arrived after re-enable).
- **`tests/support/e2e/integrator.ts`** — supplies the bulk of the workflow helpers: `seededSubscription`, `sinkEndpoint`, `placeOrderAsCustomer`, `newDelivery`, `deliveryNow`, `deliveriesOf`, `eventOf`, `setEnabledOnTheDetailPage`.
- **`tests/support/e2e/steps.ts`** — provides `eventually` (poll-until predicate) for broker-async waits and `refusedWith` (assert a specific HTTP status + error code on a rejected API call).

## Notes

- The test branches on `cy.env('liveProfile')`. In **demo** (single-process) mode the broker never fires, so the first Replay is the first attempt. In **live** mode the broker may already be mid-delivery; the test waits for the broker's own attempt (or a 409 lease conflict) before exercising Replay.
- The 409 check on a disabled subscription uses a raw API call via `loginDevice` + `refusedWith` because the UI intentionally hides the Replay button — the assertion targets the server's contract, not the DOM.
- `DEAD_PATH` must stay on the receiver's own origin; a foreign origin would be blocked by the SSRF guard and the subscription could not be created.
- The test requires the backend, account, cart, orders, products, and webhooks modules (declared in the `requires-module` comment).
