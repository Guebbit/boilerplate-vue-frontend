---
source: src/modules/users/tests/e2e/keyboard.cy.ts
sha256: 933590af78f9ea9363c5ac8865fa38e970fb579bcf47c65762d82f3bf7b7aef6
signature: 933590af78f9ea9363c5ac8865fa38e970fb579bcf47c65762d82f3bf7b7aef6
generated_at: 2026-11-10T06:05:35.868487+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/keyboard.cy.ts

## Purpose

End-to-end tests that verify the WAI-ARIA keyboard pattern for the users module's modal dialogs: focus moves in on open, Tab stays trapped inside, Escape closes without persisting changes, and focus returns to the triggering element.

## Key elements

- **`describe('users dialogs by keyboard')`** – Top-level suite. Its `beforeEach` visits `/en`, restores state, and logs in as `admin`.
- **`it('the pause-checkout dialog traps Tab, closes on Escape and hands focus back')`** – Opens the user's page, then asserts the keyboard pattern on the `user-purchase-hold-dialog` (triggered via `[data-test=user-pause-checkout]`).
- **`it('the manage-access dialog traps Tab, closes on Escape and hands focus back')`** – Same flow, but targets the `user-access-dialog` (triggered via `[data-test=user-manage-access]`).
- Both tests fetch a `user`-role account with `cy.accountInRole('user')` and navigate to `/en/users/{id}` before invoking the helper.

## Relationships

- **`tests/support/e2e/dialog-keyboard.ts`** – Provides `expectDialogKeyboardPattern(triggerSelector, dialogSelector)`, the shared assertion that both tests call. All keyboard-behavior logic (focus-in, Tab trap, Escape-close, focus-return) lives in that helper; this file only supplies the selectors and the setup/teardown context.

## Notes

- Selectors are `data-test` attributes, not class names or ARIA roles, so renaming a CSS class won't break these tests—but removing or renaming the `data-test` attribute will.
- The helper's first argument is the **trigger button** (what the user tabs into to open the dialog); the second is the **dialog container** itself. Confusing the two will cause false failures.
- No assertions are written inline here; if a dialog misbehaves, the diagnostic detail is in the shared helper, not in this file.
