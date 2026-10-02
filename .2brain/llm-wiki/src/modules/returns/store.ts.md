---
source: src/modules/returns/store.ts
sha256: a59b2afbc4c32ccbe5c16428b3a0c3fafd3ae235ab96fdb42c12ac7c5da8f00c
generated_at: 2026-10-02T15:44:35.154121+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/store.ts

## Purpose

Pinia store for the returns module. It wires the module's paginated search and by-id reads onto the shared `useStructureCrudApi` primitive, and hand-writes the four lifecycle moves (`openReturn`, `approve`, `decline`, `receive`) that are endpoint calls rather than record edits. It exists so every return-related UI component talks to one reactive state with consistent caching and idempotency behavior.

## Key elements

- **`OpenReturnOutcome`** — Exported discriminated union (`{ kind: 'return'; created } | { kind: 'cancelled'; order }`) describing the two possible server responses to `POST /returns`.
- **`useReturnsStore`** — The store (`'returns'`). Exposes:
  - CRUD primitives from `useStructureCrudApi`: `returns` (record dictionary), `returnsList`, `currentReturn`, `filters`, `loading`, pagination state, `fetchPaginationReturns`, `watchSearchReturns`, `fetchReturn`, `watchReturn`.
  - **`openReturn(request)`** — Calls `createReturn` with an idempotency key. On 201 caches the new `Return`; on 200 returns the cancelled `Order`.
  - **`fetchOrderReturns(orderId)`** — Reads all returns for one order (capped at 50) via `fetchAny`, caches each into the record dictionary.
  - **`approve(returnId)`** / **`decline(returnId, reason)`** / **`receive(returnId, body?)`** — Staff moves routed through `updateTarget` so the cached record is replaced atomically. `receive` additionally carries an idempotency key and is step-up-gated at the HTTP layer.
- **`ReturnsFilters`** — `Omit<ListReturnsParams, 'page' | 'pageSize'>`; the non-pagination portion of the search params owned by the store's `filters` ref.

## Relationships

- **`ReturnRequestForm.vue`** — Submits a new return or withdrawal by calling `openReturn` and branching on the `OpenReturnOutcome` it resolves with.
- **`ReturnStaffActions.vue`** — Renders the staff action buttons (approve / decline / receive) and calls the corresponding store actions. Which buttons appear is driven by the server-provided `actions` array on the `Return` record, not by local logic.
- **`WithdrawalPanel.vue`** — Displays what happened to a withdrawal on the order page; reads `fetchOrderReturns(orderId)` and/or inspects `currentReturn`.

## Notes

- `openReturn` is deliberately **not** a standard `create` in the CRUD API: it can cancel an order (200) or create a return (201). The store handles both paths and only caches the `Return` case.
- Idempotency keys (`openIdempotencyKey`, `receiveIdempotencyKey`) are settled in both `.then` and `.catch` so a 5xx retry reuses the same key while a success mints a fresh one for the next call.
- `fetchOrderReturns` uses `fetchAny` (not the paginated `fetchPage`) and adds results to the record dictionary individually, keeping the list page's own filters and pagination state undisturbed.
- The store omits `create`/`update`/`remove` from the `useStructureCrudApi` generics (typed as `never`); all writes go through the hand-written actions above.
- Available actions per return are sourced from the server's `actions` field; this store never derives which buttons to show.
