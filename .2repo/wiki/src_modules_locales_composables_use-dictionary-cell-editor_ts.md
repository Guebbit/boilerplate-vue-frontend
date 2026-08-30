# src/modules/locales/composables/use-dictionary-cell-editor.ts

## Purpose

Vue composable that owns the per-cell edit lifecycle on the dictionary board. It keeps a local draft map so a blur event can distinguish "value actually changed" from "user just clicked through," routes save/clear/enter actions into the locales store, and exposes transient per-cell UI state (saved check-mark, inline error) that a cell component renders for its own last write.

## Key elements

- **`useDictionaryCellEditor(tenant, entryAt, baselineAt, afterWrite)`** — the sole export. Returns all reactive state and handlers a cell component needs.
  - `tenant` (Ref\<string\>): target tenant for **new** entries; edits/removals use the entry's own id.
  - `entryAt` / `baselineAt`: live lookups into the parent aggregation so writes read the current record, not a stale one.
  - `afterWrite(tag)`: callback that reloads the column, manifest, and live app after any write settles.
- **`cellId(tag, key)`** — builds a composite draft-key (`tag|key`); the `|` separator is safe because BCP 47 tags never contain it.
- **`drafts`** (Ref\<Partial\<Record\<string,string\>\>\>) — per-cell local text; lets blur compare "what the user typed" against "what's stored."
- **`savedCells`** / **`cellErrors`** — per-cell transient UI flags (check-mark, inline error message) keyed by `cellId`.
- **`boardElement`** (Ref\<HTMLElement\>) — board container ref returned so a caller can focus a newly-added row without a global DOM query.
- **`handleCellBlur`** — on blur, decides create (draft over empty cell) vs edit (different non-empty value) vs no-op (unchanged or emptied). Deliberately never triggers removal.
- **`handleCellClear`** — explicit removal path (Enter on empty cell, or clear-button click). Opens a confirmation dialog; on cancel restores focus and discards the draft.
- **`handleCellEnter`** — routes Enter to `handleCellClear` if the draft is `''`, otherwise delegates to `handleCellBlur`.
- **`handleCellInput`** — records keystroke in the draft map and clears any prior error on that cell.
- **`cellLabel`** — builds the cell's accessible name (key + language + baseline, when applicable) via i18n.
- **`settleWrite`** (internal) — common post-write logic: on success forgets the draft and calls `afterWrite`; on failure sets the cell's inline error and fires a toast via `notifyErrorMessages`.
- **`SAVED_MARK_MS`** (1500) — how long the per-cell "saved" check-mark persists before auto-clearing via `setTimeout`.

## Relationships

- **`src/infrastructure/utils/errors.ts`** — `notifyErrorMessages` is called inside `settleWrite`'s `.catch` branch to surface a failure both as a toast and (transitively) through the logger.
- **`src/infrastructure/utils/logger.ts`** — indirect dependency; reached through the `errors.ts` → logger chain when `notifyErrorMessages` logs the underlying error. This file does not import the logger directly.
- **`src/modules/locales/store.ts`** — `useLocalesStore` provides `addEntry`, `editEntry`, and `removeEntry`, the three mutations this composable triggers.
- **`src/infrastructure/stores/dialog.ts`** — `useDialogStore.confirm` is used by `handleCellClear` to gate destructive removal behind a user confirmation.
- **`@guebbit/vue-toolkit`** — `useNotificationsStore.addMessage` is used for success toasts and (via `notifyErrorMessages`) error toasts.

## Notes

- **Removal is never triggered by blur.** An emptied cell left by a simple focus-out just resets to its stored value. Only an explicit Enter-on-empty or the clear button can reach `handleCellClear`, avoiding a surprise confirmation dialog mid-navigation.
- **Draft comparison uses `entryAt` (live lookup), not a captured snapshot.** This means the composable always compares the draft against whatever the aggregation currently reports for that cell, guarding against stale state if the aggregation reloads mid-interaction.
- **`boardElement` is written by the caller, not this composable.** It is declared here so the cell component can set `boardElement.value = $el` and later focus a new row without a `document.querySelector`.
- **Error state persists until the cell is edited again.** `forgetError` is only called from `handleCellInput`; there is no timeout on `cellErrors` (unlike `savedCells`).
- **`omit` from `lodash-es`** is used to remove a single key from the draft/error/saved maps, producing a new object each time to trigger Vue reactivity.
