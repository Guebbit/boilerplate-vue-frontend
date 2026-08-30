# src/modules/inventory/tests/store.spec.ts

## Purpose
Vitest spec for `useInventoryStore`. It mocks the HTTP transport at the `orvalMutator` seam so every test exercises the store's read/write logic—query assembly, response shaping, and the post-write reload sequence—without touching the network.

## Key elements
- **`MOVEMENT` / `LEVEL`** – Single-row fixtures representing a stock-movement (ledger) row and a stock-level (board) row, shaped to match what the API is expected to return.
- **`responses`** – Canned-response map keyed by `` `${METHOD} ${path}` ``; reset in `beforeEach` so each test gets a clean transport.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a stub that resolves from `responses` based on the request's `method` and `url`.
- **`requestedUrls()`** – Extracts the ordered list of URLs the mock was called with; used to assert the exact reload sequence after a write.
- **`beforeEach`** – Activates a fresh Pinia instance, clears mocks, and seeds `responses` with default canned data for all four endpoints.
- **`describe('fetchMovements')`** – Verifies whole-list replacement, `productId` query passthrough, `totalItems` sourced from `meta` (not array length), and that a no-arg call after a filtered call repeats the last query (the reload-after-write path).
- **`describe('fetchLevels')`** – Confirms the board is replaced wholesale with the API's items array.
- **`describe('receive')`** – Asserts the receipt body (`productId`, `quantity`, optional `note`), the returned level, and the exact URL order: receipts → movements → levels.
- **`describe('sweep')`** – Asserts the expired-reservation count is surfaced and the same movements-before-levels reload order holds.
- **`describe('adjust')`** – Asserts the signed `delta` is sent in the body and the reload sequence mirrors `receive`.

## Relationships
- **`src/infrastructure/http/index.ts`** – Exports `orvalMutator`, the single HTTP transport the store calls. This spec replaces it with a `vi.fn` stub, so no real request leaves the process. The store under test (`@/modules/inventory/store.ts`) is the only other module touched; it is exercised directly, not mocked.

## Notes
- **Reload order is a contract, not an implementation detail.** Every write test asserts `movements` is fetched before `levels` (ledger explains board). Reordering the store's post-write calls without updating these assertions will break the spec—intentionally.
- **Whole-list replacement.** Neither `fetchMovements` nor `fetchLevels` appends or merges; the store discards prior state and assigns the API's items array. Tests pin this by comparing the full array, not a subset.
- **Query repetition on reload.** `fetchMovements()` with no arguments reuses the *last* parameter object it was called with. This is the mechanism by which a post-write reload preserves the user's filter; the "repeats the last query" test exists specifically to guard it.
- **`totalItems` ≠ `items.length`.** The spec explicitly asserts the store reads `meta.totalItems` (41 in the pagination test) rather than the length of the returned page (1 row).
