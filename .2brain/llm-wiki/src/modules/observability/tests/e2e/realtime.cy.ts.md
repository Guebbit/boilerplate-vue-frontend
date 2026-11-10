---
source: src/modules/observability/tests/e2e/realtime.cy.ts
sha256: b3c0f15166061eeb29fdd0751a7ee07c9abf32d189eba4f74698f7a537978b1b
signature: b3c0f15166061eeb29fdd0751a7ee07c9abf32d189eba4f74698f7a537978b1b
generated_at: 2026-11-10T04:54:49.126902+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/e2e/realtime.cy.ts

## Purpose

Cypress end-to-end test for the live observability stream. It opens a real `EventSource` on the operator's session cookie (via the playground UI), verifies the server's initial snapshot, then generates its own traffic and asserts a subsequent server-pushed update reflects that traffic — proving the stream is live rather than replayed.

## Key elements

- **`describe('Realtime observability stream')`** – Single-suite wrapper; `beforeEach` visits `/en` and calls `cy.restore()` to reset server state.
- **`it('renders the connect snapshot, then an update counting traffic sent since')`** – The only test. Steps:
  1. Logs in as `admin`, navigates to `/en/playground/realtime`.
  2. Clicks `[data-test=realtime-connect]`, asserts status shows "open" and feed summary shows "snapshot".
  3. Reads the current request counter from `[data-test=realtime-requests] .font-semibold`.
  4. Fires 5 unauthenticated `GET {apiUrl}/products` requests to generate measurable traffic.
  5. Waits (up to 20 s) for the counter to be ≥ `before + 5` and for the feed summary to no longer read "snapshot".

## Relationships

No dependency-graph neighbors are recorded for this file. At runtime it interacts with:

- The **playground realtime page** (`/en/playground/realtime`) and its `data-test` hooks.
- The **server's `/products` endpoint** (public, read-only) used to generate traffic.

## Notes

- The e2e build sets `VITE_VALIDATE_RESPONSES`, so every SSE frame is validated against the AsyncAPI contract in flight; a schema drift will fail this test before the UI assertions even run.
- The counter value is read via the Tailwind class `.font-semibold`. If that utility name changes (e.g., Tailwind v4 rename), this selector breaks silently — there is no dedicated `data-test` on the numeric span itself.
- The 20 s timeout exists because the server pushes `metrics.updated` on a ~5 s cadence; under CI load a couple of ticks may be needed.
- The assertion uses `at.least`, not strict equality, to tolerate requests still in flight at read time.
