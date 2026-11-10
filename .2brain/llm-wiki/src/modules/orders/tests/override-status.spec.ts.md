---
source: src/modules/orders/tests/override-status.spec.ts
sha256: e3c8d15059a5800545c478bc7d9da2d199446c5de6b9e0672358c64eaf31f33e
signature: 1b9d80c38e704149c3250b77be04af5d6089dbfcfdf7ad71cd1973ebfa3ff3a3
generated_at: 2026-11-10T05:04:03.640678+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/override-status.spec.ts

## Purpose

Vitest spec for the `overrideStatus` store action (the operator's manual correction path for `shipped`/`delivered` orders). It mocks `orvalMutator` at the transport layer so assertions can inspect the **raw request body** and verify that the corrected record replaces the cached one in Pinia.

## Key elements

- **`ORDER`** – Fixture order built via `anOrder({ status: 'shipped' })`; serves as the canned endpoint response.
- **`sent`** – Accumulated array of every intercepted request (`{ url, method, data }`), enabling body-level assertions rather than URL-only checks.
- **`responses`** – Map of `"METHOD url"` → parsed body, consumed by the `orvalMutator` mock to return realistic payloads.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a spy that records each call into `sent` and resolves with `parseOrvalFixture(...)`.
- **`describe('overrideStatus')`** – Two cases:
  - *sends the target status and reason in the body* – asserts `sent[0].data` conforms to the override-status body schema with `to` and `reason` intact.
  - *replaces the cached record with the corrected one* – asserts `store.orders.o1.status` reflects the response.

## Relationships

- **`src/modules/orders/store.ts`** – Source of `useOrdersStore`; the `overrideStatus` action under test.
- **`tests/support/unit/fixtures.ts`** – Provides `anOrder`, used to construct the `ORDER` fixture.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `parseOrvalFixture` (mock response resolution) and `contractRequest` (schema-conformance assertion on the captured request body).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` called once at module top to register API modules before tests run.

## Notes

- Follows the same transport-mocking pattern as `cancel.spec.ts` (explicitly referenced in the file header).
- `sent` and `responses` are reinitialised in `beforeEach` to prevent cross-test leakage.
- The mock resolves via `parseOrvalFixture(config.method, config.url, responses[key])`, so the third argument is the raw body looked up by the `"METHOD url"` key — not the full HTTP response object.
- Schema validation uses `contractRequest(schemas.OverrideOrderStatusBody, …)`, tying the wire contract to the shared `@api/schemas` package rather than a local type.
