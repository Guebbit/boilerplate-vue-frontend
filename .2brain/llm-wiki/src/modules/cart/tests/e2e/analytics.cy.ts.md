---
source: src/modules/cart/tests/e2e/analytics.cy.ts
sha256: d6efdcad567d20114a647e1d3b44d10ae0e7f78f815f167f176a46d5371a8a12
generated_at: 2026-10-17T00:39:29.164420+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/analytics.cy.ts

## Purpose

Live-only Cypress e2e spec that proves a single add-to-cart click writes exactly **one** `cart_item_added` row into Umami (not two, since both frontend and backend historically fired the same event name) and that a plain page visit triggers no backend-owned events. The spec exists because the double-emission bug was invisible from either repo's own test suite: both sides asserted their own emission and both passed.

## Key elements

- **`describe('Analytics, end to end')`** — suite gated by `cy.skipUnlessLive()` in `beforeEach`, so it never runs under the demo profile (which wires no Umami backend).
- **`records one add-to-cart once, not twice`** — performs a real UI click on an in-stock product, then asserts the `cart_item_added` count delta is exactly 1. Includes a **pageview liveness control**: first confirms the browser tracker reached Umami (pageview count moved), so the single row can be attributed to the backend.
- **`writes no server-owned event for a visit that changes nothing`** — visits `/en`, confirms the pageview incremented (tracker was awake), then asserts `checkout_completed`, `order_created`, and `payment_succeeded` deltas are all 0.
- **Consent cookie** — both tests set `analyticsConsent = 'granted'` before visiting, because Umami's tag only loads after consent.
- **Delta-based assertions** — all counts are measured as `after − before` over a 60-second lookback window, so activity from other suites or users doesn't cause spurious failures.

## Relationships

- **`tests/support/e2e/umami.ts`** — sole import source. Provides `umamiSession`, `eventCounts`, `pageviewCount`, `waitForEvent`, and `waitForPageviews`, which encapsulate all Umami API polling and session handling used by this spec.

## Notes

- The pageview check is not a cosmetic assertion; it is the **control** that disambiguates "frontend broken + backend correct" from "frontend correct + backend broken." Without it both scenarios yield a delta of 1 for `cart_item_added`.
- `cy.restore()` is called in the first test (resets app state before the click) but is **absent** in the second — the second test only needs the consent cookie and a visit, no cart mutation.
- The spec intentionally avoids hitting the API directly; the add-to-cart action goes through the UI (`[data-test=add-to-cart]`) so both trackers fire in the same request cycle a real user would produce.
- The 60-second window is a convention borrowed from the rest of the repo's live specs; it is not configurable here.
