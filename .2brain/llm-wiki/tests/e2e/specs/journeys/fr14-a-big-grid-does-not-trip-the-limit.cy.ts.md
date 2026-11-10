---
source: tests/e2e/specs/journeys/fr14-a-big-grid-does-not-trip-the-limit.cy.ts
sha256: 4c52aa716bf31d5403365a2ee07e03d63b470cfb6c7d82e60406ca0e7e28842b
signature: 4c52aa716bf31d5403365a2ee07e03d63b470cfb6c7d82e60406ca0e7e28842b
generated_at: 2026-11-10T07:04:55.614248+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr14-a-big-grid-does-not-trip-the-limit.cy.ts

## Purpose

E2E regression test for FR14: verifies that a signed-in shopper browsing a 50-card product grid, flipping through three pages, and opening one product incurs exactly **one** `GET /wishlist` request and **zero** HTTP 429 responses. The concern it guards against is that each product card's wishlist "heart" independently querying the server, which would burn the backend's per-minute rate-limit budget (`NODE_RATE_LIMIT_MAX`) across a single page view.

## Key elements

- **`PAGE_SIZE`** (const, 50) — the largest page size the shopper selects; used to assert card count.
- **`describe('FR14 · …')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` (a custom command to reset app state).
- **Single `it` block** — the full journey in one test:
  - Registers a **global `**` intercept** that records any response with status 429 into a local `refused` array.
  - Aliases `GET **/wishlist` as `@wishlist`.
  - Logs in via `cy.loginAs('user')`, navigates to `/en/products`, selects page size 50, and confirms 50 cards render.
  - Clicks `.v-pagination__next button` to reach pages 2 and 3, verifying the active page indicator.
  - Opens the first product card link and asserts the wishlist toggle exists.
  - Asserts `@wishlist.all` has length **1** and `refused` is an **empty array**.
- **`cy.step(…)`** calls — narrative step markers that segment the test into four readable phases (a custom Cypress command defined elsewhere in the project's support files).

## Relationships

No graph neighbors are registered. The file header declares `requires-module: products, wishlist`, meaning the test assumes both the **products** and **wishlist** modules (and their fixture/seed setup) are available in the test environment.

## Notes

- The 429 check is **route-agnostic** (`cy.intercept('**', …)`): any endpoint returning 429 fails the test, not just the wishlist call.
- The wishlist-request count assertion (`have.length, 1`) is the core invariant — it proves the heart indicators share a single read rather than issuing N per-card fetches.
- `cy.restore()` is a **custom** Cypress command (not a built-in); its behavior is defined elsewhere in the project's support files.
- The backend rate-limit ceiling is configured via `NODE_RATE_LIMIT_MAX`; this test does not set or mock that value — it relies on the real budget being tight enough that 50+ individual requests would be refused.
