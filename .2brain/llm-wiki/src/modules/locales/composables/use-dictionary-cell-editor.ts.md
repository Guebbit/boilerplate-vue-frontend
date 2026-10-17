---
source: src/modules/locales/composables/use-dictionary-cell-editor.ts
sha256: f2dbf5794d26b57febbfe25e91a2e38cb94c140b5d5ccc2b95bade5cc9a00887
generated_at: 2026-10-17T01:03:47.915814+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/composables/use-dictionary-cell-editor.ts

## Purpose

Composable that owns the per-cell edit lifecycle on the locales dictionary board. It tracks a local draft per cell (keyed by tag+key) so a blur event can distinguish "user typed something" from "user clicked through," and it wires the save / clear / enter / input handlers to the locales store while managing the transient UI state each cell displays (a saved checkmark, an inline error message).

## Key elements

- **`useDictionaryCellEditor(app, entryAt, baselineAt, afterWrite)`** — the sole export. Parameters: target app id (for *new* entries only), a live entry lookup, a baseline lookup (for accessible labels), and a post-write callback (column reload, manifest refresh, live-app update).
- **`cellId(tag, key)`** (module-level) — builds the composite cell key as `` `${tag}|${key}` ``; the `|` separator is chosen because BCP 47 tags never contain it.
- **`handleCellBlur`** — on focus-out, saves the draft if it differs from the stored value. Creates the entry (`addEntry`) when the cell was previously empty, or edits it (`editEntry`) otherwise. An emptied cell is *not* removed here (avoids an uninvited confirmation dialog stealing focus).
- **`handleCellClear`** — explicit removal path (Enter on an emptied cell, or the clear button). Opens a confirmation dialog via `useDialogStore`; on cancel, restores focus to the originating input. On accept, calls `removeEntry` and fires a success toast.
- **`handleCellEnter`** — routes to `handleCellClear` when the draft is `''`, otherwise to `handleCellBlur`.
- **`handleCellInput`** — records the keystroke into `drafts` and clears that cell's error if one was showing.
- **`cellLabel(language, key)`** — returns the i18n'd accessible name; includes the baseline text when the cell has no entry yet.
- **`drafts` / `savedCells` / `cellErrors`** — reactive `Partial<Record<cellId, …>>` maps for the three per-cell UI states. `savedCells` is cleared automatically after `SAVED_MARK_MS` (1500 ms).
- **`boardElement`** — a ref to the board's root `<HTMLElement>`, exposed so the view can focus a newly created row without a global DOM query.
- **`settleWrite`** (internal) — shared post-write pipeline: on success, drops the draft and calls `afterWrite`; on failure, sets the cell's inline error and reports via `useBlockingError.report` (Faro).

## Relationships

- **`src/modules/locales/store.ts`** — imports `useLocalesStore` and calls its `addEntry`, `editEntry`, and `removeEntry` actions for every write.
- **`src/modules/locales/views/LocalesDictionary.vue`** — the consuming view; instantiates the composable and binds its returned handlers/refs to the board's cells.
- **`src/modules/locales/tests/use-dictionary-cell-editor.spec.ts`** — unit-test spec for this composable.
- **`src/infrastructure/utils/logger.ts`** — reached indirectly through `useBlockingError` (imported from the adjacent `use-blocking-error.ts` utility); only the `report` function is used here to send failure telemetry (Faro).

## Notes

- The `app` parameter is read **only** in the create path (`addEntry`). Edits and removals use the entry's own `current.app` field, so the parameter is irrelevant to those flows.
- `useBlockingError` is intentionally used *partially*: only its `report` (Faro) half. Its `message` / `type` / `warn` / `clear` state is unused because this composable keeps its own per-cell error map (`cellErrors`) instead of the single-slot model `useBlockingError` normally provides.
- Blur never triggers a removal. An emptied cell left by blur simply reads back its stored value. Removal requires an explicit Enter-on-empty or clear-button click, which gates the action behind a confirmation dialog.
- `entryAt` and `baselineAt` are injected as functions (not static maps) so the composable always reads the aggregation's *current* record rather than a snapshot captured at setup time.
