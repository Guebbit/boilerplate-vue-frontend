---
source: tests/e2e/specs/journeys/at4-housekeeping-on-the-admin-page.cy.ts
sha256: f5e74594299de58dbcc5f865ec6e8a7b0c81c32eb3de94c6e49502bcd1f45550
generated_at: 2026-10-17T02:07:42.089915+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at4-housekeeping-on-the-admin-page.cy.ts

## Purpose

End-to-end journey test (AT4) that verifies the admin/operator housekeeping workflow: refreshing the admin overview, filtering the platform audit trail by action, and driving the realtime stream (connect → read raw events → disconnect). It exists to confirm the operator can perform these routine tasks without error against the full application.

## Key elements

- **`HealthLike`** — local interface shaping the `GET /observability/health` response slice (array of `{ name, parked }` worker queues) used to assert queue-row counts.
- **`describe('AT4 · Housekeeping on the admin page')`** — single spec with one test covering the full journey.
- **`beforeEach`** — visits `/en`, calls `cy.restore()` to reset app state, then visits `/en` again.
- **Test steps** (each a `cy.step` block):
  1. *Overview refresh* — intercepts `health` and `overview` endpoints, clicks the refresh button, asserts 200s and queue rows.
  2. *Queue rows* — asserts `[data-test=parked-queue-row]` count matches whatever the broker returned (zero when disabled).
  3. *Audit trail filter* — switches to the audit tab, filters by `auth.login`, verifies rows; filters by a nonexistent action, verifies empty; resets and verifies rows return.
  4. *Realtime stream* — navigates to the playground page, connects, checks status/open, toggles raw events, asserts `uptimeSeconds` in the log, disconnects, checks status/closed.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `refuseALogin`, which is called before logging in as admin to generate an `auth.login` incident. This guarantees at least one row exists in the platform audit trail so the filter assertions have a target.

## Notes

- The test **requires the operator's platform key** (the seeded `root` user holds both shop-admin and platform-operator memberships); without it, the observability endpoints will reject.
- Queue rows only render when `NODE_RABBITMQ_ENABLED` is true. Both the demo backend and the live recipe leave it off, so the assertion is written to accept zero rows rather than hard-coding a count.
- The audit-filter assertion uses a **single retrying `cy.get(...).should(($rows) => …)`** call instead of two separate `should` calls to avoid a race where the list re-fetches between assertions.
- `refuseALogin` is **not** a test of login failure here; it is a data-seeding step to produce an `auth.login` event in the audit trail.
