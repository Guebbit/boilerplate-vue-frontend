---
source: tests/e2e/specs/journeys/op14-audit-trail-follows-the-action.cy.ts
sha256: f289e13d49f7ac0cf5ce594a0dfd054da95c5c0d066d732f22fb840962739d9a
generated_at: 2026-10-17T02:19:16.956434+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op14-audit-trail-follows-the-action.cy.ts

## Purpose

E2E journey test (Cypress) verifying that the shop's audit trail records the correct action, actor role, and outcome for a sequence of admin operations on orders (email edit, cancel, ship, forced delivery, status override) and a user (phone update). It also asserts that the "history" button on an order or user detail page navigates to the audit list narrowed to that specific target, and that the rendered rows match the API rows one-to-one.

## Key elements

- **`AuditRowLike` / `TimelineRowLike` / `AuditListLike`** – Local interfaces describing the minimal shape of audit rows, order-timeline rows, and the paged audit list as this test consumes them.
- **`REASONS`** – Constant holding the two reason strings typed into the UI; asserted verbatim against audit metadata and the order timeline.
- **`auditRowsFor(targetId)`** – Fetches every audit row for a target via `GET /audit?target=…&pageSize=100` and returns `items`.
- **`auditHas(targetId, action)`** – Wraps `eventually()` to poll `auditRowsFor` until the given dotted action name appears (audit writes are async relative to the triggering request).
- **Main `it` block** – Drives the full journey: order edit → cancel → ship (no force) → forced delivery with reason → status-only override → user phone update, asserting audit rows, actor roles, outcomes, metadata, timeline text, and page-level row counts.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides `eventually()`, the polling helper used by `auditHas` and the forced-delivery assertion. The test also relies on custom Cypress commands (`cy.apiAs`, `cy.subjectId`, `cy.step`, `cy.restore`, `cy.accountOf`) registered elsewhere in the support layer.

## Notes

- Audit writes are **eventual**, not synchronous with the HTTP response that triggers them; `eventually` / `auditHas` exist specifically for this. Avoid replacing them with a single `cy.request` assertion.
- A **forced delivery** records only `admin.order.delivered` in the audit trail (with `metadata.forced = true`); its reason lives in the order timeline (`GET /orders/{id}/timeline`, type `status_overridden`, `data.mode = 'forced'`), **not** in the audit row's metadata.
- A **status-only override** (OrderEdit) records `order.status_overridden` with `metadata.reason`, `metadata.mode = 'status'`, `from`, and `to` all in the audit row.
- The override selector never offers `pending` or a state at/before the current one; the test asserts exactly 3 options for a `paid` order.
- Both the forced-delivery and override flows carry `stepUp: critical`; the test logs in as admin immediately before, so no re-authentication dialog should appear.
- The test requires the `account`, `delivery`, `observability`, `orders`, and `users` modules (per the `requires-module` comment).
