---
source: tests/e2e/specs/journeys/vi4-a-guest-says-no-to-analytics.cy.ts
sha256: 44d89eace7e050fef8beca6243b1e7b304d6b4680f14b9057c577ca59016bf94
signature: e2a00eeac69edd30ea261d57337955c59dcce74991dd581cb4011f50ba6494de
generated_at: 2026-11-10T07:22:57.626506+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi4-a-guest-says-no-to-analytics.cy.ts

## Purpose

End-to-end test for the guest analytics-consent journey (VI4). Verifies that a first-time visitor who declines the consent banner keeps the banner and Umami tracker absent across a reload, sends no `analytics-consent` header on catalogue requests, and leaves no `products_searched` rows in Umami; then, in a fresh session, accepting consent loads the tracker, attaches the header, and produces one Umami row per accepted search. The test self-skips when the consent build is not present (no banner rendered).

## Key elements

- **`browse(phase, product, seen)`** – Simulates one guest browsing pass: visits `/en/products`, waits for the search intercept, types a phase-unique search query, waits for the search to be recorded in `seen`, then opens one product detail page.
- **`searchesOf(seen, phase)`** – Counts how many `kind: 'search'` entries in `seen` belong to the given phase.
- **`TRACKER`** – CSS selector `script[data-website-id]`; the only attribute Umami's loader injects, used to assert tracker presence/absence.
- **`Phase`** – Union type `'declined' | 'accepted'` that tags each intercepted request with which half of the story it belongs to.
- **`Seen`** – Interface for one catalogue request: `{ phase, kind: 'search'|'list'|'view', consent }`.
- **`RUN`** – `Date.now()` string embedded in every search query so the text is guaranteed unique and never answerable from a prior run's cache.
- **`CONSENT_HEADER`** – `'analytics-consent'`, the header the page sends on anonymous requests after consent.
- **`describe` block / `beforeEach`** – Clears cookies and local storage to reset to a first-time visitor, re-visits `/en`, and skips the test if the consent banner (`[data-test=analytics-consent-banner]`) is absent.
- **Single `it` spec** – Walks the full story: banner visible → decline → reload → browse-as-decliner → fresh session → accept → browse-as-consenter → assert Umami row delta equals accepted-search count.

## Relationships

- **`tests/support/e2e/umami.ts`** – Imports `eventCounts`, `waitForEvent`, and `withUmami`. These helpers query Umami's live session (via the `session` object they provide) to snapshot event counts before and after the test, and to poll until the expected `products_searched` row count is reached. All Umami assertions in this spec go through this module.

## Notes

- **Self-skip on consent build:** If the banner element is not in the DOM after visiting `/en`, the test calls `this.skip()`. This mirrors the pattern in `consent.cy.ts` and means the spec is inert on builds where analytics consent is not compiled in.
- **Unique search text (`RUN`):** The search query is prefixed with `vi4-<phase>-<timestamp>`. This guarantees the backend treats it as a first-ever read (no cache hit), making the row-count assertion deterministic. Plain list or repeat-view reads may or may not emit a `products_searched` row because the backend serves cached catalogue reads without running the event-emitting code path.
- **`resourceType: 'xhr'` on the view intercept:** The product-detail URL pattern also matches the browser's own document navigation request. Filtering to XHR ensures only the API call is recorded, not the page load.
- **Global hook override:** The project's global `beforeEach` (or fixture) answers the consent prompt with "denied" for every spec. This test explicitly clears cookies/localStorage and re-visits to reset to the true first-time state before asserting the banner appears.
- **Counting strategy:** Rather than asserting a fixed total row count, the spec captures `before` counts, runs the accepted half, then asserts the *delta* equals `searchesOf(seen, 'accepted')`. This simultaneously proves the declined half contributed zero rows without needing a separate negative assertion or a timeout on a row that will never appear.
