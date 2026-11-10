---
source: src/ui/organisms/DialogHost.vue
sha256: 7b8804ba9eafbadec80dfef29be3f8b95f2ecdcba5d76cfb70cbe3ea319cbe31
signature: 45fb5e6963b4dda9ca1dfb185a50e49d25c0177750a07bad89b6ab0ab98e4064
generated_at: 2026-11-10T06:30:50.889246+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/DialogHost.vue

## Purpose

Single-instance host component that renders the head of the dialog store's confirmation queue as a Vuetify `alertdialog`. Mounted once by the layout (analogous to the toast stack), it is the sole component that knows confirmations are Vuetify dialogs, so restyling every confirmation in the app requires editing only this file.

## Key elements

- **The SFC** (`<script setup>`) — Reads `queue` from `useDialogStore()` via `storeToRefs`; renders only `queue[0]`. Closing by any path other than the confirm button calls `dialogStore.answer(false)`.
- **`current`** (computed) — The front entry of the queue; absent when the queue is empty.
- **`isOpen`** (computed with getter/setter) — Getter: `queue.length > 0`. Setter: when set to `false` (cancel, Escape, scrim click) it calls `dialogStore.answer(false)`. There is no "dismiss without answering" path.
- **`useFullscreenDialog()`** — Returns whether the dialog should fill the viewport (small screens).
- **`useReturnFocus(() => isOpen.value)`** — Restores focus to the element that triggered the confirmation once it closes.
- **`DIALOG_MAX_WIDTH.form`** (imported) — Upper bound on dialog width.
- **`useI18n()` / `t()`** — Provides default `generic.confirm` / `generic.cancel` labels when the caller doesn't override them.
- **`titleId` / `messageId`** (from `useId`) — Wire `aria-labelledby` and `aria-describedby`; `labelledby` points to the title when present, otherwise to the message.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- **Dismiss equals decline.** There is no third "closed without answering" state; every non-confirm close resolves the store's pending promise with `false`.
- **Accessibility naming.** If the caller omits `title`, the dialog is labelled by its `message` (the `aria-labelledby` target switches). A confirmation with neither would be announced as a bare "dialog" — callers should always supply a message.
- **Role placement.** `role="alertdialog"` sits on the `v-dialog` overlay (what Vuetify marks as the dialog surface), not on the inner `v-card`.
- **Queue semantics.** Only one dialog is visible at a time; remaining entries wait. The host never renders multiple dialogs concurrently.
