---
source: src/modules/locales/composables/use-dictionary-cell-editor.ts
sha256: dd0cdc8da492b0ad642336806320717f35ae8e3063871234f684a50dc54aedbd
signature: e7561750b6d69feeaa9a558fb6f676506959b9f4b409d88bd485df683a8110d6
generated_at: 2026-11-10T04:40:06.864652+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/composables/use-dictionary-cell-editor.ts

## Purpose

Vue composable that owns all per-cell editing state and event handlers for the locales dictionary board. It tracks a local draft per cell (so blur can distinguish a real change from a focus move), dispatches save/clear/enter to the locales store, and maintains transient per-cell feedback (a 1.5 s "saved" mark and a persistent inline error).

## Key elements

- **`useDictionaryCellEditor(app, entryAt, baselineAt, afterWrite)`** — the sole export. Wires together drafts, saved/error maps, and the five event handlers below; returns them plus `drafts`, `savedCells`, `cellErrors`, `boardElement`, and `cellId` for the consuming view to bind.
- **`cellId(tag, key)`** — builds the composite key `` `${tag}|${key}` `` used to index every per-cell map (`|` is safe because BCP 47 tags never contain it).
- **`handleCellBlur`** — on focus-out, compares the draft to the stored value. Changed → `addEntry` or `editEntry`; empty draft → silently drops the draft (no removal).
- **`handleCellClear`** — explicit removal (Enter on empty cell or clear button). Opens a `dialogStore.confirm`, guards re-entry with the `clearing` Set, calls `removeEntry`, and toasts the result.
- **`handleCellEnter`** — routes to `handleCellClear` when the draft is `''`, otherwise delegates to `handleCellBlur`.
- **`handleCellInput`** — records the draft; clears any existing `cellErrors` entry for that cell on first keystroke.
- **`handleBoardFocusin`** — scrolls the nearest horizontal scroller so a tabbed-into field isn't hidden under the pinned key column.
- **`settleWrite`** — shared post-write pipeline: clears the draft, runs `afterWrite`, and on failure sets `cellErrors` + calls `reportCellFailure` (Faro).
- **`cellLabel`** — builds the accessible `aria-label` using i18n, showing the baseline or a "missing" variant.
- **`horizontalScrollerOf`** — walks parent elements until one has `overflow-x: auto|scroll`; no class-name coupling.
- **`SAVED_MARK_MS`** (1500) — duration the ✓ mark stays visible before `setTimeout` removes it.

## Relationships

- **`src/modules/locales/store.ts`** — calls `addEntry`, `editEntry`, and `removeEntry` on the `useLocalesStore` instance; the composable is the UI-side caller of every entry mutation.
- **`src/modules/locales/views/LocalesDictionary.vue`** — the view that invokes this composable and binds its returned handlers/refs to the board's inputs and buttons.
- **`src/infrastructure/utils/logger.ts`** — Faro error reporting for failed writes flows through this utility (via `useBlockingError`, of which only the `report` half is consumed here).
- **`src/modules/locales/tests/use-dictionary-cell-editor.spec.ts`** — unit test exercising the composable in isolation.
- **`src/modules/locales/tests/languages-list-actions.spec.ts`** — integration-level test of store actions that this composable triggers.
- **`tests/cross-cutting/module-map.spec.ts`** — structural test asserting this module's exports fit the expected module map.

## Notes

- **Clear is never triggered by blur.** An emptied cell left by focus-out just re-reads the stored value; removal requires an explicit Enter or clear-button click. This is a deliberate UX decision documented in the `handleCellBlur` docblock.
- **`clearing` is a plain `Set<string>`, not reactive.** It exists solely to suppress duplicate confirmation dialogs; it is not exposed to the template.
- **`useBlockingError` is under-used here.** Only `report` (Faro) is consumed; the `message`/`type`/`warn`/`clear` UI mechanism is bypassed in favour of the composable's own per-cell `cellErrors` map, which can hold one message per cell simultaneously.
- **`markSaved` uses `setTimeout`**, not a reactive timer. If the component unmounts before 1.5 s, the timeout callback mutates an orphaned ref (harmless but worth knowing).
- **`entryAt` / `baselineAt` are injected as functions**, not as a reactive lookup, so the composable always reads the aggregation's *current* state at call time rather than holding a stale reference.
