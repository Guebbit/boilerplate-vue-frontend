---
source: src/modules/returns/store.ts
sha256: 53e3d441f4d2193126e4f82c419d1eed2af315034429a957a99b96d22875b880
generated_at: 2026-10-17T01:38:00.873814+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/store.ts

## Purpose

Pinia store for the returns module. It wires `useStructureCrudApi` (paginated search + by-id read) and adds hand-written actions for the four "move" endpoints that are state transitions rather than plain record edits: open (which doubles as withdrawal), approve, decline, and receive.

## Key elements

- **`useReturnsStore`** — the exported store (`defineStore('returns', …)`).
- **`ReturnsFilters`** — type alias for the non-pagination search params (`orderId`, `status`, `reason`).
- **`returns` / `returnsList` / `currentReturn`** — record cache, list state, and selected record from the toolkit.
- **`filters` / `loading` / `pageCurrent` / `pageSize` / `pageTotal` / `pageItemList`** — search & pagination state.
- **`fetchPaginationReturns` / `watchSearchReturns`** — list-page fetch / reactive re-fetch.
- **`fetchReturn` / `watchReturn`** — single-record fetch / reactive re-fetch by id.
- **`openReturn(request)`** — `POST /returns` (create a return *or* withdraw from a contract). Uses a dedicated idempotency key so a retried request never opens two returns.
- **`fetchOrderReturns(orderId)`** — reads all returns for one order (up to 50). Adds results to the cache via `addReturn` but does not touch the paginated list state.
- **`fetchReturnOptions(orderId)`** — server-computed counts / refund amounts for what an order can still return. Intentionally **not** cached.
- **`approve(returnId)`** — staff accepts a requested return; cached record is replaced.
- **`decline(returnId, reason)`** — staff refuses; the `reason` string is what the customer is mailed.
- **`receive(returnId, body?)`** — records goods arrival, restocks, and triggers the refund. Step-up (password) gated at the HTTP layer. Uses a second idempotency key so a double-fire never pays out twice.

## Relationships

- **`useStructureCrudApi`** (`@guebbit/vue-toolkit`) — provides the list/search, record cache, pagination, and `updateTarget` / `fetchAny` primitives that the store wraps.
- **`@api`** (`createReturn`, `approveReturn`, `declineReturn`, `receiveReturn`, `listReturns`, `getReturnById`, `getReturnOptions`) — the HTTP call layer invoked by every action.
- **`useIdempotencyKey`** (`@/infrastructure/http/idempotency.ts`) — mints and settles the idempotency keys for `openReturn` and `receive`.
- **`queryClient`** (`@/infrastructure/query-client.ts`) — TanStack Query client passed to the toolkit for cache management.
- **`ReturnRequestForm.vue` / `WithdrawalPanel.vue` / `CancelRemainderDialog.vue`** — consume `openReturn`, `fetchReturnOptions`, `fetchOrderReturns`, and the record cache to let a customer initiate or cancel a return.
- **`ReturnStaffActions.vue`** — consumes `approve`, `decline`, and `receive` for the staff workflow.
- **`Return.vue` / `ReturnsList.vue`** — page-level views that read `currentReturn` / `returnsList` and the pagination state.
- **`store.spec.ts`** — unit tests for the store's actions and state wiring.

## Notes

- **One endpoint, two meanings.** `openReturn` is both "open a return" and "withdraw from the contract." The server decides which it was (a pre-dispatch withdrawal comes back already `closed` and also cancels the order). The `orderId` on the response is where to re-read the order.
- **No toolkit `create`/`update`/`remove`.** The CRUD primitive is configured with `never` for create and remove; all mutations go through the hand-written actions and `updateTarget`.
- **Server owns "which button is available."** The set of allowed moves is read from the `actions` array on each `Return` record — never derived client-side.
- **`fetchReturnOptions` bypasses the cache** on purpose; the answer shifts with every shipment, so a stale read would mislead the customer.
- **Idempotency key lifecycle.** Each key is minted with `.withKey()`, then `.settle()` is called in `.then()` on success *and* `.settle(error)` in `.catch()` on failure, ensuring a new key is available for the next attempt.
