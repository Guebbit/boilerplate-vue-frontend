---
source: tests/support/e2e/umami.ts
sha256: 52902ebe57080e60302f3aa5c2d6ca09d243f0d30b99dc53f6ec3e7858ec8840
signature: e6d4c4997c08ef3d569417fd22006a833032fedf893903219ecf229ef9c71c9c
generated_at: 2026-11-10T07:37:21.891334+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/umami.ts

## Purpose

Shared test-support helpers that let Cypress specs read Umami's own analytics API — log in, count recorded events/pageviews since a given moment, and poll until a fire-and-forget write becomes visible. It exists because neither this repo's nor the backend's test suite can answer "how many rows landed in Umami" without a live stack where both trackers point at the same instance.

## Key elements

- **`UmamiSession`** (interface) — `url`, `websiteId`, `token`; the bearer-auth connection carried between steps.
- **`INGEST_TIMEOUT_MS` / `POLL_INTERVAL_MS`** (constants) — 20 s max wait, 1 s poll cadence.
- **`umamiSession()`** — reads `cy.env` credentials, POSTs to `/api/auth/login`, returns an `UmamiSession`.
- **`eventCounts(session, since)`** — GETs `/metrics?type=event` and returns `Record<eventName, count>`.
- **`pageviewCount(session, since)`** — GETs `/stats` and returns the single pageview number (the tracker's unconditional load-time signal).
- **`pollUntil(read, satisfied, deadline?)`** — recursively polls `read` every `POLL_INTERVAL_MS` until `satisfied(value)` is true or `deadline` passes; returns the last observed value.
- **`waitForEvent(session, since, name, expected)`** — `pollUntil` over `eventCounts` for a specific event name.
- **`waitForPageviews(session, since, expected)`** — `pollUntil` over `pageviewCount`.
- **`withUmami(inspect)`** — runs `inspect(session)` only when `cy.env('liveProfile')` is `true`; no-op on the demo profile (which has no Umami behind it).
- **`unknownShape(endpoint, body)`** (internal) — throws a descriptive `Error` when the API returns a structure the helper does not recognise.

## Relationships

- **`src/modules/cart/tests/e2e/analytics.cy.ts`**, **`tests/e2e/specs/journeys/ac12-my-privacy-choices-stick.cy.ts`**, **`tests/e2e/specs/journeys/cu25-one-purchase-one-row-per-event.cy.ts`**, **`tests/e2e/specs/journeys/vi4-a-guest-says-no-to-analytics.cy.ts`** — all are consumers that import the exported helpers (`umamiSession`, `waitForEvent`, `waitForPageviews`, `withUmami`) to verify what landed in Umami after UI interactions.
- **`scripts/lighthouse/evaluate.ts`** — listed as a graph neighbor; no direct import or call is visible in this file's content.

## Notes

- **No `Cypress.env()` at module scope.** The project sets `allowCypressEnv: false`, so settings are read via the command-style `cy.env()` inside `umamiSession()` and the result is threaded around as a plain value (`UmamiSession`).
- **`endAt` is shifted +5 min into the future.** The Umami container's clock may be ahead of the host; a window ending at "now" would silently drop a legitimately-written row. Both `eventCounts` and `pageviewCount` apply this.
- **Polling is "at least", never "exactly."** `pollUntil` stops as soon as the count *reaches* the threshold. Exact-count assertions belong in the spec's `.then`, not in the polling predicate.
- **Callers must use `.then`, not `.should`, on `pollUntil`'s return.** The value is final once polling stops; `.should` would re-check the same numbers until Cypress's command timeout and report a misleading "timed out retrying."
- **Version-pinned to Umami 2.14.** `pageviewCount` reads `body.pageviews.value` (2.x shape); Umami 3.x returns a bare number and would trip `unknownShape`. The stack pins the version; running `latest` will break the helper.
- **`withUmami` is the gate for dual-profile journeys.** Specs whose UI half runs on both the demo and live profiles wrap their Umami reads in `withUmami` so the demo-profile run does not attempt a network call to a non-existent backend.
- **The `eslint-disable` on `cy.wait`** inside `pollUntil` is intentional: the delay is a bounded poll interval against a third-party service (not a UI race), and the overall bound is `deadline`.
