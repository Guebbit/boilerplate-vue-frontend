---
source: src/modules/inventory/tests/store.spec.ts
sha256: 0ccfce7ced8645f6682b03511379c9a95d2315aa8c16a38d7831a3354ebcb887
signature: 19670cd3877588a0e0ef63d47fef8335ecd1660570fb1f377646f1c7a620a957
generated_at: 2026-11-10T04:36:47.174104+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/store.spec.ts

## Purpose

Unit spec for `useInventoryStore` (the inventory Pinia store). It verifies every read/write action against a fully mocked HTTP transport, asserting both the state the store exposes and the exact sequence of API calls (URLs, params, bodies, idempotency headers). The file pins the contract that writes reload *both* affected views before resolving, and that the reload order is movements-then-levels.

## Key elements

- **`MOVEMENT` / `LEVEL`** – Static fixture rows (one ledger row, one board row) used as canned transport responses.
- **`responses`** – A mutable `Record<string, unknown>` keyed by `` `${METHOD} ${path}` ``, reset in `beforeEach`. The transport stub reads from it.
- **Transport stub for `orvalMutator`** – A module-level mock that looks up `responses` and validates the result through `parseOrvalFixture` before resolving.
- **`requestedUrls()`** – Extracts the ordered list of `url` values from `orvalMutator` mock calls; used to assert write → reload sequences.
- **`allowancePage(productId, pageNumber)`** – Builds a single-page preorder-level fixture with `meta.totalPages: 2`, for the pagination test.
- **`keyOfFirstCall()`** – Pulls the `Idempotency-Key` header off the first mock call's second argument.
- **`describe` blocks** – `fetchMovements`, `fetchLevels`, `fetchPreorderLevels`, `setLimit`, `receive`, `adjust`, `sweep`, and an `Idempotency-Key` block. Each asserts state, request shape (via `contractRequest` + `@api/schemas`), and call order.
- **`wireModulesIntoCore()`** – Called once at module top level (outside `beforeEach`) to register module graph wiring before any test runs.

## Relationships

- **`src/modules/inventory/store.ts`** – The unit under test; `useInventoryStore` is imported and exercised in every test.
- **`src/infrastructure/http/index.ts`** – Provides `orvalMutator`, the sole export the spec stubs to control all HTTP responses and to capture outbound call arguments.
- **`tests/support/unit/orval-fixture-schema.ts`** – Supplies `parseOrvalFixture` (schema-validates canned responses) and `contractRequest` (validates outbound request bodies against `@api/schemas`).
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore`, called at module scope to make the Pinia + DI graph available to the store.

## Notes

- `totalPages` in `meta` is **required** by the real Orval contract alongside `totalItems`; omitting it makes `parseOrvalFixture` reject the fixture. The comment in `beforeEach` calls this out explicitly.
- Reload order after a write is **asserted, not assumed**: movements (ledger) must be requested before levels (board). Tests like `receive` and `sweep` verify the exact URL sequence `[…/receive, /inventory/movements, /inventory/levels]`.
- Idempotency-Key: a **fresh** key is expected after a successful write; the **same** key is expected when retrying after a retryable (network) failure. Both behaviors are tested.
- The transport stub is a module-level mock, not a per-test `vi.spyOn`; the `responses` object is the only mutable surface, reset in `beforeEach`.
- `wireModulesIntoCore()` runs once at import time, not per test. If it were moved into `beforeEach`, repeated calls could double-register DI bindings.
