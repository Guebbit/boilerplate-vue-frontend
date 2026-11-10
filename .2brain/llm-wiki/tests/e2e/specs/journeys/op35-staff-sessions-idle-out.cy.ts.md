---
source: tests/e2e/specs/journeys/op35-staff-sessions-idle-out.cy.ts
sha256: 427954cb13cbf2785207f9b7d3597c27734cac39971d7876d6fc92527f53595a
signature: 5aa10e3b59c0fd61e15ff75b70da1232662c0f67ee24fd847e487cfef49ee12e
generated_at: 2026-11-10T07:17:15.863560+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op35-staff-sessions-idle-out.cy.ts

## Purpose

Verifies that a staff (warehouse) session is invalidated once the server-published idle timeout is exceeded, while a shopper session spanning the same interval remains valid. The test advances the demo backend's clock to simulate elapsed time, making it a demo-only journey.

## Key elements

- **`PAST_LIMIT_MS`** (60 000 ms) — slack added to the server-reported limit so the clock jump lands unambiguously beyond it.
- **`TouchAnswer`** — minimal interface (`idleTimeoutSeconds?`) for the subset of the `/account/sessions/current/touch` response this test reads.
- **`idleLimitMs()`** — reads the staff idle timeout the same way the UI does (via a session-touch POST on the `warehouse` device) and returns the value in milliseconds as a `Cypress.Chainable<number>`.
- **`describe` / single `it`** — logs in a warehouse worker and a shopper, travels past the limit, then asserts the shopper's refresh still returns 200 while the worker's next page load lands on the login page.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `loginDevice`, `refreshDevice`, and `requestAsDevice`, the device-management and authenticated-request primitives the spec relies on for multi-user scenarios.
- **`scripts/testing/report-results.ts`** — downstream reporting script that ingests pass/fail outcomes produced by this spec (and its siblings) into the shared test-report artefact.

## Notes

- **Demo-only:** guarded by `cy.skipUnlessDemo()`; the clock-advancing primitive (`cy.travel`) only exists in the demo backend.
- **"Still there?" prompt is intentionally skipped:** the page's own background reads register as activity on the moved clock, so the UI never reaches the two-minute warning window during a run.
- **Limit is never hard-coded:** always read from the server response at runtime, keeping the test resilient to config changes.
- **Module dependency:** the leading `requires-module: account, inventory` comment signals this spec needs both feature modules active (the `#inventory-page` and `#login-page` selectors depend on them).
- **`beforeEach` pattern:** `cy.visit` → `cy.restore` → `cy.visit` resets application state between runs without a full server reset.
