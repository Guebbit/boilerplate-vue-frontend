---
source: src/modules/payments/components/PaymentStatusChip.vue
sha256: 1ae6b63e04c951598f1758f33f6d18b020e263371a18c665cb7ecc96fecf255a
generated_at: 2026-10-17T01:21:56.739129+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentStatusChip.vue

## Purpose
A small presentational component that renders a payment's `displayStatus` as a coloured, i18n-labelled `v-chip`. It exists so every surface that shows a payment status (drawer, panel, table) renders it identically without duplicating the colour/label mapping.

## Key elements
- **`PaymentStatusChip`** (default export) — Named component block; gives the SFC a stable name for Vue DevTools and `<KeepAlive>`.
- **`status` prop** (`PaymentDisplayStatus`) — The single input; the server-derived display status. Never recomputed locally from `status` + `amountRefunded`.
- **`COLORS`** — A `satisfies Record<PaymentDisplayStatus, string>` map that assigns a Vuetify colour token per status. The `satisfies` constraint ensures adding a new status to the `PaymentDisplayStatus` type fails the build here rather than silently rendering grey.
- **Template** — A `<v-chip size="small" variant="tonal">` with a `data-test="payment-status"` attribute for E2E selectors.

## Relationships
- **PaymentDrawer.vue** — Renders this chip to show the status of the payment currently being inspected in the drawer.
- **PaymentPanel.vue** — Renders this chip within the payment detail panel.
- **PaymentsTable.vue** — Renders this chip in the status column of each table row.

All three are purely presentational consumers; they pass a `PaymentDisplayStatus` value and the chip emits nothing.

## Notes
- The label is always the server-provided `displayStatus` (e.g. `refund_pending` stays "Refund pending"). It is intentionally **not** derived from `status` + `amountRefunded`, because a refund that is still in-flight would look complete from the amounts alone.
- The `data-test="payment-status"` attribute is the stable E2E hook; prefer it over text matching in tests.
- Adding a new `PaymentDisplayStatus` member requires a matching `COLORS` entry — the `satisfies` constraint makes this a compile-time error, not a silent fallback.
