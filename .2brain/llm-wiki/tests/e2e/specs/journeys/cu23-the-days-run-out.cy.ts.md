---
source: tests/e2e/specs/journeys/cu23-the-days-run-out.cy.ts
sha256: 862d4d9f47e35cd9e076541f1fbfe24388021fb083379dafd2a52055ee8443ac
generated_at: 2026-10-17T02:11:42.899342+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu23-the-days-run-out.cy.ts

## Purpose

E2E journey test for user story CU23 ("The days run out"): verifies that the withdrawal button and its deadline label persist through the last calendar day of the return window, disappear once that day has passed, and that the API rejects a withdrawal attempt with the `RETURN_WINDOW_CLOSED` error code. The deadline is always read from the order's `actions.withdrawUntil` field, so the test adapts to any configured window length.

## Key elements

- **`apiRefusesWithdrawal(orderId)`** — Logs in as `user` via the device-session tasks, POSTs to `/returns` with `{ orderId, reason: 'withdrawal' }`, and asserts a 4xx response whose error body includes `RETURN_WINDOW_CLOSED`.
- **`travelTo(target)`** — Calls the demo backend's `GET /__test/clock` to read the current server time, asserts `target` is in the future, then invokes the `cy.travel()` custom command to advance the demo clock.
- **`OrderLike` / `RefusalBody`** — Minimal structural types for the order deadline slice and the API error envelope, respectively.
- **Test: "an order delivered long ago offers no withdrawal…"** — Confirms the UI omits `#withdraw-button` and `[data-test=withdrawal-until]` for an expired order, and that the API refuses a direct withdrawal call.
- **Test: "the button is offered through the last day, and gone after it"** — (Demo-only) Reads the deadline from the order, travels to 23 h before it (still the last day), verifies the button is present; then travels past it, verifies the button is gone and the API refuses.

## Relationships

- **`scripts/e2e/device-session.ts`** — Imports the `Device` and `DeviceResponse` types. At runtime, the `cy.task('deviceLogin')` and `cy.task('deviceRequest')` calls dispatch to handlers registered by that module to obtain a session token and issue an authenticated API request without a browser context.

## Notes

- The file intentionally avoids importing from `support/e2e/harness` (or `scenario.ts`) so the spec does not retain a stale copy of the backend description after a live reset; it calls `cy.task` directly instead.
- The second test is gated behind `cy.skipUnlessDemo()` because it requires the demo backend's clock-travel endpoint (`/__test/clock` + `cy.travel`).
- After every clock advance the test clears all cookies and re-logs-in, because the elapsed (simulated) days invalidate the existing session.
- `travelTo` enforces a forward-only constraint: the target must be strictly greater than the current server clock, not merely the local `Date.now()`.
