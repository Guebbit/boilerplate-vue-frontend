---
source: src/modules/users/components/UserPurchaseHoldDialog.vue
sha256: 0af95e768b7aee54132df28d2c0fc58853f55a2fb85a07d08a186b4b2f3b21b6
signature: 3a80bc0bce1a92842a594e2291f94d684af3e7e72678f4081ab54766aad630c5
generated_at: 2026-11-10T06:03:05.749665+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/components/UserPurchaseHoldDialog.vue

## Purpose

A Vuetify dialog that lets an admin pause checkout for a single user account by setting an end date and writing a buyer-facing refusal note (GDPR Art. 22(3) — the reason and a way to contest it). It is a pure form component: it collects and validates input, then hands the request body up to the parent page via an emitted event. The page owns the actual write.

## Key elements

- **`isOpen` (v-model, required)** — two-way boolean controlling dialog visibility.
- **`target` prop (`{ id, name } | undefined`)** — identifies the user the hold applies to; `undefined` while the dialog is closed.
- **`confirm` emit** — passes a `PlacePurchaseHoldRequest` (`{ until, note? }`) to the parent.
- **`cancel` emit** — signals the user backed out; parent owns cleanup.
- **`tomorrow()`** — returns today + 1 day as `YYYY-MM-DD` (UTC); used as the minimum selectable date and as the form's default.
- **`watch(isOpen)`** — re-seeds `untilDate` and `note` every time the dialog opens, since one component instance serves every user.
- **`dateValid` (computed)** — regex + lexicographic check that the date is a real day on/after tomorrow.
- **`handleConfirm`** — guards on `dateValid`, trims the note, builds the `until` timestamp as `T23:59:59.999Z`, omits `note` if empty, and emits `confirm`.
- **`handleCancel`** — sets `isOpen` to `false` and emits `cancel`.

## Relationships

- **`src/modules/users/views/UserTarget.vue`** — parent page that renders this dialog, owns the `isOpen` state, and is responsible for issuing the API write on `confirm`.
- **`src/modules/users/tests/user-purchase-hold-dialog.spec.ts`** — unit/integration tests exercising the form validation, date rules, and emitted payloads.

## Notes

- The note field is intentionally phrased for the *end user* to read, not for internal record-keeping; the form hints and labels make that explicit to the admin.
- `note` is optional in the emitted payload: if the admin leaves it blank (or all-whitespace), the key is omitted entirely rather than sent as an empty string.
- Date validation is purely client-side (regex + string comparison against `tomorrow()`); the backend presumably enforces the same constraint.
- The component uses `DIALOG_MAX_WIDTH.form` and `fieldErrorProps` from the shared UI layer — follow those conventions when styling or adding fields.
- All `data-test` attributes (`user-purchase-hold-dialog`, `-until`, `-note`, `-cancel`, `-confirm`) are relied upon by the spec file; renaming them will break tests.
