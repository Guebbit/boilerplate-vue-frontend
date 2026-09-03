# src/modules/locales/composables/use-dictionary-cell-editor.ts

## Purpose

Vue composable that owns the per-cell write lifecycle on the dictionary board: a local draft map so a blur can distinguish "user changed the value" from "user clicked through", the save / clear / Enter handlers that dispatch into the locales store, and the transient UI state (saved checkmark, inline error) each cell displays after its own last write.

## Key elements

- **`useDictionaryCellEditor(tenant, entryAt, baselineAt, afterWrite)`** — the sole export. Receives a reactive tenant id, two live-lookup callbacks (current entry, current baseline) and a post-write reload hook, then returns all cell-level state and handlers.
- **`cellId(tag, key)`** — builds the per-cell map key as `` `${tag}|${key}` ``; the pipe is safe because no BCP 47 tag contains it.
- **`drafts`** — `Ref<Partial<Record<string, string>>>` holding the in-progress text per cell.
- **`savedCells` / `cellErrors`** — transient maps: a "just saved" flag (auto-cleared after 1 500 ms) and a persistent inline error string, both keyed by `cellId`.
- **`handleCellBlur`** — on focus-out, compares draft to the stored value; creates or edits the entry via the locales store. Deliberately does **not** trigger removal.
- **`handleCellClear`** — explicit removal (Enter on an emptied cell, or the clear button). Opens a confirmation dialog; on cancel restores the stored value and refocuses the input.
- **`handleCellEnter`** — routes to `handleCellClear` when the draft is `''`, otherwise to `handleCellBlur`.
- **`handleCellInput`** — writes the draft and clears any prior error for that cell.
- **`cellLabel(language, key)`** — returns the i18n'd accessible name, including the baseline text when no custom entry exists yet.
- **`boardElement`** — a `Ref<HTMLElement>` exposed for external focus management of newly added rows (set outside this composable).

## Relationships

- **`src/infrastructure/utils/logger.ts`** — not imported directly here. The file calls `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`) in the `settleWrite` catch block; that utility is where the logger is ultimately used to record the failure.

## Notes

- **Removal is never triggered by blur.** The design explicitly avoids a confirmation dialog stealing focus mid-navigation. An emptied cell left by blur simply re-reads the stored value; removal requires Enter or the clear button.
- **`tenant` is only read when creating a new entry.** Edits and removals target the entry's own `id` and never consult the tenant ref.
- **Lookup functions instead of reactive data.** `entryAt` and `baselineAt` are plain callbacks into the aggregation's current state, ensuring a write always reads the record it is about to replace rather than a stale snapshot.
- **`SAVED_MARK_MS` (1 500 ms)** controls how long the checkmark persists; the `setTimeout` closure captures `id` at call time, so rapid successive saves on different cells do not cancel each other.
- **`boardElement` is written externally.** This composable only declares and returns the ref; the consuming component assigns it after mount.
