---
source: src/modules/payments/components/TransferInstructionsPanel.vue
sha256: 5b534e91af81063b3e16d9b816218b5b5e3e08d1e9d55fa9234df428688b3294
signature: de9fda6e32af8aa4f41d6dea7963a24e39b1c0477bc75d5e61dd46b8d9e5b51f
generated_at: 2026-11-10T05:10:45.511594+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/TransferInstructionsPanel.vue

## Purpose

Presentational panel that renders a bank-transfer payment's instructions (beneficiary, IBAN, BIC, reference, deadline). It exists so a customer or staff member can read and copy the exact values needed to execute a bank transfer. All data arrives via a single prop from the payment's `nextAction`; the component performs no data fetching itself.

## Key elements

- **Dual `<script>` blocks** – The plain `<script lang="ts">` block declares `name: 'TransferInstructionsPanel'` for devtools/`<KeepAlive>`; the `<script setup>` block holds all logic.
- **`instructions` prop** – Typed as `PaymentBankTransferAction`; the sole data source for every rendered field.
- **`groupedReference` computed** – Splits the raw reference into 4-character blocks joined by spaces (e.g. `RF13 2EY8 H44V JAVZ KX80 JRL`) for display only. The `CopyButton` still copies the ungrouped `instructions.reference`.
- **`CopyButton` usages** – One for IBAN, one for the reference. Both pass the raw (ungrouped) value to `:text` and supply an i18n `failure-key`.
- **BIC row** – Conditionally rendered (`v-if="instructions.bic"`); the rest of the fields are always shown.
- **`data-test` attributes** – Present on every semantically meaningful element (panel, deadline, beneficiary, IBAN, BIC, reference block, both copy buttons) for E2E/unit selectors.

## Relationships

- **`PaymentPanel.vue`** (parent) – Mounts this component while the active payment carries a bank-transfer `nextAction`. The panel supplies the `instructions` object; this component renders it without modification.
- **`transfer-instructions-panel.spec.ts`** – Unit/E2E spec that exercises the component's rendering paths (presence of BIC row, grouped reference display, copy-button text) by mounting with mock props.

## Notes

- **Grouping is display-only.** The 4-char grouping (`REFERENCE_GROUP_LENGTH = 4`) is applied via a regex and a `computed`; the value passed to `CopyButton` is always the raw string. Do not "fix" the copy to use the grouped value—the backend tolerates spaces, but adding them client-side is intentionally avoided.
- **No store / composable imports.** The component is purely presentational by design; if a future requirement needs data beyond `nextAction`, that logic belongs in `PaymentPanel` or a composable, not here.
- **Tailwind restriction bypass.** The `dl` grid uses `grid-cols-[auto_1fr_auto]`, which triggers an eslint rule (`no-restricted-classes`); the disable comment is intentional and scoped to that single element.
- **`wrap-anywhere`** on the reference `<p>` ensures long RF references break mid-token rather than overflowing the card.
