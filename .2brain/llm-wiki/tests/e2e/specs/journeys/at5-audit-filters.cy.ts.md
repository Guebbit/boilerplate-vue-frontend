---
source: tests/e2e/specs/journeys/at5-audit-filters.cy.ts
sha256: 4b254a0409729cbfb95de60a07212c49739a22198e5d59acaa3c62fb28de797d
signature: 327c16c90b0707e72faeb73eded6afb67c198d9a7cc9a487c4b50dc39be18f3b
generated_at: 2026-11-10T06:50:54.552516+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-audit-filters.cy.ts

## Purpose

E2E story that verifies every filter on the shop's audit page (action, actor, outcome, since, and reset) correctly narrows or restores the audit trail. It seeds one known success action (admin cancels an order) and one known failure (a refused login), then asserts each filter isolates exactly the rows that should match.

## Key elements

- **`UserLike`** – minimal interface (`id: string`) for reading a user's id from an API response.
- **`search()`** – clicks `[data-test=search-submit]` and calls `cy.settleNetwork()` so subsequent assertions run after the list re-renders.
- **`beforeEach`** – visits `/en` and calls `cy.restore()` to reset database state before each run.
- **Single `it` block** – the entire test. It:
  1. Seeds a success row by cancelling `order.awaitingTransfer` via `cy.apiAs`.
  2. Seeds a failure row by POSTing a deliberately wrong password to `/account/login`.
  3. Logs in as admin, looks up the admin's `id` via `/users/search`.
  4. Visits `/en/audit` and then, in sequence, applies each filter, asserts row content, and resets.

## Relationships

No graph neighbors are recorded for this file. The `requires-module` comment at the top declares a logical dependency on the `account`, `observability`, `orders`, and `users` modules.

## Notes

- All row assertions read `$row.text()` directly; the audit rows have no per-cell `data-test` attributes, so the test relies on substring matching within the full row text.
- The `since` filter test uses `2099-01-01T00:00`—a far-future timestamp—so the result is deterministically empty without needing to know the current date.
- The failed-login seed uses `failOnStatusCode: false` because a 401/403 is the expected response that creates the audit `failure` row.
- `cy.trackNetwork()` is called immediately before `cy.visit('/en/audit')` and before `cy.settleNetwork()`, ensuring the initial page-load requests are captured for the settle wait.
- Each filter step ends with a reset click (`[data-test=search-reset]`) so the next filter starts from the unfiltered list.
