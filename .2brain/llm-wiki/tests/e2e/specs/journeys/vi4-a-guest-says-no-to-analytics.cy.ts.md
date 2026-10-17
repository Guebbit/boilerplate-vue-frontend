---
source: tests/e2e/specs/journeys/vi4-a-guest-says-no-to-analytics.cy.ts
sha256: f10c199309c740658065cb7bd75f30fa6437b66f752c075c34c50e69276ede09
generated_at: 2026-10-17T02:23:09.882879+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi4-a-guest-says-no-to-analytics.cy.ts

## Purpose

E2E test that verifies the full analytics-consent journey for a guest visitor: declining hides the banner permanently for that session, blocks the Umami tag, and ensures no `x-analytics-consent` header is sent; then a fresh session where the visitor accepts loads the tag, sends the header, and produces `products_searched` rows in Umami that are counted against the actual intercepted requests.

## Key elements

- **`TRACKER`** – CSS selector (`script[data-website-id]`) used to assert whether Umami's loader script has been injected.
- **`Phase`** (`'declined' | 'accepted'`) – tags each intercepted request with which half of the story it belongs to.
- **`Seen`** – interface recording `phase`, `kind` (`search` | `list` | `view`), and the consent header value for every catalogue request the page makes.
- **`CONSENT_HEADER`** – the literal header name (`x-analytics-consent`) checked on intercepted requests.
- **`RUN`** – a `Date.now()`-derived suffix appended to every search text so no cached response from a prior run can satisfy the assertion.
- **`browse(phase, product, seen)`** – simulates one guest session: visits the catalogue, performs a text search (tagged with `RUN`), then opens a product page. Waits on the `@search` / `@view` intercepts.
- **`searchesOf(seen, phase)`** – returns the count of `kind === 'search'` entries for a given phase.
- **`describe` / `beforeEach` / `it`** – single test case. `beforeEach` clears all storage (overriding the global "denied" cookie) and skips the spec if the consent banner is absent (non-consent build).

## Relationships

- **`tests/support/e2e/umami.ts`** – provides `withUmami` (authenticates an Umami session), `eventCounts` (fetches event tallies since a timestamp), and `waitForEvent` (polls until a named event reaches an expected count). The test uses these to verify backend-side recording of `products_searched` rows.

## Notes

- The test **skips** rather than fails when the consent banner is missing, mirroring `consent.cy.ts`; it only runs on the consent build.
- `beforeEach` must clear cookies/localStorage because the **global hook** pre-answers "denied" for every spec; this spec deliberately starts as a first-time visitor.
- Search texts embed `RUN` (a millisecond timestamp) so the backend's cache cannot serve a repeated read; only requests whose text contains `RUN` are classified as `kind: 'search'`.
- The `resourceType: 'xhr'` filter on the `@view` intercept excludes document-level navigation requests that share the same URL pattern.
- The final Umami assertion compares the **delta** of `products_searched` against `searchesOf(seen, 'accepted')`, which simultaneously proves the declined half contributed zero rows without needing a separate wait.
- Requires the `@search` and `@view` intercepts to be registered before `browse` is called; the test sets them up inside the `it` body.
