# src/modules/cart/tests/e2e/analytics.cy.ts

## Purpose

Cypress e2e spec that verifies a single add-to-cart action produces exactly **one** `cart_item_added` row in Umami, rather than two (one from the frontend tracker, one from the backend `POST /cart/items` handler). The bug it guards against was invisible to unit tests in either repo because both sides independently asserted their own emission and both passed. Only a live run querying Umami's API for the actual row count can distinguish "one write" from "two writes of the same name."

## Key elements

- **`UmamiEventMetric`** — shape of a single aggregated event row (`x` = name, `y` = count) returned by Umami's metrics API.
- **`UmamiSession`** — bundles `url`, `websiteId`, and `token` for authenticated Umami API calls. Passed as a value (not read from module scope) because `allowCypressEnv: false` makes `Cypress.env()` unavailable outside a command.
- **`umamiSession()`** — logs in to Umami's auth API using the compose-stack's seeded admin credentials (from `docker-compose.yml`'s `umami-init`) and returns an `UmamiSession`.
- **`eventCounts(session, since)`** — fetches event metrics for a time window and returns a `Record<string, number>` map. Pushes `endAt` 5 minutes into the future to tolerate container clock skew.
- **`waitForEvent(session, since, name, expected, deadline)`** — recursively polls `eventCounts` every 1 s until `name` reaches `expected` or the deadline expires. Settles on "at least," never "exactly," because a count that hasn't stopped rising is indistinguishable from a pending second write. Callers must assert with `.then`, **not** `.should`, because the yielded object is immutable.
- **`describe('Analytics, end to end')`** — two tests:
  - *records one add-to-cart once, not twice* — clicks the UI add-to-cart button, then asserts `cart_item_added` delta is exactly 1. Uses `app_started` delta as a **control** to prove the browser tracker actually reached this Umami instance (without it, a dead frontend + live backend is indistinguishable from a live frontend + dead backend).
  - *writes no server-owned event for a visit that changes nothing* — visits `/en` and asserts that backend-owned events (`checkout_completed`, `order_created`, `payment_succeeded`) show zero delta, while `app_started` does increment (confirming the tracker was awake).

## Relationships

No graph neighbors are recorded.

## Notes

- **Skip behavior:** `cy.skipUnlessLive()` in `beforeEach` makes this spec run only when a live Umami is wired up. The demo profile (`npm run test:e2e`) has no Umami, so there is no row to count. This mirrors the same condition that gates `cy.resetState()`.
- **`.then` vs `.should` on `waitForEvent`:** The spec deliberately calls `.then(counts => expect(...))` after `waitForEvent`. Using `.should` would cause Cypress to re-assert against the *same* frozen object until timeout, producing a misleading "timed out retrying" error.
- **`cy.wait(POLL_INTERVAL_MS)` is eslint-suppressed:** The standard `no-unnecessary-waiting` rule targets fixed sleeps between UI actions. Here the sleep is a poll interval against a third system (Umami) that neither repo drives, bounded by `deadline`.
- **Delta, not absolute count:** Both tests compute `counts[name] - before[name]` rather than asserting on the window total, so prior test activity in the same Umami website doesn't cause false failures.
- **Product selection:** The add-to-cart test picks a product by accessibility role (`cy.productInRole('inStock')`) rather than a hardcoded ID, so any in-stock product exercises the same path.
