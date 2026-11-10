---
source: src/modules/locales/tests/use-dictionary-cell-editor.spec.ts
sha256: 388ab601894277da945b0f0a9daba860f8ff8b9fdd974541b17d34e48b0c9cf2
signature: 76495dddd58b931ba80bdb538d1a47e462fa7e057c5db8fc45a87907b4171a4a
generated_at: 2026-11-10T04:45:54.854988+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/use-dictionary-cell-editor.spec.ts

## Purpose

Vitest spec for the `useDictionaryCellEditor` composable. It isolates the per-cell decision logic (create vs. edit vs. no-op on blur, and the explicit remove path) by faking the store, dialog, notifications, i18n, and error-reporting at the module boundary, then asserts which store method is called with what arguments and what the composable's reactive state looks like afterward.

## Key elements

- **`editorWith(stored, baselines)`** — test factory that wires `useDictionaryCellEditor` to a fixed lookup map and returns both the editor and an `afterWrite` spy.
- **`entry(key, value)`** — builds a minimal `LocaleEntry` fixture for the stored-entry map.
- **`describe('handleCellBlur')`** — the core block. Covers: no-op on untouched cell, no-op when draft equals stored value, no-op on empty draft with no entry, `null` input treated as empty, **create** path (`addEntry`), **edit** path (`editEntry`), the invariant that blur never removes, transient saved-mark expiry (1 500 ms via fake timers), and failure handling (error stays on the cell, Faro is still notified, `afterWrite` is not called).
- **`describe('handleCellInput')`** — verifies the draft is recorded and that a prior `cellErrors` entry is cleared on the next keystroke.
- **`describe('handleCellClear')`** — covers: confirmed removal (store call, named toast, `afterWrite`), declined confirmation (no mutation, draft restored), pending-guard (second call returns `undefined`), no-op when there is no stored entry, and focus restoration on cancel.
- **`vi.mock` blocks** — stub out `../store.ts`, `@/ui/dialog.ts`, `@guebbit/vue-toolkit` (notifications), `vue-i18n` (echoes the i18n key as the "translated" string), and `@/infrastructure/utils/use-blocking-error.ts` (collects into `reportedErrors`).
- **`confirmAnswer`, `messages`, `reportedErrors`** — mutable module-level variables reset in `beforeEach`; flipped/inspected per test to drive and assert dialog and toast behavior.

## Relationships

- **`src/modules/locales/composables/use-dictionary-cell-editor.ts`** — the SUT. The test imports `useDictionaryCellEditor` and exercises its `handleCellBlur`, `handleCellInput`, `handleCellClear`, `drafts`, `savedCells`, `cellErrors`, and `cellId` members. All other dependencies (store, dialog, notifications, i18n, blocking-error) are mocked so no real cross-module interaction occurs.

## Notes

- **i18n mock echoes the key.** Assertions compare against raw i18n keys (e.g. `'locales-dictionary-page.error-save'`, `'locales-dictionary-page.success-remove-named'`) rather than human-readable strings, so the test vocabulary is stable across locale changes.
- **`afterWrite` is a spy, not a no-op.** The test treats "the column was reloaded" as part of the success contract; a mutation that silently drops the callback would be caught here.
- **Fake timers** are activated only in the saved-mark expiry test; all other tests run on real timers (`vi.useRealTimers()` in `beforeEach`).
- **Blur never removes.** This is a deliberate design rule called out in the file header and enforced by a dedicated test; removal is exclusive to `handleCellClear`.
- **`confirmAnswer` is a plain `let`** (not a ref) flipped in specific tests to simulate user choosing Cancel on the confirmation dialog.
