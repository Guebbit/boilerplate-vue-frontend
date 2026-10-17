---
source: src/modules/payments/tests/transfer-instructions-panel.spec.ts
sha256: e5483682f8a380dbe3876f43f80bd7e60ba0fce2e3b386d4306907d8f39d81ef
generated_at: 2026-10-17T01:26:09.817042+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/transfer-instructions-panel.spec.ts

## Purpose

Vitest spec that pins the one behavior most likely to silently break a customer's real bank transfer: the reference string displayed on screen (grouped in 4-char blocks) and the string the copy button puts on the clipboard (raw, ungrouped) must be derived from the same source value. Also verifies basic rendering of beneficiary, IBAN, BIC-omission, and deadline.

## Key elements

- **`INSTRUCTIONS`** — fixture of type `PaymentBankTransferAction` with a realistic IBAN, BIC, and RF-format reference used across all tests.
- **`writeText`** — `vi.fn()` mock installed on `navigator.clipboard.writeText` at module level via `Object.assign`; cleared in `beforeEach`.
- **`mountPanel(instructions?)`** — convenience wrapper around `mount(TransferInstructionsPanel, …)` that injects Vuetify and i18n plugins; accepts an optional instructions override.
- **`beforeEach`** — resets Pinia, clears the clipboard mock, and loads the `en` locale.
- **`describe('TransferInstructionsPanel')`** — five `it` blocks covering: reference grouping display, raw reference copy, copy-failure notification, ungrouped beneficiary/IBAN rendering, BIC row omission, and deadline visibility.

## Relationships

- **`src/modules/payments/components/TransferInstructionsPanel.vue`** — the component under test; imported directly and mounted via `mountPanel`. All `data-test` selectors target elements in that component's template.
- **`@guebbit/vue-toolkit`** — provides `useNotificationsStore`, used in the copy-failure test to assert the last pushed notification message.
- **`@/i18n`** — supplies the `i18n` plugin (injected into the mount) and `loadLocale('en')` called in setup.
- **`@/ui/vuetify`** — Vuetify plugin injected so the component renders in a full UI context.
- **`@types`** — source of the `PaymentBankTransferAction` type that shapes the `INSTRUCTIONS` fixture.

## Notes

- The clipboard mock is installed once at **module top-level** (`Object.assign(navigator, …)`), not inside `beforeEach`, so it persists across the whole file. Only `mockClear()` is called per test.
- The copy-failure test asserts on the **i18n key string** (`'transfer-instructions-panel.copy-failed'`) rather than a human-readable message, because the full module dictionary is loaded at app boot and is *not* present in this isolated spec.
- `flushPromises` is required after triggering the copy button because the component's click handler is async (awaits `navigator.clipboard.writeText`).
- The component is explicitly described as **presentational** (no internal state logic to test); the spec therefore focuses on output correctness and side-effects (clipboard, notifications) only.
