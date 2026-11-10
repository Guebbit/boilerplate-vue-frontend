---
source: src/modules/payments/components/PaymentStatusChip.vue
sha256: 9ee365ae8c5f2833aa169a029c90effb6ae40071eedde34b1fbc02f9f0b9e81f
signature: cd5092beeeeb77aec2d0b7515fcc68e2b2558b1aef4529c4a52d150292b296e9
generated_at: 2026-11-10T05:09:11.787955+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentStatusChip.vue

## Purpose
A small, purely presentational chip that renders a payment's `displayStatus` as a coloured, translatable label. It exists to give the larger payment views (drawer, panel, table) a single consistent visual affordance for status without each re-implementing the colour/label mapping.

## Key elements
- **`status` prop** – accepts a single `PaymentDisplayStatus` value (sourced from `Payment.displayStatus` on the server). The component never derives or recomputes status from `status` + `amountRefunded`; it trusts the server's derived value.
- **`COLORS` map** – maps every `PaymentDisplayStatus` to a `ThemeColor` (or `undefined` for `canceled`). Uses TypeScript `satisfies Record<…>` so a future status added to the union type causes a compile error rather than silently rendering uncoloured.
- **Template** – a single Vuetify `<v-chip size="small" variant="tonal">` whose label comes from `t('payments-list-page.display-status-${status}')` (vue-i18n). Carries `data-test="payment-status"` for E2E selectors.
- **Named block** (`export default { name: 'PaymentStatusChip' }`) – provides a stable component name for devtools / `<KeepAlive>` since `<script setup>` cannot declare one.

## Relationships
- **PaymentsTable.vue** – renders `PaymentStatusChip` per row to show status at a glance in the list view.
- **PaymentPanel.vue** – embeds the chip in the expanded payment detail panel for a quick status indicator.
- **PaymentDrawer.vue** – uses the chip inside the drawer header/body so the status is visible without scrolling.

In all three cases the parent passes the `status` prop; the chip is stateless and communicates no events back.

## Notes
- `canceled` intentionally maps to `undefined` (no colour), so the chip renders as a plain tonal chip. If this feels wrong, it is by design — update the map and the i18n key together.
- Adding a new `PaymentDisplayStatus` variant requires **both** a new entry in `COLORS` (the `satisfies` guard enforces this at compile time) **and** a matching `payments-list-page.display-status-<value>` i18n key.
- Do not attempt to compute status from raw `status`/`amountRefunded` fields here; the component contract is "render what the server says."
