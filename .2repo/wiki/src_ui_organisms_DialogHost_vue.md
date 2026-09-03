# src/ui/organisms/DialogHost.vue

## Purpose

A single-instance confirmation dialog host mounted once by the application layout. Any component that needs a confirmation calls `useDialogStore().confirm(...)` and never renders a dialog itself; this host is the only place that knows confirmations are Vuetify dialogs, so restyling every "Are you sure?" in the app is an edit to this one file.

## Key elements

- **`isOpen` (computed get/set)** — Getter: `queue.length > 0`. Setter: when set to `false` (cancel button, Escape, scrim click) it calls `dialogStore.answer(false)`. There is no third state; dismissing always means declining.
- **`current` (computed)** — `queue.value.at(0)`; the confirmation at the front of the store's queue. The rest wait their turn.
- **`titleId` / `messageId`** — Stable ids from `useId()` used for `aria-labelledby` and `aria-describedby` so the dialog is always accessible-named (title if provided, otherwise the question text).
- **`mobile` (from `useDisplay`)** — When true, the `v-dialog` is rendered `fullscreen` instead of at a fixed `max-width="480"`, avoiding letterboxing on narrow screens.
- **`dialogStore` / `queue`** — Pinia refs from `useDialogStore` (`@/ui/dialog.ts`). All state lives in the store; this component is purely presentational.
- **Template** — A `v-dialog` with `role="alertdialog"` wrapping a `v-card` with optional title, message, and two action buttons (cancel / confirm). Buttons carry `data-test` attributes (`app-dialog`, `app-dialog-message`, `app-dialog-cancel`, `app-dialog-confirm`) for e2e selectors.

## Notes

- Closing by any route other than the confirm button (cancel, Escape, scrim) always resolves the store's pending promise with `false`. There is no "dismissed" vs. "declined" distinction.
- The `v-card` is guarded by `v-if="current"`, so a transient empty-queue render produces no card inside the dialog shell.
- Button labels fall back to i18n keys `generic.cancel` / `generic.confirm` if the caller didn't supply custom `cancelLabel` / `confirmLabel`.
- The `v-if="current"` on the card means that after the last queued dialog is answered, the card disappears in the same tick the `isOpen` getter flips to `false`.
