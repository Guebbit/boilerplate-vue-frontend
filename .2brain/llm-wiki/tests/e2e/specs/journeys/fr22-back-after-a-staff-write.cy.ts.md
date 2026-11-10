---
source: tests/e2e/specs/journeys/fr22-back-after-a-staff-write.cy.ts
sha256: 7ce2f7a0a9fa41dd2b7621b2abdd8b7a5383453303d0ddd99d8f265e0d3e8351
signature: 7ce2f7a0a9fa41dd2b7621b2abdd8b7a5383453303d0ddd99d8f265e0d3e8351
generated_at: 2026-11-10T07:06:42.664446+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr22-back-after-a-staff-write.cy.ts

## Purpose

End-to-end test for FR22: verifies that after a warehouse user ships a paid express order and presses the browser **Back** button, the orders list reflects the shipped status (not a stale cached "paid"), and that **Forward** and **reload** both show the shipment with no re-ship button. It guards against browser-history caching desyncing the list from the order detail after a staff write.

## Key elements

- **`TRACKING_CODE`** (`'FR22-TRACK-001'`) – constant used as the express parcel tracking value during the ship step.
- **`beforeEach`** – visits `/en`, calls `cy.restore()` (state reset), then revisits `/en` to ensure a clean session.
- **`it('the list, the order and a reload all agree the order shipped')`** – the single scenario: filters the orders list to `order.paidExpress`, opens it, marks started, ships with the tracking code, then asserts consistency across Back (list row says *Shipped*), Forward (shipment panel present, ship button absent), and reload (same as Forward).

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `listedIds` (extracts visible row IDs for deep-equality assertions) and `submitSearch` (triggers the filter form submission). Both are the only helpers this spec relies on for list-level assertions.

## Notes

- The leading `// requires-module: delivery, orders` comment is a tag consumed by the test runner to gate execution on those feature modules; the test will be skipped if either module is disabled.
- `cy.subjectId('order.paidExpress')` pulls a pre-seeded fixture order rather than creating one inline, keeping the scenario deterministic.
- The test does **not** assert the *absence* of the ship button on Back (only on Forward/reload); the Back step only checks the list row text. This is intentional—Back returns to the list, not the detail page.
