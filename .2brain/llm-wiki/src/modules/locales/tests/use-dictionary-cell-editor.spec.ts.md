---
source: src/modules/locales/tests/use-dictionary-cell-editor.spec.ts
sha256: f478828459a87124d245c4e6a2d0fa2622d403a14630a033e602a8a69a88ae06
generated_at: 2026-10-17T01:06:38.301629+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/use-dictionary-cell-editor.spec.ts

## Purpose

Vitest spec for the `useDictionaryCellEditor` composable. All external dependencies (locales store, dialog, notifications, i18n, blocking-error utility) are mocked at the module boundary so the tests assert purely on which store write (`addEntry` / `editEntry` / `removeEntry`) a given cell state selects and what local reactive state (drafts, saved marks, cell errors) is left behind.

## Key elements

- **`handleCellBlur` suite** — the bulk of the file. Covers: no-op on untouched cell, no-op when draft equals stored value, no-op on empty draft with absent entry, create-on-new, edit-by-id, **never removes on blur**, saved-mark lifecycle (set then cleared after 1500 ms via fake timers), and error path (error lands on `cellErrors`, no toast, `afterWrite` not called, Faro report still fires).
- **`handleCellInput` suite** — verifies the draft is recorded and that a prior cell error is cleared on a fresh keystroke.
- **`handleCellClear` suite** — confirmed removal (calls `removeEntry`, names the cell in the toast, triggers `afterWrite`), declined confirmation (no write, draft cleared), no-op when there is no stored entry, and focus restoration to the sibling input on cancel.
- **`handleCellEnter` suite** — partially shown; covers Enter-triggered removal of an emptied cell.
- **`editorWith(stored, baselines)` helper** — instantiates the composable with a fixed lookup map and returns both the editor and a spy on `afterWrite` so tests can assert the column-reload promise.
- **Module-level mocks** — `useLocalesStore`, `useDialogStore.confirm` (flippable via `confirmAnswer`), `useNotificationsStore.addMessage` (collected into `messages[]`), `useI18n.t` (echoes the key back), `useBlockingError` (captures `report` calls into `reportedErrors[]`).

## Relationships

- **Imports** `useDictionaryCellEditor` from `src/modules/locales/composables/use-dictionary-cell-editor.ts` — the unit under test.
- **Mocks** (not real runtime dependencies, but contract partners):
  - `../store.ts` → `useLocalesStore` (`addEntry`, `editEntry`, `removeEntry`)
  - `@/ui/dialog.ts` → `useDialogStore.confirm`
  - `@guebbit/vue-toolkit` → `useNotificationsStore.addMessage`
  - `vue-i18n` → `useI18n.t`
  - `@/infrastructure/utils/use-blocking-error.ts` → `useBlockingError` (Faro/error reporting)
- **Imports** `LocaleCapability`, `LocaleEntry` types from `@types` for fixture construction.

## Notes

- The i18n mock returns the key verbatim, so assertions reference i18n keys (e.g. `'locales-dictionary-page.error-save'`) rather than translated strings — tests are vocabulary-independent.
- "Remove is deliberately unreachable from blur" is a documented invariant of the composable, pinned by an explicit test; do not "fix" it by adding a remove path to `handleCellBlur`.
- `afterWrite` is always a spy, never a no-op: dropping the call in the composable would silently break column reload and be invisible without this assertion.
- Fake timers (`vi.useFakeTimers`) are used only for the transient saved-mark test; `beforeEach` restores real timers.
- `vi.clearAllMocks()` runs in `beforeEach`, but the module-level `vi.fn` refs (`addEntry`, `editEntry`, `removeEntry`) and mutable arrays (`messages`, `reportedErrors`) are manually reset in the same hook.
