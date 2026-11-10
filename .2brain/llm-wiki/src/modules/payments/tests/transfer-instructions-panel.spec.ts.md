---
source: src/modules/payments/tests/transfer-instructions-panel.spec.ts
sha256: e5483682f8a380dbe3876f43f80bd7e60ba0fce2e3b386d4306907d8f39d81ef
signature: 99f67809ac397faed0ac5122c1adcbfdeeb6bb45990db6cef8b276dd379cc5a7
generated_at: 2026-11-10T05:17:35.449112+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/transfer-instructions-panel.spec.ts

## Purpose

Vitest spec for the presentational `TransferInstructionsPanel` component. Its central concern is that the reference string shown on screen (grouped into 4-character blocks) is the same characters the copy button writes to the clipboard (ungrouped), preventing a silent mismatch that would cause a failed bank transfer. Secondary coverage: copy-failure notification, optional BIC omission, and static field rendering.

## Key elements

- **`INSTRUCTIONS`** — fixture object typed as `PaymentBankTransferAction` carrying a realistic IBAN, BIC, beneficiary, deadline, and an RF-style reference.
- **`writeText`** — `vi.fn()` mock assigned to `navigator.clipboard.writeText` at module scope; used to assert exact clipboard payload and to simulate rejection.
- **`mountPanel(instructions?)`** — mounts `TransferInstructionsPanel` with the given props and global `vuetify` + `i18n` plugins; defaults to `INSTRUCTIONS`.
- **`beforeEach`** — resets Pinia, clears the clipboard mock, and loads the `'en'` locale before each test.
- **Test cases (6):**
  - Reference is displayed in 4-char blocks (`RF13 2EY8 …`).
  - Copy button sends the raw, unspaced reference to the clipboard.
  - Clipboard rejection surfaces a notification (checked via `useNotificationsStore`).
  - Beneficiary and IBAN render verbatim, with no grouping applied.
  - BIC row is absent when `bic` is `undefined`.
  - Deadline element is always present.

## Relationships

- **`src/modules/payments/components/TransferInstructionsPanel.vue`** — the component under test; imported from `../components/`. All assertions target its rendered DOM (`data-test` attributes) and its interaction with the clipboard API.

## Notes

- The copy-failure test asserts the raw i18n key string (`'transfer-instructions-panel.copy-failed'`) as the notification message, because the full locale dictionary is installed at app boot and is **not** loaded in this spec. The key *is* the expected text here.
- The clipboard stub is applied via `Object.assign(navigator, …)` at the top of the module, outside any `beforeEach`; it persists for the entire spec run and is only cleared (`.mockClear()`) between tests.
- The component is explicitly described as presentational in the file's own doc comment; the spec therefore does not test business logic or store mutations beyond the single notification side-effect.
