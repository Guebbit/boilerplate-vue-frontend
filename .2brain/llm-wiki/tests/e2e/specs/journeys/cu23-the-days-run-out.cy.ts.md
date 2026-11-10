---
source: tests/e2e/specs/journeys/cu23-the-days-run-out.cy.ts
sha256: 330b1cd5daf239aa9b8902f475c6d1cc658eccfb22852fd54691e837357bd057
signature: 91557416bc805430b0912f0a8119e4ee0543f99204d4399c4cd2f39d857625a7
generated_at: 2026-11-10T06:57:36.806437+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu23-the-days-run-out.cy.ts

## Purpose

End-to-end journey test verifying that the withdrawal (right of withdrawal) window has a hard calendar-day boundary: the UI disables the button and the API returns `RETURN_WINDOW_CLOSED` once the deadline passes, while the legal-guarantee path (defective goods) remains available. The deadline is read dynamically from `Order.withdrawUntil` so the spec works regardless of the configured window length.

## Key elements

- **`HOUR_MS`** – Constant (3 600 000 ms) used to offset the demo clock in whole-hour increments.
- **`OrderLike`** – Minimal interface exposing only `withdrawUntil?`, the slice of order data this spec consumes.
- **`RefusalBody`** – Shape of the API error envelope (`errors: { code? }[]`) asserted on refused calls.
- **`apiRefusesWithdrawal(orderId)`** – Logs in as a fresh device, `POST /returns` with reason `"withdrawal"`, and asserts a 4xx status containing the `RETURN_WINDOW_CLOSED` code.
- **`travelTo(target)`** – Reads the demo backend's current clock via `GET /__test/clock`, asserts forward-only movement, then advances it to `target`.
- **`describe('CU23 · The days run out')`** – Two test cases:
  - *Long-expired order* (any profile): button disabled, reason text shown, API refuses.
  - *Walk to deadline* (demo profile only, `cy.skipUnlessDemo()`): button still offered at 01:00 on the last day, still offered on the next "silent grace" day, disabled and API-refusing a day after that; defective-goods reason remains in the return form.

## Relationships

- **`scripts/e2e/device-session.ts`** – Type-only import of `Device` and `DeviceResponse`, used as generic parameters on the `cy.task` calls inside `apiRefusesWithdrawal` to type-check the task payloads and responses.

## Notes

- The spec calls `cy.task` directly rather than going through `support/e2e/harness`; importing that module would pull in `scenario.ts`, causing a stale copy of the backend description to persist across live resets.
- The second test mutates server time, so it is gated behind the **demo profile** (`cy.skipUnlessDemo()`). The first test works on any profile.
- The "silent grace day" is an intentional product rule: the button stays *enabled* on the calendar day after the announced deadline, and only flips to disabled the day after that.
- `travelTo` enforces forward-only clock movement (`expect(target).to.be.greaterThan(now)`), so tests must be ordered chronologically or the assertion will fail.
