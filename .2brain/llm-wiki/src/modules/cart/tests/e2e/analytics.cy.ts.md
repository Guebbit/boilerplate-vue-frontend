---
source: src/modules/cart/tests/e2e/analytics.cy.ts
sha256: 3377d7bd26585ac2fbd7da2b504dbed0f71955ccb2469f40bf43cc3d2f3722c9
generated_at: 2026-10-02T15:01:25.830207+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/analytics.cy.ts

## Purpose

Cypress e2e spec that proves a single add-to-cart action produces exactly **one** `cart_item_added` row in Umami, guarding against a regression where both the frontend tracker and the backend `POST /cart` handler emit the same-named event independently. It can only run against a live Umami instance (skips under the demo profile) because the bug is invisible from either repo's unit suite.

## Key elements

- **`UmamiSession`** — carries `url`, `websiteId`, and `token` obtained at test time via `cy.env()` (module-scope `Cypress.env()` is unavailable due to `allowCypressEnv: false`).
- **`umamiSession()`** — logs into Umami's `/api/auth/login` with the compose-stack's seeded admin credentials and returns a `UmamiSession`.
- **`eventCounts(session, since)`** — queries Umami's `/metrics?type=event` endpoint; returns a name→count map of custom events in the window.
- **`pageviewCount(session, since)`** — queries Umami's `/stats` endpoint; returns the pageview count. Serves as the liveness control proving the browser tracker reached Umami.
- **`pollUntil(read, satisfied, deadline)`** — recursive poll loop (1 s interval, 20 s max) that settles on "at least" the expected value. Callers must assert with `.then`, not `.should`.
- **`waitForEvent` / `waitForPageviews`** — thin wrappers over `pollUntil` for the two metric types.
- **`describe('Analytics, end to end')`** — two tests:
  - *"records one add-to-cart once, not twice"* — clicks the real add-to-cart button, verifies pageview delta ≥ 1 (control), then asserts `cart_item_added` delta is exactly 1.
  - *"writes no server-owned event for a visit that changes no cart"* — (truncated in source) verifies zero spurious emissions for a non-mutating visit.

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf e2e spec that depends only on Cypress, the running application under test, and the Umami API at runtime.

## Notes

- **Live-only by design.** `cy.skipUnlessLive()` in `beforeEach` is the canonical gate; the demo profile wires no Umami, so there is no row to count.
- **Future-shifted `endAt`.** Both `eventCounts` and `pageviewCount` push `endAt` 5 min into the future to tolerate clock skew between the test machine and the Umami container.
- **Consent cookie.** Umami's tracker script loads only after `analyticsConsent=granted` is set; the test must plant this cookie before visiting the product page.
- **Polling over fixed waits.** The recursive `pollUntil` replaces a blanket `cy.wait` because the two write paths (browser tracker vs. backend `fetch`) have different latencies. The single `cy.wait(POLL_INTERVAL_MS)` inside the recursion is the only fixed sleep, bounded by the deadline.
- **`.then`, never `.should`, after `pollUntil`.** The yielded value is final; a retrying assertion would just time out and report a misleading error.
- **eslint suppression.** The `cypress/no-unnecessary-waiting` rule is disabled on the poll-interval `cy.wait` with an inline justification (third-party write, no DOM element to alias).
