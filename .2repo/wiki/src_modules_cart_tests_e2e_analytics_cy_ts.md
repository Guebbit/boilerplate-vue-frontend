# src/modules/cart/tests/e2e/analytics.cy.ts

## Purpose

End-to-end Cypress spec that verifies a single add-to-cart action produces exactly **one** `cart_item_added` row in Umami, guarding against a double-count bug where both the frontend cart store and the backend `POST /cart/items` handler emit the same-named event. It also asserts that a mere page visit writes no server-owned events. The spec queries Umami's API directly (not the app under test) to count rows, because the bug was invisible from either repo's own unit suite.

## Key elements

- **`UmamiSession`** — interface carrying `url`, `websiteId`, and bearer `token` for authenticated Umami API calls. Passed as a value (not read from `Cypress.env()`) because `allowCypressEnv: false` is set.
- **`umamiSession()`** — logs in to Umami (`/api/auth/login`) with the compose-stack's seeded admin credentials and returns a populated `UmamiSession`.
- **`eventCounts(session, since)`** — fetches custom-event counts from `/api/websites/:id/metrics?type=event` over a window starting at `since`. Returns `Record<string, number>`.
- **`pageviewCount(session, since)`** — fetches pageviews from `/api/websites/:id/stats`. Serves as the liveness control proving the browser tracker reached this Umami instance.
- **`pollUntil(read, satisfied, deadline)`** — generic recursive poller (1 s interval, 20 s deadline). Settles on "at least" the threshold; callers assert the exact value afterward. Callers must use `.then`, not `.should`, on the result.
- **`waitForEvent` / `waitForPageviews`** — thin wrappers over `pollUntil` for the two Umami queries.
- **`describe('Analytics, end to end')`** — two tests:
  1. *"records one add-to-cart once, not twice"* — captures before-counts, performs a UI-driven add-to-cart, confirms the pageview delta (control), then asserts the `cart_item_added` delta is exactly 1.
  2. *"writes no server-owned event for a visit that changes nothing"* — asserts a page visit with no cart mutation produces a zero delta for server-owned event names.

## Relationships

No graph neighbors are listed. The spec is self-contained; it depends only on the live Umami API (authenticated via the compose stack) and the app-under-test's public UI surface (`/en/products/:id`, `[data-test=add-to-cart]`).

## Notes

- **Skips under the demo profile** via `cy.skipUnlessLive()` in `beforeEach`. The demo profile wires no Umami, so there is no row to count. The skip reason is co-located with `cy.resetState()` to keep the "live-only" policy in one place.
- **`endAt` is shifted +5 min into the future** in both query helpers to tolerate clock skew between the API container and the test runner. Setting `endAt` to wall-clock "now" could drop a row written a second in the future by a fast container, producing a false pass.
- **The pageview control is load-bearing.** Without it, a broken backend + silent frontend and a correct backend + still-emitting frontend both yield a delta of 1. The pageview check proves the browser half is live, so the single `cart_item_added` row can only be the backend's.
- **`pollUntil` uses "≥" semantics; exactness is asserted in the test.** Waiting for a count to *stop rising* is indistinguishable from a late second write. The deliberate `cy.wait` for the poll interval is exempted from `cypress/no-unnecessary-waiting` because it polls a third-party system with no aliased request to await.
- **Credentials come from `cy.env()` (stateful), not `Cypress.env()`**, due to the project's `allowCypressEnv: false` setting. The admin user is seeded by `umami-init` in the backend's `docker-compose.yml`.
