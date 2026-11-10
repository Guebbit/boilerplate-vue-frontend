---
source: tests/support/e2e/dialog-keyboard.ts
sha256: 640095973537ca054f3143e9781e3aa927c9d7e3a21a6f1951bfa8e83b5e63ae
signature: d51604f53d4f55337cfc09cc46ace85c7fc20a82cbb71b8f30351feedcec469d
generated_at: 2026-11-10T07:29:06.047593+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/dialog-keyboard.ts

## Purpose

Shared Cypress helper that asserts the full WAI-ARIA modal-dialog keyboard contract in a single call: focus enters the dialog on open, Tab stays trapped inside, Escape closes the dialog and restores focus to the opener, and no mutation API calls are fired as a side-effect. Exists so that per-module e2e specs don't each re-implement the same multi-step keyboard sequence.

## Key elements

- **`FOCUSABLE_SELECTOR`** (private const) – CSS selector matching every element the Tab key can land on (links, enabled form controls, positive-tabindex elements).
- **`ACTIVE_OVERLAY`** (private const) – `.v-overlay--active`; the Vuetify container that wraps every open dialog. Used as the "inside the dialog" boundary for focus assertions.
- **`READ_BY_POST`** (private const) – Regex matching `/search` paths. Whitelists POST requests to search endpoints so they aren't counted as unintended writes.
- **`DialogKeyboardOptions`** (exported interface) – Optional config for `expectDialogKeyboardPattern`; currently only `fallbackFocus` (selector to assert focus on when the opener has been removed by the action).
- **`expectDialogKeyboardPattern(opener, dialog, options?)`** (exported function) – The single public API. Opens the dialog with a real Enter press, verifies initial focus, walks Tab through all focusable controls plus one extra, closes with Escape, asserts focus restoration, and finally asserts zero mutation requests were recorded.

## Relationships

- **`src/modules/inventory/tests/e2e/keyboard.cy.ts`** – Calls `expectDialogKeyboardPattern` to verify the inventory dialog's keyboard behaviour.
- **`src/modules/orders/tests/e2e/keyboard.cy.ts`** – Calls `expectDialogKeyboardPattern` for the orders dialog.
- **`src/modules/users/tests/e2e/keyboard.cy.ts`** – Calls `expectDialogKeyboardPattern` for the users dialog.

All three are consumers; none of them import the private constants.

## Notes

- Relies on the `cypress-real-events` plugin (`cy.realPress`). Synthetic `.trigger('keydown', {key:'Tab'})` does not move real browser focus, so the focus-trap assertion would pass vacuously.
- The Tab-press loop iterates **focusable-count + 1** times deliberately: a well-implemented trap wraps around; a leaking trap lets the extra press escape `.v-overlay--active` and the assertion catches it.
- `READ_BY_POST` exists because the API's search endpoints use POST semantically but are read-only. Without this whitelist, the stock-board refresh that fires while a dialog is open would fail the "zero writes" check.
- The writes assertion is in a `cy.then` at the end, so it runs after all preceding commands have settled, catching deferred/intercepted requests.
- Vuetify-specific: the focus boundary is `.v-overlay--active`. If the UI framework changes, both the selector and the `closest()` checks need updating.
