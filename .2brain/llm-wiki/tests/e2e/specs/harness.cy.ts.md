---
source: tests/e2e/specs/harness.cy.ts
sha256: 5fd968d3da6c197f55d3083a192a3b3ed53b5823196b6c781622459c88a72f61
generated_at: 2026-10-17T02:03:38.016578+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/harness.cy.ts

## Purpose

Meta-spec that validates the journey-harness infrastructure itself (`cy.travel`, session mode, persona/staff accounts, second device, signed webhooks, webhook sink, job lever, and browser helpers) so that journey specs can rely on those primitives without re-proving them. Each capability is exercised once here; if it breaks, the failure points at the harness rather than at whichever journey spec happened to run first.

## Key elements

- **`clockOffset()`** – Reads the backend's demo-clock offset (`GET /__test/clock`) and returns it as a `Cypress.Chainable<number>`.
- **`FacetsBody`** – Minimal interface for the `data.categories` slice of `GET /products/categories` used by the cache test.
- **`HOUR_MS` / `DRIFT_MS`** – Constants (3 600 000 ms, 5 000 ms) used as tolerance bounds when asserting clock travel.
- **`describe('cy.travel')`** – Verifies that `cy.travel(HOUR_MS)` advances the backend clock and `cy.restore()` reverses it.
- **`describe('the session mode')`** – Asserts the backend's `/account/session-config` mode matches the `sessionMode` env value that journey specs were written against.
- **`describe('the persona accounts')`** – Confirms five persona roles (`unverified`, `twoFactor`, `pendingEmail`, `banned`, `secondShopper`) are returned by the backend with correct emails; checks two-factor backup codes, successful logins, the 2FA challenge screen, and banned-account rejection.
- **`describe('the staff accounts')`** – Verifies four staff roles (`manager`, `warehouse`, `support`, `operator`) exist, have `role@example.com` emails, and can sign in via the real form.
- **`describe('a second device')`** – Uses `loginDevice`, `requestAsDevice`, and `refreshDevice` to confirm an independent bearer/cookie session survives until `logout-all` revokes it.
- **`describe('a payment-provider webhook')`** – Calls `postPaymentWebhook` with a fresh and an hour-old timestamp; expects 200 vs 400 respectively.
- **`describe('the webhook sink')`** – Replays a seeded delivery via the admin API and asserts `webhookSink.requests()` captures exactly one request with a valid signature.
- **`describe('the job lever')`** – POSTs to `/__test/jobs/reap-orders` (expects `{ job, result: 0 }`) and to a non-existent job name (expects 404).
- **`describe('the browser helpers')`** – Exercises `cy.grantClipboard()` (write-then-read round-trip) and `cy.stubWindowOpen()` (asserts the stub alias was called).
- **`describe('cy.restore and the browser cache')`** – Live-profile only (`cy.skipUnlessLive()`): creates a product in a new category, reads facets through the browser (populating HTTP cache), runs `cy.restore()` to delete the product, then asserts the next browser read does **not** replay the cached chips.

## Relationships

- **`tests/support/e2e/harness.ts`** – Source of the five imported utilities: `loginDevice`, `postPaymentWebhook`, `refreshDevice`, `requestAsDevice`, and `webhookSink`. This spec is the primary consumer that proves those helpers work before journey specs depend on them.

## Notes

- Tests guarded by `cy.skipUnlessDemo()` (clock, webhook sink, job lever) rely on the backend's `/__test/*` endpoints and a locally-hosted sink listener; they are silently skipped on non-demo profiles.
- The cache test is gated by `cy.skipUnlessLive()` because it requires a real `Cache-Control: max-age` response, which the demo profile disables.
- `cy.step`'s failure-prefix formatting is deliberately **not** tested here; it lives in `tests/unit/scripts/e2e/step-prefix.spec.ts`.
- `beforeEach` calls `cy.visit('/en')` then `cy.restore()` to reset state between tests, including the demo clock.
