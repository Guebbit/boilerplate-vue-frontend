# src/app/components/AppDialogHost.vue

## Purpose

A single, layout-mounted confirmation dialog host. Any component in the app that needs a "Are you sure?" prompt calls `useDialogStore().confirm(...)` instead of rendering its own dialog. This component is the only place that ties that abstract request to a concrete Vuetify `v-dialog`, so restyling or reworking all confirmations is a one-file edit.

## Key elements

- **`queue` (from `useDialogStore`)** — A reactive array of pending confirmations. The host always renders only the first entry (`queue.value.at(0)`); the rest wait their turn.
- **`isOpen` (computed with getter/setter)** — Getter: `queue.length > 0`. Setter: closing the dialog (Escape, scrim click, cancel button) calls `dialogStore.answer(false)`. There is no distinct "dismissed" state — every non-confirm close is a decline.
- **`current` (computed)** — The front-of-queue entry being displayed.
- **`titleId` / `messageId` (via `useId`)** — Stable ARIA IDs so the `v-dialog` is properly named (`aria-labelledby`) and described (`aria-describedby`). The title is used as the accessible name when the caller provides one; otherwise the question text is used.
- **`data-test` attributes** — `app-dialog`, `app-dialog-message`, `app-dialog-cancel`, `app-dialog-confirm`. These are the selectors the e2e suite keys off.
- **Default labels** — `t('generic.cancel')` / `t('generic.confirm')` via `vue-i18n`, overridable per-call via `cancelLabel` / `confirmLabel` on the queue entry.

## Relationships

- **`tests/e2e/specs/keyboard.cy.ts`** — The keyboard e2e spec drives this component's `data-test` hooks (notably `app-dialog-cancel` / `app-dialog-confirm`) and exercises the Escape-key close path, which flows through the `isOpen` setter and `dialogStore.answer(false)`.

## Notes

- There is intentionally **no third answer**. Escaping the dialog, clicking the scrim, or pressing the cancel button all resolve the pending promise with `false`. Callers must not rely on a "dismissing is not the same as canceling" distinction.
- The `role="alertdialog"` and ARIA naming sit on the `v-dialog` overlay element (the one Vuetify marks as the dialog), not on the inner `v-card`. Don't move them to the card.
- The component is mounted **once** by the app layout, alongside the toast stack. It does not appear in any route or per-page template.
- `max-width` is hardcoded to `480`. Adjust it here if a design change requires a different size.
