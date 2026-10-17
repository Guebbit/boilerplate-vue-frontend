---
source: src/modules/orders/tests/override-status.spec.ts
sha256: 78d4da493e40de196edfe4523878a0e0b3aff84ca0d431a2b826902e0503e2e2
generated_at: 2026-10-17T01:18:50.686680+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/override-status.spec.ts

## Purpose

Vitest spec for the `overrideStatus` store action. It mocks `orvalMutator` at the transport layer (same pattern as `cancel.spec.ts`) so assertions can inspect the raw request body and verify two things: that `to` and `reason` reach the body unchanged, and that the server's corrected record **replaces** the cached one rather than merging into it.

## Key elements

- **`overrideStatus` (describe block)** — two focused test cases:
  - *"sends the target status and reason in the body"* — asserts `sent[0].data` against the `OverrideOrderStatusBody` schema via `contractRequest`.
  - *"replaces the cached record with the corrected one"* — asserts `store.orders.o1?.status` equals the returned status after the call.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that records every request into `sent[]` and resolves with a canned response looked up from the `responses` map (`POST /orders/o1/status-override`).
- **`ORDER`** — a single fixture order built with `anOrder({ status: 'shipped' })`; used as the canned response payload.
- **`responses` / `sent`** — module-level lets reset in `beforeEach`; `responses` holds METHOD+URL-keyed bodies, `sent` accumulates all outgoing request configs for body assertions.
- **`wireModulesIntoCore()`** — called once at module top-level (not per-test) to register DI bindings before Pinia is activated.

## Relationships

- **`src/modules/orders/store.ts`** — the unit under test; imports `useOrdersStore` and exercises its `overrideStatus(id, to, reason)` action.
- **`tests/support/unit/fixtures.ts`** — supplies the `anOrder` factory used to build the `ORDER` fixture.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` bootstraps the DI container so the store can resolve its dependencies in a unit-test context.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wrap payload in the API envelope shape), `parseOrvalFixture` (unparse the mock response), and `contractRequest` (validate a captured body against an Orval-generated schema).

## Notes

- The endpoint is `POST /orders/:id/status-override` — a dedicated route that replaced the former `PUT /orders/:id` path for `shipped`/`delivered` corrections. The URL in the `responses` key must stay in sync with whatever the store issues.
- `wireModulesIntoCore()` runs once at import time; `beforeEach` only resets Pinia and the `sent`/`responses` arrays. Do not move the wiring call inside `beforeEach` or duplicate registrations will occur.
- The body assertion uses `contractRequest(schemas.OverrideOrderStatusBody, …)`, meaning the shape is validated against the generated API schema, not hand-written expected objects.
