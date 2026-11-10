---
source: tests/e2e/specs/journeys/cu34-what-my-timeline-says.cy.ts
sha256: 22e9d899dc618860038f92ce8ef0467e72b651eb30b7c062cbc60eb061141332
signature: 80293eb53b406e6eabe41d65d1645d24298c48c61d271d2b7350248a4a30ad06
generated_at: 2026-11-10T07:00:47.651813+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu34-what-my-timeline-says.cy.ts

## Purpose

E2E Cypress test for story **CU34 · What my timeline says**. Verifies that an order's timeline is correctly audience-filtered: the customer (page and API) never sees staff-only entries (`fulfillment_held`, `fulfillment_released`) or actor metadata, while the admin sees them with a "staff-only" marker and the acting user. Also confirms the filtering persists after the admin takes further actions (releasing the hold and issuing a partial refund).

## Key elements

- **`EntryLike`** (interface) — Minimal shape of a timeline entry the test asserts on: `type` and optional `actor`.
- **`STAFF_ONLY`** (const `string[]`) — The two timeline entry types that must be invisible to the buyer: `'fulfillment_held'`, `'fulfillment_released'`.
- **`REFUND`** (const, `5`) — Goodwill refund amount (in the payment's currency) the admin issues mid-test.
- **`beforeEach`** — Visits `/en`, calls `cy.restore()` (DB reset), then revisits.
- **Single `it` block** — Walks through five `cy.step` milestones:
  1. Customer page shows only `created`, `paid`, `processing`; no staff-only entries, no actor.
  2. `GET /orders/{id}/timeline` (as customer) confirms no `STAFF_ONLY` types and no `actor` property.
  3. Admin page shows `fulfillment_held` with `[data-test=order-timeline-staff-only]` and `[data-test=order-timeline-actor]`.
  4. Admin clicks release, then issues a partial refund via the edit form.
  5. Customer reloads: `refund_issued` is visible; staff-only entries and actor remain absent.

## Relationships

No graph neighbors are recorded. The `requires-module` header comment declares a dependency on the **account**, **delivery**, **orders**, and **payments** modules for seeding and state transitions.

## Notes

- The seeded fixture referenced is `order.onHold` (an order held for a risk check). Obtain its ID via `cy.subjectId('order.onHold')`.
- `cy.restore()` in `beforeEach` resets the database to a known seed; the double-visit pattern (visit → restore → visit) is the project convention for a clean starting URL.
- `cy.switchUser('admin' | 'user')` is a custom command that swaps the logged-in session; `cy.apiAs` is a custom authenticated-API helper.
- `cy.step(...)` calls are narrative markers (Cypress command logging) and have no functional effect on assertions.
- The refund flow uses `REFUND.toFixed(2)` to match the expected two-decimal input format in the UI.
