---
source: src/modules/locales/composables/use-dictionary-cell-editor.ts
sha256: a4a5247b3db9b0ea38d30ce859fd833e00b401d2682336547c31ab5d9bbc8464
generated_at: 2026-10-02T15:13:33.457227+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/composables/use-dictionary-cell-editor.ts

## Purpose

Composable that owns the editing lifecycle of a single cell on the dictionary board. It keeps a local draft per cell (so a blur can distinguish "user typed something" from "user just clicked through"), routes save/clear/enter actions into the locales store, and exposes transient per-cell feedback (saved check-mark, inline error) without touching global toast state for routine failures.

## Key elements

- **`useDictionaryCellEditor(tenant, entryAt, baselineAt, afterWrite)`** — the sole export. Wires together drafts, saved-mark, and error state for one board; returns the handlers and state refs a cell template binds to.
- **`cellId(tag, key)`** — builds the compound map key (`tag|key`) used as the dictionary key for all per-cell state.
- **`drafts` / `savedCells` / `cellErrors` / `boardElement`** — reactive refs (`Partial<Record<string, …>>`) holding the local editing state.
- **`handleCellBlur`** — on focus-out, creates a new entry (if the cell was empty) or edits the existing one; does **not** remove.
- **`handleCellClear`** — explicit removal path (Enter on an emptied cell, or the clear button); opens a confirm dialog before calling `localesStore.removeEntry`.
- **`handleCellEnter`** — dispatches: emptied cell → `handleCellClear`; otherwise → `handleCellBlur`.
- **`handleCellInput`** — records the keystroke into `drafts` and clears any stale `cellErrors` entry.
- **`cellLabel`** — builds the accessible `aria-label`, switching wording when a baseline translation exists and no user entry does.
- **`settleWrite`** (internal) — common promise chain: on success forgets the draft and calls `afterWrite`; on failure sets the inline `cellErrors` message and reports via `reportCellFailure`.
- **`SAVED_MARK_MS`** (constant, 1500 ms) — how long the "✓ saved" badge lingers on a cell.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — reached indirectly through `useBlockingError` (imported from `use-blocking-error.ts`). This file destructures only the `report` function and calls it as `reportCellFailure(error)` inside `settleWrite`'s `.catch`, forwarding the failure to Faro/observability without using `useBlockingError`'s message-slot machinery.

## Notes

- **Blur never removes.** An emptied cell left by blur simply drops its draft and re-reads the stored value. Removal requires an explicit Enter or clear-button click, gated behind a confirm dialog — a deliberate UX choice to avoid a focus-stealing dialog on passive focus shifts.
- **`useBlockingError` is partially used.** Only `report` is consumed; its `message`/`type`/`warn`/`clear` slot is bypassed because this composable manages its own per-cell inline errors (`cellErrors`) rather than a single global slot.
- **`tenant` is create-only.** Edits and removals target the entry's own `id`; `tenant` is read solely in `handleCellBlur`'s `addEntry` call.
- **`cellId` separator `|`** is chosen because it cannot appear in a BCP 47 language tag, making the composite key collision-safe.
- **`boardElement`** is a ref that a parent template can set so newly-added rows can focus their cell without a global DOM query; it is returned but not mutated inside this composable.
