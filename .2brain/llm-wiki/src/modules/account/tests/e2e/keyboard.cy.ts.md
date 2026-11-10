---
source: src/modules/account/tests/e2e/keyboard.cy.ts
sha256: d6149885a6db3afa71ecbf6e14b0fc97030644971f18ab36f213ac4c3bd824f9
signature: 26cbe1fec64a681dfd76aeb1899f7ce8ebaa6f0120b3faf052b1a72df8e706da
generated_at: 2026-11-10T03:32:40.020730+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/keyboard.cy.ts

## Purpose

Verifies that the three persistent two-factor dialogs in the account module (enrolment, backup-codes display, and the removal code prompt) **ignore Escape** and **trap Tab/Shift+Tab focus** inside the overlay. These are the only dialog kind where dismissing would lose in-progress data or the user's sole view of backup codes, so the standard "Escape closes the dialog" pattern does not apply.

## Key elements

- **`ACTIVE_OVERLAY`** (`const`) — Selector `.v-overlay--active` for Vuetify's open-dialog overlay; used to confirm focus never leaves the dialog.
- **`expectEscapeLeavesItOpen(dialog: string)`** — Helper that asserts the given dialog remains visible after `cy.realPress('Escape')` and that both `Tab` and `Shift+Tab` keep focus within `ACTIVE_OVERLAY`.
- **`describe('two-factor dialogs by keyboard')`** — Single test (`it`) that walks through all three dialogs in sequence: opens the enrolment dialog, confirms it, views backup codes, then triggers the removal code prompt, calling `expectEscapeLeavesItOpen` on each.

## Relationships

- **`tests/support/e2e/scenario.ts`** — Imports `seedAccount`, which provisions a known account (and returns its email) so the test can type the one-time mail-delivered two-factor code into the enrolment flow.

## Notes

- Uses `cy.realPress` (real OS-level key events) rather than `cy.type`/`cy.key`; this matters because Vuetify's Escape handling listens on the actual keydown, not the synthetic event.
- The test is skipped when no mailbox is configured (`cy.skipUnlessMailbox()`), since the flow depends on a mailed 2FA code.
- The code-prompt step requires clicking a generic confirm button (`[data-test=app-dialog-confirm]`) first; the actual code input lives inside a nested overlay, so the selector is composed as `${ACTIVE_OVERLAY} [data-test=two-factor-code-prompt-input]`.
- This file deliberately does **not** call the shared `expectDialogKeyboardPattern` helper, which asserts the opposite (Escape *closes* the dialog).
