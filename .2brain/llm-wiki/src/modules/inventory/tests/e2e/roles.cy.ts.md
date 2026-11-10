---
source: src/modules/inventory/tests/e2e/roles.cy.ts
sha256: 1fe205f3e95b8ff25a2d4d4af44f1915baa73334cbb913e0edf835f447533bb1
signature: 1fe205f3e95b8ff25a2d4d4af44f1915baa73334cbb913e0edf835f447533bb1
generated_at: 2026-11-10T04:33:49.912095+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/roles.cy.ts

## Purpose

End-to-end test that verifies role-based access control on the inventory module's pages. It walks each persona's permissions against the stock board and preorder board, asserting that buttons and routes are visible only to roles whose rules permit them. The file is deliberately co-located with the module so that removing the module also removes its role sweep.

## Key elements

- **`sweepRoles('inventory', [ … ])`** — the single call in this file. It registers two page definitions for the `inventory` module and delegates all assertion logic to the helper.
  - *stock board* (`/en/inventory`): requires `read` + `StockLevel` to open; exposes two guarded buttons — `[data-test=receipt-form]` (needs `create` + `StockMovement`) and `[data-test=sweep-submit]` (needs `sweep` + `StockLevel`).
  - *preorder board* (`/en/sales/preorders`): requires `display` + `Order`; no per-button entries.
- Each page entry carries `menuHref` (the navigation link to assert) and `pageRoot` (a stable DOM anchor the sweep uses to scope its checks).

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides `sweepRoles`, the generic harness that iterates personas, navigates to each route, toggles permissions, and asserts button visibility. This file is purely the case list consumed by that helper; no test logic lives here.

## Notes

- The file contains no `describe`/`it` blocks of its own; all Cucumber/Cypress test generation happens inside `sweepRoles`. Expect the generated suite count to change if entries or buttons are added/removed here.
- `can` arrays are permission pairs (`[verb, resource]`). A button appears only when *every* pair in its `can` list is granted to the current persona.
- The receipt form and sweep submit button share the same page but are intentionally listed as separate entries with distinct permission requirements — they are independent authorization surfaces.
