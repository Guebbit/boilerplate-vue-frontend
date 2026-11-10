---
source: tests/e2e/specs/journeys/op14-audit-trail-follows-the-action.cy.ts
sha256: 396fc1e036af14b51d7f0840401d3a7b1d41e4575bdba045ea7ce7c464067b38
signature: 3e8f0795fd929489db469d01b72cdb4dd9d6c2632a8ad3c60ce9d52cbf321f4b
generated_at: 2026-11-10T07:12:27.101596+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op14-audit-trail-follows-the-action.cy.ts

## Purpose

E2E Cypress journey test (OP14) that verifies the shop's audit trail records and displays the correct action, actor role, and outcome for a sequence of admin operations on orders (edit email, cancel, start, ship, deliver, status-override) and on a user (update phone). It also asserts that the "history" buttons on order and user pages open the audit list narrowed to the right target, and that the rendered rows match what the API returns.

## Key elements

- **`AuditRowLike` / `AuditListLike`** — minimal structural types describing one audit row (`action`, `outcome`, `actorRole`, `targetId`, `metadata`) and a paginated list of rows, used to type the API responses without importing server models.
- **`REASONS.status`** — the canned reason string typed into the override form; the test later asserts it appears verbatim in the audit row's `metadata.reason`.
- **`auditRowsFor(targetId)`** — helper that issues `GET /audit?target=<id>&pageSize=100` as admin and returns the `items` array.
- **`auditHas(targetId, action)`** — wrapper around `eventually` that polls `auditRowsFor` until a row with the given `action` appears, then yields the full row list for further assertions.
- **`describe('OP14 …') / it(…)`** — single test case that: edits & cancels an order, ships & delivers a paid order, performs a status-only override, then updates a user's phone; after each step it checks the audit API and the rendered list-page rows.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports the `eventually` polling helper. `eventually` is the retry mechanism that lets `auditHas` wait for the audit write (which is committed *after* the HTTP response, not inside it) before asserting.

## Notes

- Audit writes are **asynchronous** relative to the triggering request; the test must poll (`auditHas` / `eventually`) rather than assert immediately after the UI action.
- The `beforeEach` calls `cy.restore()` between two `cy.visit('/en')` calls — a fixture-reset convention used across the suite.
- `cy.subjectId`, `cy.apiAs`, `cy.loginAs`, `cy.step`, `cy.accountOf` are **custom Cypress commands** defined elsewhere in the support layer; they are not part of the public Cypress API.
- The status-override step (`OrderEdit`) carries a `stepUp: critical` flag upstream, meaning the admin is expected to be already authenticated — no re-auth dialog is awaited in this test.
- The test asserts that `pending` is **never** an available override target (only the offline-payment flow produces it), so the `listbox` for a paid order offers exactly 3 options and excludes "Pending" and "Paid".
