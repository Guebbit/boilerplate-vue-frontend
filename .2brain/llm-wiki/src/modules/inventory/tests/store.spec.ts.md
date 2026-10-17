---
source: src/modules/inventory/tests/store.spec.ts
sha256: fbec65fbda65633ddf40a1748adb6757bb6cb98c8c38ca25ae60be2cc2dc8b68
generated_at: 2026-10-17T01:01:55.722568+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/store.spec.ts

## Purpose

Unit spec for the inventory Pinia store that exercises every read and write action with a fully mocked HTTP transport. It pins down the store's contract: whole-list replacement on reads, the exact reload sequence after writes (ledger before board), idempotency-key lifecycle on stock writes, and pagination behaviour for preorder levels.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that looks up a canned response in the `responses` record keyed by `"METHOD /path"`, then parses it through `parseOrvalFixture` so schema validation still runs.
- **`responses`** (module-level `let`, reset in `beforeEach`) — the fixture table: GET endpoints for movements, levels, preorders; PUT for `preorder-limit`; POST for receipts, adjustments, and reservations/sweep.
- **`MOVEMENT` / `LEVEL`** — minimal fixture rows used across most tests.
- **`requestedUrls()`** — extracts the URL from every recorded `orvalMutator` call; used to assert call order.
- **`allowancePage(productId, pageNumber)`** — helper that builds a two-page preorder envelope for the pagination test.
- **`keyOfFirstCall()`** — pulls the `Idempotency-Key` header off the first recorded call's options.
- **Test suites** — `fetchMovements`, `fetchLevels`, `fetchPreorderLevels`, `setLimit`, `receive`, `sweep`, and a dedicated `Idempotency-Key on a stock write` suite (parameterised over receipt and adjustment).

## Relationships

- **`src/modules/inventory/store.ts`** — the unit under test; `useInventoryStore` is called in every test to obtain a fresh Pinia-backed instance.
- **`src/infrastructure/http/index.ts`** — mocked at module level via `vi.mock('@/infrastructure/http')`; the real `orvalMutator` is never exercised, but its export signature is preserved so the mock matches.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked once at the top of the spec (outside any `beforeEach`) to register the module graph so `@/infrastructure/http` and `@api/schemas` resolve.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (builds the standard `{ data, meta }` shape), `parseOrvalFixture` (validates a raw response against the Orval schema before returning it), and `contractRequest` (validates a request body against a typed schema and returns the parsed object for assertion).

## Notes

- The transport mock is **file-scoped**, not per-test. The preorder pagination test uses `mockImplementationOnce` twice to temporarily override it; the `mockClear`/`responses` reset in `beforeEach` restores the default table for subsequent tests.
- Reload order after writes is asserted as a **hard contract**: `setLimit` → `PUT …preorder-limit` then `GET /inventory/levels`; `receive` / `adjust` → `POST …` then `GET /inventory/movements` then `GET /inventory/levels`. The comments call this out explicitly ("the ledger explains the board").
- `fetchMovements` with no args re-sends the **previous** query params — a deliberate reload-after-write convention that the spec locks in with the `repeats the last query` test.
- The `totalPages` field in every envelope `meta` block is required by the Orval contract; the comment notes it was absent from the fixture until `parseOrvalFixture` enforcement caught it.
- The `sweep` suite adds its own `responses` entry inline (`POST /inventory/reservations/sweep`) because the `beforeEach` table does not include it by default.
