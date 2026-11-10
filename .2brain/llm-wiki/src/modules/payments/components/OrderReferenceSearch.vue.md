---
source: src/modules/payments/components/OrderReferenceSearch.vue
sha256: 092bf226133c3f5a8086883c8add2ca1382ade6642893d9edaa2cc40d81af223
signature: 092bf226133c3f5a8086883c8add2ca1382ade6642893d9edaa2cc40d81af223
generated_at: 2026-11-10T05:08:07.137431+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/OrderReferenceSearch.vue

## Purpose

A single-field lookup widget that lets an admin paste an RF creditor reference (as seen on a bank statement) and resolve it to the order that pays it. The component does **not** navigate itself; it emits the found order's ID so the hosting view decides what "found" means. It is published for any host to mount, because the `payments` module has no `dependsOn` reach into `orders`.

## Key elements

- **Dual `<script>` blocks** — a plain `<script>` block declares `name: 'OrderReferenceSearch'` for devtools / `<KeepAlive>`; all logic lives in `<script setup>`.
- **`search()`** — the sole action. Trims the field, no-ops if blank or `paymentsStore.loading`, calls `paymentsStore.findOrderIdByReference(typed)`, then either emits `found` with the order ID or blocks in place via `useBlockingError`.
- **`emit('found', orderId)`** — the only output contract. The host (e.g. `OrdersList.vue`) performs any navigation.
- **`useBlockingError`** — distinguishes a *miss* (`warnSearchNotFound`, non-reporting) from a *real failure* (`reportSearchError`, sends to Faro). Both render through `InlineErrorAlert`; neither emits.
- **`InlineErrorAlert`** — in-card error surface; no toast is used for either miss or failure.
- **Button gating** — disabled while the field is blank or `paymentsStore.loading` is true. The component uses its own `<v-btn>` rather than `ListSearchActions` because this is a one-shot lookup, not a persistent list filter.

## Relationships

- **`src/modules/payments/store.ts`** — imports `usePaymentsStore`; the component's only store interaction is the single call `findOrderIdByReference`.
- **`src/modules/orders/views/OrdersList.vue`** — primary consumer: listens for the `found` emit and navigates to the order-edit route.
- **`src/modules/payments/index.ts`** — re-exports this component as part of the module's public surface.
- **`src/modules/payments/tests/order-reference-search.spec.ts`** — unit tests for the search, emit, and error paths.
- **`src/infrastructure/utils/logger.ts`** — reached indirectly: `reportSearchError` (from `useBlockingError`) forwards real failures to the logger / Faro.
- **`src/modules/payments/views/PaymentsList.vue`** — a potential host that can mount the component to look up an order by reference from within the payments context.

## Notes

- The component intentionally has **no route knowledge**. It names no path and performs no navigation; coupling it to a specific route would break the "any host can mount" contract.
- A *miss* (reference not found) and a *real failure* (network / 500) are both **blocking** — the search does not complete — but differ in tone and whether Faro is notified. Both are rendered inline, never as toasts (see `docs/theory/request-flow.md`).
- The `reference` ref is cleared only on a successful hit, not on a miss, so the user can retry or correct the input.
- `data-test` attributes are present on the card, input, button, and error alert for E2E stability.
