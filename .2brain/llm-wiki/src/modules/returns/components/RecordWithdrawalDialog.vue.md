---
source: src/modules/returns/components/RecordWithdrawalDialog.vue
sha256: ba1f56074fc111adf0f4ff62fb490cc4380d02c04011f9d7e46ce57f73382302
signature: ba1f56074fc111adf0f4ff62fb490cc4380d02c04011f9d7e46ce57f73382302
generated_at: 2026-11-10T05:35:57.728265+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/RecordWithdrawalDialog.vue

## Purpose

A staff-facing dialog for recording a buyer's withdrawal that was communicated off-platform (phone, email, or letter). It captures the date the buyer sent the withdrawal and the channel used, then calls the returns store to create the return with `reason: 'withdrawal'`. It exists so staff can log withdrawals that the buyer never triggered through the in-app button, with the server judging the return window on the buyer's stated date rather than the recording date.

## Key elements

- **Props / Emits / Model** — `orderId` (string), `recorded` event (tells the parent to re-fetch the order), and a required `v-model` boolean `isOpen` controlling visibility.
- **`schema` (zod)** — Validates `requestedAt` (non-empty, not in the future, via `isStatedInTime`) and `statedVia` (must match a known channel, via `isStatementChannel`).
- **`useStructureFormValidation`** — Manages form state, per-field errors, submit gating, and locale-driven revalidation. On invalid submit it toasts a generic "fix errors" message.
- **`useBlockingError`** — A dialog-level error slot for unhandled server rejections (closed window, missing key, lost race), displayed inline next to the confirm button via `InlineErrorAlert`.
- **`watch(isOpen)`** — Resets the form and clears the blocking error every time the dialog opens.
- **`submit()`** — On valid form data: narrows `statedVia` to a `STATEMENT_CHANNELS` entry, converts the local date string to ISO via `localToIso`, calls `openReturn`, toasts success, closes the dialog, and emits `recorded`. On failure, routes mapped errors to field errors and unmapped ones to the blocking error.

## Relationships

- **`src/modules/returns/store.ts`** — Consumes `useReturnsStore`: calls `openReturn` to create the withdrawal and reads `loading` to disable the submit button during the in-flight request.
- **`src/modules/returns/domain/statement.ts`** — Imports `STATEMENT_CHANNELS` (channel list for narrowing), `isStatedInTime` and `isStatementChannel` (validation predicates in the zod schema), and `localToIso` (date conversion before the API call).
- **`src/modules/returns/components/StatedAtFields.vue`** — Rendered inside the form; its `requested-at` and `stated-via` v-models are bound to the form's reactive state, and it receives per-field error arrays as props when `showFormErrors` is true.
- **`src/modules/returns/tests/record-withdrawal-dialog.spec.ts`** — Unit test suite for this component.

## Notes

- The dialog is explicitly for **staff recording** a withdrawal the buyer sent externally; it is not the buyer's own in-app withdrawal button. The server treats both paths identically once the request is made.
- `localToIso` is applied at submit time, not in the form model — the form holds a local date string, the API gets an ISO timestamp.
- Double-submission is guarded by the `loading` ref from the store, not by a local flag.
- The `channel` variable is narrowed from the zod-validated string to a known `STATEMENT_CHANNELS` entry; if the narrowing fails (shouldn't happen after validation) the promise resolves silently rather than throwing.
