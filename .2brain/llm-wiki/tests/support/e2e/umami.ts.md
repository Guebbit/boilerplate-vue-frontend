---
source: tests/support/e2e/umami.ts
sha256: 52902ebe57080e60302f3aa5c2d6ca09d243f0d30b99dc53f6ec3e7858ec8840
generated_at: 2026-10-17T02:27:27.011361+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/umami.ts

## Purpose

Shared Cypress helpers for reading Umami's own API during e2e runs: log in, count events/pageviews recorded since a timestamp, and poll until a fire-and-forget write becomes visible. Exists because the question "how many rows does Umami hold?" is only answerable against a live Umami instance, which neither repo's unit suite can provide.

## Key elements

- **`UmamiSession`** (interface) — `{ url, websiteId, token }` carried as a value (not module state) because `allowCypressEnv: false` blocks `Cypress.env()`; settings arrive via `cy.env()`.
- **`INGEST_TIMEOUT_MS` / `POLL_INTERVAL_MS`** — 20 s deadline and 1 s pause between API polls.
- **`umamiSession()`** — POSTs to `/api/auth/login` with the compose-stack's seeded admin and returns a `UmamiSession`.
- **`eventCounts(session, since)`** — GET `/metrics?type=event`; returns a `Record<string, number>` mapping event name → count.
- **`pageviewCount(session, since)`** — GET `/stats`; returns the pageview count (the tracker's unconditional write).
- **`pollUntil(read, satisfied, deadline?)`** — recursive poll that settles on "at least" semantics; returns the value from the last poll.
- **`waitForEvent(session, since, name, expected)`** — `pollUntil` over `eventCounts`.
- **`waitForPageviews(session, since, expected)`** — `pollUntil` over `pageviewCount`.
- **`withUmami(inspect)`** — runs `inspect` on the live profile; no-ops on the demo profile (no Umami behind it).
- **`unknownShape(endpoint, body)`** — throws a descriptive `Error` when a response shape doesn't match Umami 2.14.

## Relationships

- **`src/modules/cart/tests/e2e/analytics.cy.ts`** — imports the session/poll helpers to verify that cart actions produce the expected Umami event rows.
- **`tests/e2e/specs/journeys/ac12-my-privacy-choices-stick.cy.ts`** — consumes `withUmami` / `waitForEvent` to assert that a persisted privacy choice still suppresses (or allows) analytics writes on subsequent visits.
- **`tests/e2e/specs/journeys/cu25-one-purchase-one-row-per-event.cy.ts`** — uses `waitForEvent` to confirm exactly one row per purchase event.
- **`tests/e2e/specs/journeys/vi4-a-guest-says-no-to-analytics.cy.ts`** — uses `withUmami` and `waitForPageviews` to verify that declining analytics produces no additional event rows (pageviews may still appear).

## Notes

- **Clock skew:** `endAt` is set to `Date.now() + 5 min`, not `Date.now()`, because the Umami container's clock may lead the host. A window ending at "now" would silently drop a row written a second in the future.
- **At-least, not exactly:** `pollUntil` deliberately accepts the first value that satisfies the predicate. Waiting for a count to *stop* rising is indistinguishable from a second write still in flight. Exact-count assertions belong in the test, after polling resolves.
- **`.then` not `.should`:** Because `pollUntil` yields a settled value, wrapping the result in `cy.should(...)` retries against a constant and reports a spurious timeout.
- **Umami 2.x only:** `pageviewCount` reads `body.pageviews.value`; Umami 3.x returns a bare number and will hit `unknownShape`.
- **`cy.wait` suppression:** The `// eslint-disable-next-line cypress/no-unnecessary-waiting` inside `pollUntil` is intentional — it is a bounded poll against a third-party system, not a UI-action delay.
- **Credentials come from the compose stack:** `umami-init` in the backend's `docker-compose.yml` seeds the admin user so no manual step is needed.
