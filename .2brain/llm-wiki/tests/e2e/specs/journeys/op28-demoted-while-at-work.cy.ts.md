---
source: tests/e2e/specs/journeys/op28-demoted-while-at-work.cy.ts
sha256: cdadd671be25a41a7f94d0e7c53a8572034c4035ade12e7f9eb6a3003ce1cefd
signature: 0e5dd6449e56c3e0a8dfffbd44b10970b0125d2213440cdda220761d44c56ce0
generated_at: 2026-11-10T07:15:34.213137+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op28-demoted-while-at-work.cy.ts

## Purpose

E2E journey test verifying the full lifecycle of a role revocation mid-session: a warehouse worker loses their role while inside the stock room, the server rejects the next write, the SPA reflects the demotion without a reload, a re-grant only appears on the next load, and a ban (deactivation) severs the session entirely until lifted.

## Key elements

- **`MovementsLike`** (local interface, not exported) — minimal shape `{ items?: unknown[] }` used to type the API response for stock-movement comparison before/after a refused write.
- **`describe('OP28 · Demoted while at work')`** — single test suite; `beforeEach` visits `/en`, calls `cy.restore()`, and re-visits `/en` to reset app state.
- **`it('the page follows a demotion on its next refused call, and a ban ends the session')`** — the sole test case, structured as a sequence of `cy.step(...)` narrative markers that walk through:
  1. Warehouse worker is authenticated and inside the stock room (`/en/inventory`).
  2. Admin revokes the role via `POST /users/:id/revoke-role`.
  3. A receipt submission is refused; movements list is unchanged.
  4. Admin menu disappears and the browser is redirected to `/en` (customer-only view) without a reload.
  5. Customer features (cart, orders) remain accessible.
  6. Re-grant via `POST /users/:id/assign-role` is invisible until `cy.reload()`.
  7. Admin deactivates the account (`POST /users/:id/deactivate`); visiting a staff page shows the login screen; a fresh `POST /account/login` returns 4xx.
  8. Admin reactivates (`POST /users/:id/activate`); `cy.loginAs('warehouse')` succeeds and the staff menu reappears.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `adminMenuLinks`, a selector helper that returns the set of admin-menu link hrefs used to assert the staff menu's presence or absence throughout the journey.

## Notes

- The `// requires-module: account, inventory, users` directive at the top declares the backend modules this test exercises; CI may use it to gate execution.
- All custom commands (`cy.accountOf`, `cy.accountInRole`, `cy.subjectProduct`, `cy.step`, `cy.loginAs`, `cy.apiAs`) are registered in the shared support layer, not in this file.
- The single long `it` block is intentional: each `cy.step` call is a narrative checkpoint, not a separate assertion. A failure at any step aborts the remaining sequence.
- The test verifies *server-side* role enforcement on every request (no client-side permission cache), which is the core invariant the story guards.
