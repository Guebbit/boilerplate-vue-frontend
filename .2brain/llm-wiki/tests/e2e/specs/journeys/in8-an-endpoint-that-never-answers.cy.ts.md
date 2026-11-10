---
source: tests/e2e/specs/journeys/in8-an-endpoint-that-never-answers.cy.ts
sha256: 4a7389176c451c3535135f710aece875143fa41666b87dde1188ed4983d96034
signature: 253b1006e034088890591ac690fa57d81c80be9bc4d674e8b12434e470a364a1
generated_at: 2026-11-10T07:10:10.615921+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in8-an-endpoint-that-never-answers.cy.ts

## Purpose

E2E test (demo-only) for the full webhook retry-and-auto-disable lifecycle when a subscribed endpoint consistently returns 503. Verifies that deliveries climb the six-attempt retry ladder to `exhausted`, the subscription auto-disables only after ≥ 5 consecutive failed chains with the oldest ≥ 3 days old, a staff notification and audit row are written, no delivery rows are created while disabled, and re-enabling with a working URL clears the failure count and allows replay.

## Key elements

- **`LADDER_MS`** – the five backoff waits (5 s → 10 h) matching `webhooks/domain/backoff.ts`; the 6th attempt is the final failure.
- **`THREE_DAYS_MS`** – minimum age of the oldest failure before auto-disable fires (`WEBHOOK_MIN_FAILING_MS`).
- **`SubscriptionState`** – interface for the fields the test reads from the admin list endpoint (id, url, enabled, consecutiveFailures, disabledAt).
- **`stateOf(subscriptionId)`** – fetches the subscription's current state via the admin list endpoint (no read-by-id route exists).
- **`placeAndCancelOneOrder(subscriptionId)`** – places one customer order then cancels it, yielding exactly two new delivery rows for the subscription; waits until both appear in the log.
- **`walkTheLadder()`** – runs `cy.runJob('sweep-webhook-retries')` and `cy.travel(wait)` for each rung, advancing the clock past every backoff so a row reaches its 6th (exhausted) attempt.
- **`expectExhausted(subscriptionId, rowIds)`** – asserts each named row has `status: 'exhausted'` and `attempt === 6`.
- **Main `describe` / `it` block** – single test walking the full scenario: subscribe dead URL → first order exhausts → streak < 5 stays enabled → 3-day travel + second order triggers auto-disable → inbox/audit/UI assertions → disabled subscription gets no rows → switch URL to alive + re-enable → count resets → replay of an exhausted row succeeds.

## Relationships

- **`tests/support/e2e/harness.ts`** – provides `forgetWebhooks()` used in `beforeEach` to clear webhook state between runs.
- **`tests/support/e2e/integrator.ts`** – source of all domain-specific helpers: `sinkEndpoint` (builds a URL on the receiver origin that returns 503/200), `placeOrderAsCustomer`, `deliveriesOf`, `deliveryNow`, `receivedAtLeast`, `seededSubscription` (healthy subscription for comparison), `setEnabledOnTheDetailPage` (toggles the enable switch in the UI).
- **`tests/support/e2e/steps.ts`** – provides `eventually()`, the retry-until-predicate polling wrapper used to wait for async side effects (inbox notifications, delivery rows appearing).

## Notes

- Gated behind `cy.skipUnlessDemo()`; relies on `cy.travel` (demo clock) and `cy.runJob` (manual job trigger) which are unavailable in production-like environments.
- Requires the modules `account, cart, orders, products, webhooks` (declared in the `requires-module` comment).
- The dead endpoint is **not** a refused connection—it is a path on the sink's own origin containing the word `dead`, which the sink answers with 503. This distinction matters for the retry semantics being tested.
- The consecutive-failure count after the first order can be 2 **or** 3 (not exactly 2) because the seed leaves an unpaid order whose cancellation adds a third row. The assertion uses `at.least(2).and.below(5)` to tolerate both.
- There is no `GET /webhooks/subscriptions/:id` route; `stateOf` must page through the list and filter by id.
- Re-enabling requires two separate UI actions: submitting the edit form with the new URL, **then** toggling the switch on the detail page. A single API call does not clear the failure count.
