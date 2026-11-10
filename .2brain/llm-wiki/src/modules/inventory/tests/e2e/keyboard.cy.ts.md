---
source: src/modules/inventory/tests/e2e/keyboard.cy.ts
sha256: 22bf46b306e3d0c494fe21c0ea0e5cd4d8aa72212fb4e6107b7714160a635d2f
signature: 22bf46b306e3d0c494fe21c0ea0e5cd4d8aa72212fb4e6107b7714160a635d2f
generated_at: 2026-11-10T04:33:14.280015+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/keyboard.cy.ts

## Purpose

Cypress e2e test that verifies the WAI-ARIA keyboard contract of the inventory stock board's preorder-allowance (backorder-limit) modal dialog: focus moves in on open, Tab is trapped inside, Escape closes without persisting changes, and focus returns to the button that opened the dialog.

## Key elements

- **`describe('inventory dialogs by keyboard')`** — top-level suite; logs in as the `warehouse` account (the role that sets allowances) and restores DB state in `beforeEach`.
- **`it('the allowance dialog traps Tab, closes on Escape and hands focus back')`** — the single test case. Opens the inventory page, confirms a `level-row` exists, then delegates the full keyboard-pattern assertion to a shared helper.
- **Selector for the opener button** — `tbody tr:nth-child(1) [data-test=level-backorder-limit]`, a native CSS selector targeting the first row's backorder-limit button.
- **Selector for the dialog** — `[data-test=backorder-limit-dialog]`.

## Relationships

- **`tests/support/e2e/dialog-keyboard.ts`** — imports and calls `expectDialogKeyboardPattern(openerSelector, dialogSelector)`, which encapsulates the focus-in / Tab-trap / Escape-close / focus-restore sequence. This file provides the two selectors and the login context; the helper performs the actual keyboard assertions.

## Notes

- A native CSS selector is used for the opener button (rather than a `data-test`-only query) because the helper also inspects the document after closing to confirm the opener element survived. A `data-test`-only selector might not survive the helper's internal re-query against the live DOM.
- The test is scoped to the first table row; additional rows are assumed identical in structure.
