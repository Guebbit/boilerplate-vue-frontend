---
source: tests/e2e/specs/harness.cy.ts
sha256: d2f4278e336be5dc2e7e64d219fe977aff9ab04f568ee8f4dddae14c30183540
signature: eae40f48d0d4595f2d1f22094cc6bfdb54f31974ad82dd186cf941638e830f26
generated_at: 2026-11-10T06:43:41.912040+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/harness.cy.ts

## Purpose

A single E2E spec that proves the journey-harness utilities work before any journey spec relies on them. It exercises `cy.travel`, session-mode reporting, persona and staff login flows, a second-device session, signed payment webhooks, the webhook sink, the job lever, browser helpers (clipboard, `window.open` stub), and `cy.restore`'s cache-clearing. Because the harness is shared infrastructure, it is validated here once rather than incidentally by whichever journey lands first.

## Key elements

- **`clockOffset()`** — local helper that fetches `GET /__test/clock` and returns the backend's `offsetMs` as a `Cypress.Chainable<number>`.
- **`FacetsBody`** — minimal interface for the `GET /products/facets` response used in the cache test.
- **`HOUR_MS` / `DRIFT_MS`** — constants: one hour in ms, and the 5 s tolerance for clock comparisons.
- **`describe('cy.travel')`** — asserts the demo clock advances by one hour and `cy.restore` resets it.
- **`describe('the session mode')`** — confirms the backend's `/config` reports the same `sessionMode` the suite was configured with.
- **`describe('the persona accounts')`** — verifies all five persona roles (`unverified`, `twoFactor`, `pendingEmail`, `banned`, `secondShopper`) are returned by `cy.accountOf`; checks two-factor backup codes (length 5); signs in as unverified/pendingEmail; confirms twoFactor stops at the challenge page; confirms banned is refused.
- **`describe('the staff accounts')`** — verifies the four staff roles (`manager`, `warehouse`, `support`, `operator`) have expected emails and each can sign in via the real form.
- **`describe('a second device')`** — uses `loginDevice` / `requestAsDevice` / `refreshDevice` to confirm a second device holds an independent session, can refresh, and is refused after a global sign-out.
- **`describe('a payment-provider webhook')`** — posts a signed webhook (204) and a stale-signature webhook (400) via `postPaymentWebhook`.
- **`describe('the webhook sink')`** — replays a seeded delivery through the admin API and asserts `webhookSink` received one request with a valid signature.
- **`describe('the job lever')`** — runs `cy.runJob('reap-orders')` (expecting `{ job, result: 0 }`) and confirms an unknown job name returns 404.
- **`describe('the browser helpers')`** — round-trips clipboard text after `cy.grantClipboard`; asserts `cy.stubWindowOpen` captures a `window.open` call.
- **`describe('cy.restore and the browser cache')`** — live-profile only: creates a product in a new category, reads facets through the page's own `fetch` (hitting the browser cache), runs `cy.restore` to delete it, then asserts a re-read does not replay the cached chips.

## Relationships

- **`tests/support/e2e/harness.ts`** — sole import source. Provides `loginDevice`, `refreshDevice`, `requestAsDevice` (second-device session management), `postPaymentWebhook` (signed webhook POST), and `webhookSink` (in-process listener that records incoming webhook deliveries). This spec is the acceptance test for all five exports.

## Notes

- Tests tagged with `cy.skipUnlessDemo()` (clock travel, webhook sink, job lever) depend on the backend's `/__test/*` endpoints or a locally hosted sink listener; they are skipped on the live profile.
- The browser-cache test uses `cy.skipUnlessLive()` because the demo profile has its response cache disabled, so `Cache-Control: max-age` would not be honoured.
- `cy.step` failure-prefix formatting is tested separately in `tests/unit/scripts/e2e/step-prefix.spec.ts`; this spec only *uses* `cy.step` for narrative readability.
- The spec assumes a shop build has already seeded webhook deliveries and staff/persona accounts; it does not create them.
