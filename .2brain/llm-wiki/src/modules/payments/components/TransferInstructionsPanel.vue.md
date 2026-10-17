---
source: src/modules/payments/components/TransferInstructionsPanel.vue
sha256: 7dc020be4dd9e0d1349fcf7b3acea2cf8b96053ec75f42697d46a2e94125f7b2
generated_at: 2026-10-17T01:23:02.155059+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/TransferInstructionsPanel.vue

## Purpose

Presentational panel that displays bank-transfer instructions (beneficiary, IBAN, optional BIC, and a reference) for a single payment. It contains no data-fetching logic; all content arrives via the `instructions` prop and is scoped by the API to the payment's buyer or staff. It exists to give customers a clear, copy-ready view of where to send their transfer and the deadline.

## Key elements

- **`name: 'TransferInstructionsPanel'`** — Named component block (separate `<script>` block) so the SFC has a stable identity for devtools and `<KeepAlive>`.
- **`instructions: PaymentBankTransferAction`** (prop) — The single data source: beneficiary, IBAN, optional BIC, reference, and `payBy` deadline.
- **`copy(value: string)`** — Copies a field to the clipboard via `copyToClipboard` (async Clipboard API with `execCommand` fallback) and toasts success or danger. Never rejects; resolves `false` on failure.
- **`groupedReference`** (computed) — Re-formats the reference into 4-character display blocks (e.g. `RF13 2EY8 H44V…`) using a `.{1,4}` regex. Display-only; the copy button still sends the raw ungrouped string.
- **`REFERENCE_GROUP_LENGTH = 4`** — Constant controlling the grouping width.
- **`useNotificationsStore().addMessage`** — Toast dispatcher for copy feedback (success or `EToastType.DANGER`).
- **`useI18n().t`** — All user-facing strings are translation keys under the `transfer-instructions-panel.*` namespace.
- **Template** — A `<v-card>` with a `<dl>` grid for beneficiary/IBAN/BIC rows (BIC row conditional), plus a visually distinct bordered block for the reference with its own copy button and hint text.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** (parent) — Mounts this panel while the payment carries a bank-transfer `nextAction`. Passes the action object as the `instructions` prop.
- **`src/modules/payments/tests/transfer-instructions-panel.spec.ts`** (test) — Unit tests targeting this component's rendering and copy behavior.

## Notes

- The reference is intentionally rendered **large, mono-spaced, and in its own bordered block** rather than as another `<dl>` row, because it is the field that must reach the bank unchanged.
- The copy button for the reference sends `instructions.reference` (raw), **not** `groupedReference`. The backend tolerates spaces, but this component does not inject them into the copied value.
- `BIC` is optional: the row is wrapped in `v-if="instructions.bic"` and renders a bare `<span />` in the grid when absent to preserve column alignment.
- No Pinia/Vuex store is called here; the only external store used is the notification (toast) store from `@guebbit/vue-toolkit`.
- `formatDateTime` from `@/infrastructure/utils/formatters.ts` is the sole formatting utility used, applied to `instructions.payBy`.
