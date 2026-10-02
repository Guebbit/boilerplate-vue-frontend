---
source: src/modules/orders/tests/override-status.spec.ts
sha256: 7a017163ca53d9d61e479e181fe91e8ea78e4050dfd9a8dc2a6c03e66e09a7b6
generated_at: 2026-10-02T15:23:27.169459+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/override-status.spec.ts

## Purpose

Vitest spec that verifies the `overrideStatus` store action (the operator's manual correction endpoint, `POST /orders/:id/status-override`) sends the correct request body and replaces the cached order record. It mocks `orvalMutator` at the transport level so assertions can inspect the raw body rather than relying on side-effects.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that records every request into `sent[]` and resolves the response from the `responses` map keyed by `"METHOD url"`.
- **`responses`** — canned response bodies; in `beforeEach` it is seeded with `'POST /orders/o1/status-override' → orvalEnvelope(ORDER)`.
- **`sent`** — array of `{ url, method, data? }` capturing every outgoing request for body-level assertions.
- **`ORDER`** — fixture order built via `anOrder({ status: 'shipped' })`, representing the corrected record the mock returns.
- **`describe('overrideStatus')`** — two tests:
  - *sends the target status and reason in the body* — asserts `sent[0].data` matches the `schemas.OverrideOrderStatusBody` contract with `to` and `reason` unchanged.
  - *replaces the cached record with the corrected one* — asserts `store.orders.o1.status` equals `'shipped'` after the action resolves.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — calls `wireModulesIntoCore()` at module top-level so the orders store's internal module wiring is available without a full app boot.
- **`tests/support/unit/fixtures.ts`** — imports the `anOrder` factory to build the fixture order with a specific status.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — imports `orvalEnvelope` (wrap a payload in the expected Orval response shape), `parseOrvalFixture` (unwrap/match a raw response for the mutator stub), and `contractRequest` (validate a captured body against an API schema).

## Notes

- The spec follows the same transport-mock pattern as `cancel.spec.ts`; the differentiator is that it pins **body contents** (`to`, `reason`) rather than just the URL.
- The endpoint is a dedicated `POST …/status-override` route, not the former `PUT /orders/:id` patch — this file tests the new correction path.
- `beforeEach` resets `sent`, `responses`, and Pinia state; `vi.clearAllMocks()` is called after Pinia reset to avoid ordering surprises with the `orvalMutator` mock.
