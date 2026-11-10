---
source: src/modules/orders/tests/e2e/keyboard.cy.ts
sha256: ae6d573fb63b9d777df752473892133d4a2687aa0a39c2ee7d019d1e01f2beac
signature: ae6d573fb63b9d777df752473892133d4a2687aa0a39c2ee7d019d1e01f2beac
generated_at: 2026-11-10T05:01:34.017306+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/keyboard.cy.ts

## Purpose

Cypress E2E suite that verifies the WAI-ARIA modal-dialog keyboard contract (focus moves in on open, Tab stays trapped, Escape closes without submitting, focus returns to the opener) for the three dialogs hosted on the order page by the delivery and returns modules.

## Key elements

- **`describe('order-page delivery dialogs by keyboard')`** — runs as the `warehouse` account; tests the **ship** and **hold** dialogs. The ship test first clicks `[data-test=mark-started]` to surface the open-ship button.
- **`describe('order-page returns dialogs by keyboard')`** — runs as a plain `user` account; tests the **cancel-the-rest** (cancel-remainder) dialog on a partially-fulfilled order.
- Each `it` block resolves a fixture order id via `cy.subjectId(...)`, visits the order route, then delegates the entire keyboard-pattern assertion to `expectDialogKeyboardPattern(openerSelector, dialogSelector)`.
- `beforeEach` in both blocks performs `cy.visit('/en')` → `cy.restore()` → `cy.loginAs(...)` to seed a clean session.

## Relationships

- **`tests/support/e2e/dialog-keyboard.ts`** — provides the single imported helper `expectDialogKeyboardPattern`, which encapsulates the reusable assertions (focus-in, Tab trap, Escape-to-close, focus-return). This test file is purely a consumer; it never asserts those behaviors inline.

## Notes

- The ship dialog requires a prior `mark-started` click; the hold dialog does not. Omitting that step will cause the `[data-test=open-ship]` query to fail.
- The cancel-remainder dialog is exercised under a non-warehouse role, so it lives in a separate `describe` with its own login.
- All selectors are `data-test` attributes, not CSS classes or ARIA roles—keep them in sync with the component markup.
