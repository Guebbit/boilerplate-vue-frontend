---
source: tests/e2e/specs/journeys/op16-the-shop-managers-morning.cy.ts
sha256: b7b90b58d971174e041ff99f70417fde323148f4799ca169dc589c35cf0928ab
signature: b7b90b58d971174e041ff99f70417fde323148f4799ca169dc589c35cf0928ab
generated_at: 2026-11-10T07:12:57.234107+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op16-the-shop-managers-morning.cy.ts

## Purpose

End-to-end journey test (OP16) that verifies the **shop manager** role's full morning workflow: running orders, returns, and prices while confirming the UI exposes **no controls** the backend would refuse (no refund, no ship, no stock writes, no task actions, no admin/keys/audit pages). It also covers the read-only sales dashboard, CSV order export, and the return-receive→close flow.

## Key elements

- **`NEW_PRICE`** (`'31.40'`) – the repriced value typed into the product edit form and later asserted in the guest-facing page.
- **`describe('OP16 · …')`** – top-level suite with a `beforeEach` that visits `/en`, calls `cy.restore()`, and re-visits to get a clean session per test.
- **`it('the manager runs the orders, the returns and the prices…')`** – the primary journey: menu link inclusion/exclusion checks, cart presence, paid-order → started (no ship), refund/offline-payment disabled, cancel-only on a second order, return approval, inventory read-only, task inbox read-only, and product reprice verified by a logged-out guest.
- **`it('the manager reads the numbers, exports the orders…')`** – secondary journey: sales stats/payments/orders in the menu, zero 401/403 on the stats page, CSV order export (200 + `text/csv`, no re-auth dialog), payments list without an offline control, and return approve → receive → closed.

## Relationships

- **`tests/support/e2e/steps.ts`** – supplies `adminMenuLinks()` (yields the nav link list for assertions) and `isTurnedBack(path)` (asserts a 403/redirect when the manager hits a forbidden page). Both are imported at the top of this file and used in the first `it` block.

## Notes

- `cy.subjectId('order.paid')`, `cy.subjectId('product.rich')`, etc. pull **seeded fixture IDs**; tests do not create their own entities except the single task posted via `cy.apiAs('admin', 'POST', '/tasks', …)`.
- The reprice step explicitly waits for the price input to be **non-empty** before clearing and typing, because the edit form hydrates asynchronously—saving before hydration would send an empty price (noted in the inline comment).
- The stats test installs a network interceptor that collects any 401/403 status codes and asserts the list is empty after `cy.settleNetwork()`, catching silent partial failures that a single-URL assertion would miss.
- `cy.apiAs('manager', …)` calls after each UI action verify **server-side state** (e.g. `status === 'processing'`), not just UI label changes.
