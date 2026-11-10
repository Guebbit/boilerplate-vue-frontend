---
source: tests/e2e/specs/journeys/at5-webhooks-filters.cy.ts
sha256: 708df03f9cf3ae26cf21665cd43c975d27bdda56590c22e18746141a2b4fbccb
signature: 708df03f9cf3ae26cf21665cd43c975d27bdda56590c22e18746141a2b4fbccb
generated_at: 2026-11-10T06:52:31.966395+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-webhooks-filters.cy.ts

## Purpose

End-to-end journey test for the webhook subscriptions list "Status" filter. It seeds one enabled and one paused subscription, then verifies that filtering by Enabled / Paused each surfaces only the matching row, and that resetting the filter restores both.

## Key elements

- **`describe('AT5 · Webhooks list filter')`** – single test suite, gated by `// requires-module: webhooks`.
- **`beforeEach`** – visits `/en` and calls `cy.restore()` to reset seeded state before each run.
- **`it('enabled and paused each show only their own subscriptions, and reset shows both')`** – the only test case. Creates two subscriptions via `cy.createWebhookSubscription`, disables the second via a direct `cy.apiAs('admin', 'POST', …)` call, then exercises the UI filter in three steps: pick "Enabled", pick "Paused", reset.
- **Assertions** – uses `listedIds()` to collect visible row IDs and checks membership (`include.members`, `include`, `not.include`, `deep.equal`) against the expected subscription IDs at each filter state.

## Relationships

- **`tests/support/e2e/integrator.ts`** – provides `sinkEndpoint(path)`, which allocates a throwaway webhook sink URL used as the target for the two created subscriptions.
- **`tests/support/e2e/steps.ts`** – provides `listedIds()` (extracts row IDs from the current list view), `submitSearch()` (triggers the filter form submission), and `resetSearch()` (clears the filter). All three are called inside the test to drive and observe the filter UI.

## Notes

- **Pagination caveat:** after resetting the filter the assertion uses `include.members` (subset) rather than `deep.equal` because the pager may cap how many rows render on one page. The "Paused" step, however, uses `deep.equal` because only one row is expected to be visible.
- **Nested `.then()` chains:** subscriptions are created sequentially inside each other to guarantee both exist before any UI assertion runs.
- **`cy.trackNetwork()` / `cy.settleNetwork()`** are used around the page visit to ensure all list requests complete before asserting row count.
- **`cy.step('…')`** calls are pure narration (no assertion); they label the three filter states for test-run readability.
