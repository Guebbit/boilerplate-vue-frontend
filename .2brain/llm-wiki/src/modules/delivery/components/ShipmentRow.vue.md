---
source: src/modules/delivery/components/ShipmentRow.vue
sha256: 0d35dcb9221740fb269fccbc8567cd981b1a43a9dcd55bb9c55bb759182c2ded
signature: b9da5993be9aefaffad372654aa1d86cd0c49273c60892a090742b811f88b3ac
generated_at: 2026-11-10T04:16:46.153211+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipmentRow.vue

## Purpose

Renders a single shipment (parcel) inside its parent fulfillment-order card: number, status chip, tracking code, line items, ship/deliver dates, and any lost-parcel details. It also exposes the staff action controls that the server's `actions` object allows — inline tracking-code correction, mark-delivered, and report-lost.

## Key elements

- **`props.shipment` / `props.orderAddress`** — The `Shipment` object and the order-level destination line (used to detect a redirected parcel).
- **`redirectedFrom` (computed)** — Shows the parcel's actual destination only when it differs from `orderAddress`; otherwise `undefined` and the line is hidden.
- **`trackingDraft` (ref)** — Local editable copy of `trackingCode`; the save button is enabled only when the trimmed value differs from the original.
- **`run(move, success)`** — Shared wrapper for all mutations: clears row error → calls the store action → toasts + emits `'moved'` on success, or calls `reportRowError` on failure.
- **`saveTracking` / `markDelivered`** — Thin handlers that call `deliveryStore.editTracking` / `deliveryStore.deliver` through `run`.
- **`offerDeliver` (computed)** — Reads `shipment.actions.deliver`; gates the mark-delivered button.
- **`lostOpen` (ref) + `ReportLostDialog`** — Opens the dialog for report-lost; the dialog's `@reported` event bubbles up as `'moved'`.
- **`rowError` / `reportRowError` / `clearRowError`** — Per-row blocked-state from `useBlockingError`; rendered via `<InlineErrorAlert>` so a failure stays visually next to the shipment.
- **`STATUS_COLOR`** — Maps `shipped`/`delivered`/`lost` to v-chip color tokens.
- **`emit('moved')`** — Informs the owning page (FulfillmentOrderCard) to re-fetch the order after any successful mutation.

## Relationships

- **`store.ts` (delivery store)** — Source of `editTracking`, `deliver`, and the shared `loading` flag that disables all buttons to prevent concurrent mutations.
- **`FulfillmentOrderCard.vue`** — Parent container; passes `shipment` and `orderAddress`, listens for the `'moved'` event to refresh.
- **`ReportLostDialog.vue`** — Child dialog opened by the report-lost button; communicates back via `v-model` (open state) and `@reported`.
- **`shipment-row.spec.ts`** — Unit-test suite for this component's rendering and interaction logic.
- **`logger.ts`** — Not directly imported here; no runtime interaction.

## Notes

- All action visibility is driven by `shipment.actions` (server-provided). The component never re-derives which buttons to show from status alone.
- The `loading` ref is **shared** across the entire delivery store, not per-shipment; while any mutation is in flight every button in every row is disabled.
- `trackingDraft` is initialized from the prop but is **not** reactively synced back — if the parent re-renders with a new `trackingCode` while the user is mid-edit, the draft is stale. Relies on the parent emitting a refresh via `'moved'` before the user can interact again.
- `data-test` attributes are present on every interactive/assertable element for end-to-end and component tests.
- The component is a `<li>` — it must be rendered inside an `<ul>` (as the parent card does).
