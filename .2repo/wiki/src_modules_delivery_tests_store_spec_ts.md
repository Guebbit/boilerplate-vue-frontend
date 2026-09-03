# src/modules/delivery/tests/store.spec.ts

## Purpose

Vitest spec for the delivery Pinia store. It mocks the HTTP layer (`orvalMutator`) and verifies that the store's public surface — method list, display pricing, shipment read, and advance action — behaves per the API contract, with special attention to the 404-as-"nothing shipped yet" convention and the free-above pricing rule.

## Key elements

- **`METHODS`** — Two fixture delivery methods: `standard` (price 5, `freeAbove` 100) and `express` (price 15, no threshold).
- **`responses`** — Module-level `Record<string, unknown>` holding mocked HTTP responses keyed `"METHOD /url"`; reset in `beforeEach`.
- **`rejectWith(status, message)`** — Builds the exact error envelope (`{ success, status, message, errors[] }`) that `onResponseReject` would produce, so the store's `status`-reading logic is exercised faithfully.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a lookup against `responses`; unknown keys → 404 reject, `Error` values → 500 reject, otherwise resolve.
- **`describe('fetchMethods')`** — Asserts the store's `methods` array mirrors the API payload order.
- **`describe('effectivePrice')`** — Verifies the free-above rule: at the threshold → 0, just below → base price, no threshold → never free.
- **`describe('fetchShipmentForOrder')`** — Two cases: (1) 200 → shipment stored; then 404 → `shipment` is `undefined` (resolves, not rejects). (2) 500 → promise rejects with `{ status: 500 }`; the store does *not* swallow it.
- **`describe('advance')`** — Asserts the resolved count of parcels advanced.

## Relationships

No graph neighbors are recorded for this file. It imports the store under test (`@/modules/delivery/store.ts`) and the mocked module (`@/infrastructure/http`), but the dependency graph lists no external neighbors to document.

## Notes

- The 404-vs-500 distinction is the single most important behavior under test: only a 404 is treated as "no shipment"; any other status must reject so the UI can show a real error rather than falsely reporting "nothing shipped yet."
- `rejectWith` intentionally rejects with a plain object (not an `Error`), matching the project's `onResponseReject` contract. An ESLint disable comment documents this.
- `responses` is mutated inside test bodies (e.g., set to `{}` mid-chain, or overwritten with an `Error` value) to simulate different server states without re-running `beforeEach`.
