---
source: tests/e2e/specs/journeys/at5-webhooks-filters.cy.ts
sha256: d91c4bba20d52139fff075a28244f0c589c5d7aaa9d1f604399a2b20a3ae00f5
generated_at: 2026-10-17T02:08:25.989506+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-webhooks-filters.cy.ts

## Purpose

End-to-end test for the **Status (Enabled/Disabled) filter** on the Webhooks → Subscriptions list page. It creates one enabled and one disabled webhook subscription, then verifies that the filter narrows the list to only the matching rows and that resetting the filter restores both.

## Key elements

- **`describe('AT5 · Webhooks list filter')`** – single test suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset seeded state.
- **`it('enabled and disabled each show only their own subscriptions, and reset shows both')`** – the sole test case. It:
  1. Creates two webhook subscriptions via `cy.createWebhookSubscription` (pointing at sink endpoints).
  2. Disables the second one with `cy.apiAs('admin', 'PATCH', …)`.
  3. Logs in as admin, navigates to `/en/webhooks/subscriptions`, and asserts both IDs are listed.
  4. Selects **Enabled** filter → asserts only the enabled ID remains.
  5. Selects **Disabled** filter → asserts *only* the disabled ID remains (exact match).
  6. Calls `resetSearch()` → asserts the full original list is restored.
- **`cy.step(…)`** – narrative labels used to segment the test steps within the spec runner.
- **`cy.trackNetwork()` / `cy.settleNetwork()`** – bracket the page visit to wait for all XHR to complete before asserting on the DOM.

## Relationships

- **`tests/support/e2e/integrator.ts`** – supplies `sinkEndpoint(path)`, which provisions a mock HTTP endpoint and returns its URL; used as the delivery target for the two webhook subscriptions.
- **`tests/support/e2e/steps.ts`** – supplies `listedIds()` (reads subscription IDs currently visible in the list), `submitSearch()` (triggers the filter form), and `resetSearch()` (clears filter/search state).

## Notes

- The leading `// requires-module: webhooks` comment means the test is **skipped** unless the `webhooks` feature module is enabled in the test environment.
- The `Disabled` filter assertion uses `.should('deep.equal', [off.id])` (exact array match), so the test assumes **no other disabled subscriptions** exist in the seeded state. If a future seed adds one, this assertion will break.
- The nested `.then()` chains (`on → off → assertions`) make the test order-sensitive; both subscriptions must exist before any filtering begins.
