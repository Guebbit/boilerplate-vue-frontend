---
source: src/modules/returns/store.ts
sha256: c47e94ebc92b22ad1093b6a306983d17a1eabe7e686cbd4863043d16739e14ad
signature: 3e57a02ab727f638b77467952940e094cf259975bdc0229c48ae422a577cfd8c
generated_at: 2026-11-10T05:38:54.906141+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/store.ts

## Purpose
Pinia store for the returns module. It wires a paginated search and a by-id read through `useStructureCrudApi`, and provides hand-written actions for the lifecycle moves that are not plain record edits (open, approve, decline, receive, record proof, close, cancel). Components and views in the module consume this store exclusively for return state and transitions.

## Key elements

- **`useReturnsStore`** — the exported Pinia store (`defineStore('returns', …)`).
- **Toolkit bindings** — `returns` (record cache), `returnsList`, `currentReturn`, `filters`, pagination state, `fetchPaginationReturns`, `watchSearchReturns`, `fetchReturn`, `watchReturn`. Backed by `listReturns` / `getReturnById`.
- **`openReturn(request)`** — `POST /returns`; opens a return or withdraws from the contract (server may return an already-closed record and cancel the order). Uses an idempotency key per `orderId`. Caches the result via `addReturn`.
- **`fetchOrderReturns(orderId)`** — reads all returns for one order (up to 50). Cached individually; does not disturb the paginated list's filters.
- **`fetchReturnOptions(orderId)`** — server-computed counts and refund amounts for an order. Deliberately **not** cached.
- **`approve(returnId)`** / **`decline(returnId, reason, message?)`** — staff state transitions via `updateTarget`.
- **`receive(returnId, body?)`** — goods received; restocks and refunds. Idempotency key per return. Step-up (password) gated.
- **`recordProof(returnId, body)`** — records carrier proof; may trigger refund on a withdrawal. Step-up gated.
- **`close(returnId, note?)`** / **`cancel(returnId, note?)`** — terminal staff actions; no money or stock movement.
- **`ReturnsFilters`** — type: `Omit<ListReturnsParams, 'page' | 'pageSize'>` (search criteria excluding pagination).

## Relationships

- **`src/modules/returns/views/ReturnsList.vue`** — consumes `returnsList`, `filters`, pagination state, and `fetchPaginationReturns` / `watchSearchReturns` to render the searchable list.
- **`src/modules/returns/views/ReturnTarget.vue`** — reads `currentReturn` and `fetchReturn` / `watchReturn` for the detail view.
- **`src/modules/returns/components/ReturnRequestForm.vue`** — calls `openReturn` and `fetchReturnOptions`.
- **`src/modules/returns/components/ReturnStaffActions.vue`** — calls `approve`, `decline`, `receive`, `recordProof`, `close`, `cancel`.
- **`src/modules/returns/components/CancelRemainderDialog.vue`** — calls `cancel`.
- **`src/modules/returns/components/RecordWithdrawalDialog.vue`** — calls `openReturn` (withdrawal path).
- **`src/modules/returns/components/WithdrawalPanel.vue`** — reads `fetchOrderReturns` to display what became of a withdrawal.
- **`src/modules/returns/tests/store.spec.ts`** — unit-tests the store's actions and cache behavior directly.
- **`src/modules/returns/tests/cancel-remainder-dialog.spec.ts`**, **`src/modules/returns/tests/record-withdrawal-dialog.spec.ts`**, **`src/modules/returns/tests/return-request-form.spec.ts`**, **`src/modules/returns/tests/return-staff-actions.spec.ts`**, **`src/modules/returns/tests/withdrawal-panel.spec.ts`** — mock the store to test each component in isolation.

## Notes

- The available actions per return come from the server's `actions` field on the `Return` record. The store never derives which buttons should appear client-side (same convention as the `orders` module).
- `openReturn` is **not** a simple `addRecord`; it is a `POST` that can also cancel the order server-side, so it bypasses the toolkit's `create` slot.
- Idempotency keys are scoped per subject: one per `orderId` for `openReturn`, one per `returnId` for `receive`. A lost network response resends the same key; any resolved (or rejected) call mints a fresh one.
- `receive` and `recordProof` are step-up gated — the HTTP layer may prompt for a password before the promise resolves.
- `fetchReturnOptions` is intentionally uncached because the answer changes with every shipment.
