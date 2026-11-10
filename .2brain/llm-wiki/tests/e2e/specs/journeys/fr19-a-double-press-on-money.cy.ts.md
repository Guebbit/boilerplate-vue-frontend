---
source: tests/e2e/specs/journeys/fr19-a-double-press-on-money.cy.ts
sha256: cd9d0af83573facd83991dc931719539fd5e6e3896c2d85ecdd52a3aea2031fb
signature: d44c2b9478a5ddf47217522efdbbc00b6af3b85326dee351566c65371f87fed8
generated_at: 2026-11-10T07:06:01.729301+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr19-a-double-press-on-money.cy.ts

## Purpose

E2E spec for FR19: verifies that a rapid double-press (`.dblclick()`) on a money-moving or destructive control (cancel order, withdraw, ship) produces exactly one effect. Each write is artificially delayed 1.5 s so the in-flight/disabled state is observable, then the spec confirms the dialog never doubles, the API sees a single state change, and no error is rendered.

## Key elements

- **`WRITE_DELAY_MS`** (1500) — how long intercepted write responses are held back to expose the in-flight window.
- **`TRACKING_CODE`** (`'FR19-TRACK-001'`) — the tracking string typed into the warehouse ship form.
- **`OrderState`** — minimal interface (`id`, `status`) describing what the API returns for an order.
- **`orderNow(role, orderId)`** — fetches an order via `cy.apiAs` as `user` or `warehouse`; throws if the order is missing.
- **`holdAndRecordWrites()`** — installs a `cy.intercept` on all `POST|PUT|PATCH|DELETE` requests (excluding `/search`), adds a 1.5 s response delay, and returns a mutable array of recorded write strings so each test can assert exactly one was sent.
- **`pressTwiceAndConfirmTwice(trigger)`** — double-clicks the trigger, asserts at most one visible confirmation dialog, double-clicks the confirm button, then asserts the dialog is gone.
- **Three `it` blocks** — customer cancels a paid order, customer withdraws a paid order, warehouse ships a paid-express order. Each calls `holdAndRecordWrites`, drives the UI, then asserts single-effect via `eventually(orderNow …)` and `writes.length === 1`.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the `eventually` retry-until-true helper used in all three cases to poll the API until the expected order status appears.

## Notes

- The file header lists `requires-module: account, delivery, orders, returns` — the test runner must provision those modules before this spec executes.
- `holdAndRecordWrites` deliberately excludes URLs matching `/search(\?|$)` from the write count, treating search POSTs as reads.
- The double-click is synthetic and synchronous (Cypress `dblclick()`), chosen as the "strictest form" per the module doc-comment.
- No real payment card is involved; money moves are simulated server-side, so no provider budget is consumed.
- The warehouse test does **not** use `pressTwiceAndConfirmTwice` (no confirmation dialog); it calls `.dblclick()` on the ship submit directly and asserts the form is replaced by a single shipment entry.
