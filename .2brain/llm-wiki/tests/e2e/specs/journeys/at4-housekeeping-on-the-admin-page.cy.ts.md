---
source: tests/e2e/specs/journeys/at4-housekeeping-on-the-admin-page.cy.ts
sha256: db8e8a7cad0fceca531a08be5e75b0ee7e6f7bd984ecf74ec1a894b8f3f37b73
signature: cedf2d75f94fa1e243f0035efc1601c29846a0cd35e814204e20a3d875aab00c
generated_at: 2026-11-10T06:50:37.596813+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at4-housekeeping-on-the-admin-page.cy.ts

## Purpose

Cypress e2e journey test for **AT4 · Housekeeping on the admin page**. It verifies that a shop administrator who is also the installation operator can (1) refresh the admin overview and confirm the parked-queue rows match the API response, (2) filter and reset the platform audit trail by action, and (3) connect, read, and disconnect the realtime event stream.

## Key elements

- **`HealthLike`** (interface) — minimal shape of the `GET /observability/health` response used in assertions: an optional `queues` array of `{ name, parked }`.
- **`beforeEach`** — visits `/en`, calls `cy.restore()`, then visits `/en` again to establish a clean session before each test.
- **Single `it` block** with four `cy.step` segments:
  - *Refresh* — intercepts `observability/health` and `observability/metrics/overview`, clicks the refresh button, asserts 200 responses, and checks that the number of `[data-test=parked-queue-row]` elements equals the queue count returned by the API.
  - *Audit filter* — opens the audit tab, types `auth.login` into the action filter, submits, asserts all visible rows contain that text; then filters by `no.such.action` (expects zero rows) and resets (expects rows again).
  - *Realtime stream* — navigates to `/en/playground/realtime`, connects, verifies status is "open" and the summary shows "snapshot"; toggles raw-events to see `uptimeSeconds` in the `<pre>` log; disconnects and verifies status is "closed".

## Relationships

- **`tests/support/e2e/steps.ts`** — imports and calls `refuseALogin()`, which triggers a failed login attempt to produce an incident entry in the platform audit trail. This gives the audit-filter step at least one row to assert against.

## Notes

- Requires the `account` and `observability` modules (declared via `// requires-module`).
- The seeded `root` user holds both admin and operator memberships; the test logs in as `admin`.
- Parked-queue rows are rendered **only** when the broker is enabled (`NODE_RABBITMQ_ENABLED`). Both the demo backend and the live recipe leave it off, so the test asserts row count against whatever the API returned rather than assuming a fixed number.
- The audit-filter assertion is written as a single `should()` with a callback to retry the whole check (length + every-row-contains) atomically, avoiding a race where the list refetch is in flight.
- The realtime raw-events checkbox uses `{ force: true }` because it may not be in the standard visible/interactive state for `.check()`.
