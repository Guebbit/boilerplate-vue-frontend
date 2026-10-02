---
source: src/modules/users/components/UserAccessDialog.vue
sha256: 93aaa559d5728bdab5f3960cfac94a72858f91ec39f8f83c5a4417057853c0b6
generated_at: 2026-10-02T15:47:21.248961+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/components/UserAccessDialog.vue

## Purpose
A two-step admin dialog (pick → confirm) for changing another user's role and/or active status. It exists to force an explicit, named confirmation—especially when deactivating—before the caller's promise in `useUserAccessDialog()` resolves. It supports a `skipPicker` mode where the values were already chosen elsewhere (`UserEdit.vue`) and only the confirm step runs.

## Key elements
- **`props.target` / `props.options`** — Identity of the user being edited and how the dialog was opened (`skipPicker`, `chosenRole`, `chosenActive`). Both are `undefined` while closed.
- **`isOpen` (`defineModel<boolean>`)** — Two-way binding for dialog visibility; the component does not manage its own open/close state.
- **`step` ref (`'pick' | 'confirm'`)** — Internal panel switch. Seeded by the `watch(isOpen)` block on each open.
- **`selectedRole` / `selectedActive`** — Local form values, re-seeded from `target` (or `options.chosen*`) every time the dialog opens.
- **`hasChanges` / `roleChanged` / `activeChanged`** — Computed booleans that gate the "Continue" button and drive the confirm summary.
- **`isDeactivating` / `isSelf`** — Flag the two dangerous cases: turning off activity, and doing it to the signed-in admin. Drive button colour and an extra warning alert.
- **`summaryLines`** — Ordered array of i18n strings, one per changed field, rendered in the confirm panel.
- **`handleConfirm`** — Emits `confirm` with an object containing *only* the fields that differ from the loaded values (unchanged fields are `undefined`), so the caller can spread it directly into a PATCH body without re-triggering the backend's role-grant check.
- **`handleCancel`** — Closes the dialog and emits `cancel`.
- **`useFullscreenDialog()` / `useReturnFocus()`** — Responsive fullscreen on small screens; restores focus to the trigger element on close.

## Relationships
No graph neighbors are listed. The component imports from:
- `@/ui/composables/use-fullscreen-dialog.ts` and `use-return-focus.ts` (UI utilities)
- `@/infrastructure/session.ts` (current admin identity for the self-deactivation check)
- `@/modules/users/domain` (`userRoleOptions` for the select)
- `@/modules/users/composables/use-user-access-dialog.ts` (type imports only: `UserAccessDialogRequestOptions`, `UserAccessDialogResult`, `UserAccessDialogTarget`)

The parent that opens the dialog and consumes the `confirm`/`cancel` emits is `useUserAccessDialog()` (not shown here).

## Notes
- **One instance, many rows.** The `watch(isOpen)` re-seeds state on *every* open, not on mount, because the same component instance is reused across a list. Don't move seeding logic to `onMounted`.
- **Partial PATCH body.** `handleConfirm` emits `role: undefined` or `active: undefined` for unchanged fields. The caller must filter out `undefined` keys before sending; sending an unchanged `role` re-runs the backend's permission-grant check unnecessarily.
- **`skipPicker` hides the Back button.** When `options.skipPicker` is true the confirm panel omits the "Back" button and the picker step is never reachable.
- **`goToConfirm` guard.** The "Continue" button is `:disabled="!hasChanges"`, but the function also early-returns if `!hasChanges` to guard against a keyboard-submit edge case.
- **`v-if="target"` on the card.** The card content only renders when `target` is set; the dialog shell (`v-dialog`) still mounts in the meantime.
