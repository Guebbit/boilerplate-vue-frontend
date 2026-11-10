---
source: src/modules/cart/tests/e2e/analytics.cy.ts
sha256: 251d50750b721af2fa8a1506f8f204e548f6375799c682724f187913f11be2cd
signature: 251d50750b721af2fa8a1506f8f204e548f6375799c682724f187913f11be2cd
generated_at: 2026-11-10T04:04:29.139319+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/analytics.cy.ts

## Purpose

Cypress end-to-end spec that asserts a single add-to-cart user action produces **exactly one** `cart_item_added` row in Umami, guarding against a double-emission bug where both the frontend cart store and the backend `POST /cart/items` handler fire the same event name. It also verifies that a plain page visit emits **zero** backend-owned events (`checkout_completed`, `order_created`, `payment_succeeded`). Only runnable against a live Umami instance; skipped under the demo profile.

## Key elements

- **`describe('Analytics, end to end')`** — top-level suite; calls `cy.skipUnlessLive()` in `beforeEach` so the whole file is inert when Umami is not wired up.
- **`it('records one add-to-cart once, not twice')`** — captures pre-state event/pageview counts, performs a real UI flow (login → visit in-stock product → click `[data-test=add-to-cart]`), then asserts:
  - Pageview delta ≥ 1 (control: proves the browser tracker actually reached Umami).
  - `cart_item_added` delta is exactly 1 (neither 0 — backend silent — nor 2 — both repos emitting).
- **`it('writes no server-owned event for a visit that changes nothing')`** — visits `/en`, confirms the pageview was recorded (tracker liveness), then asserts deltas of 0 for every backend-owned event name.
- **Consent gate** — both tests set `cy.setCookie('analyticsConsent', 'granted')` before any Umami tag can load.
- **Time window** — all counts use `since = Date.now() - 60 * 1000` to limit the query to roughly the last minute.

## Relationships

- **`tests/support/e2e/umami.ts`** — sole import source. Provides the Umami-API helpers this spec relies on: `umamiSession()` (auth/session token), `eventCounts(session, since)` (bulk event tally), `pageviewCount(session, since)` (pageview tally), `waitForEvent(session, since, name, minCount)` (poll until a named event hits a threshold), and `waitForPageviews(session, since, minCount)` (poll until pageviews hit a threshold). All assertions in this file are built on the values those helpers return.

## Notes

- **The pageview check is a control, not an assertion under test.** Without it, "one `cart_item_added` row" is ambiguous: a dead frontend + working backend and a working frontend + dead backend both yield delta 1. The pageview delta proves the browser half is live, so the one row can only be the backend's.
- **Delta-based, not absolute.** Every count is measured as `(after − before)` over a shared `since` window. This isolates this spec's traffic from whatever the rest of the parallel suite produced in the same minute.
- **UI-driven, not API-driven.** The add-to-cart is performed by clicking the real button after `cy.loginAs('user')` and `cy.subjectId('product.inStock')`. The point is to exercise the exact path where both trackers fire simultaneously.
- **`cy.restore()` is called once per test** (inside the first `it`, not in `beforeEach`). The file's header comment ties this to the same "live-only" reason as `cy.skipUnlessLive()`; if the demo profile ever wires Umami, both guards should be revisited together.
