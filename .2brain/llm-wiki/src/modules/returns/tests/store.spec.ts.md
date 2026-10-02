---
source: src/modules/returns/tests/store.spec.ts
sha256: d0187923d5e22ee858f97d01e37e9f1d1eb0213b86c660e7cef857ca0f3f822c
generated_at: 2026-10-02T15:46:16.559201+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/store.spec.ts

## Purpose

Unit tests for the returns Pinia store (`useReturnsStore`) run against a mocked `orvalMutator` transport. They verify what each store action sends (body, headers, params), which outcome it reports to the caller, and that a server response **replaces** the cached record. Request bodies are additionally validated against the API contract's own schemas (`contractRequest`) so drift surfaces here instead of as a 422 in production.

## Key elements

- **`responses`** – Record keyed by `"METHOD /path"` holding the canned body the mock should return for each call.
- **`sent`** – Array capturing every request the store issued (url, method, data, params, headers) for later assertion.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that records the request into `sent` and resolves with `parseOrvalFixture(method, url, responses[key])`.
- **`describe('openReturn')`** – Covers 201 (new return cached), 200 (order already cancelled, nothing cached), and the `Idempotency-Key` header.
- **`describe('the staff moves')`** – Covers `approve`, `decline` (sends reason), and `receive` (sends `handlingDeduction` + `Idempotency-Key`); asserts the cached record is replaced with the server's answer.
- **`describe('fetchOrderReturns')`** – Verifies the `orderId` query param is sent and the returned items are cached under their IDs.

## Relationships

- **`tests/support/unit/fixtures.ts`** – Supplies `aReturn` and `anOrder` factory helpers used to build realistic fixture bodies.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the returns module in the core before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a body + status into the orval response shape), `parseOrvalFixture` (the mock's response parser), and `contractRequest` (validates a sent body against an imported API schema and returns the normalized object for `toEqual` assertions).

## Notes

- The mock key is the **uppercased** method plus a space plus the URL path (e.g. `"POST /returns/r1/approve"`). A typo in the key silently yields `undefined` rather than a clear error.
- `sent` is reset in `beforeEach`, so all assertions use `sent[0]` (the single request in each test). Adding a second call in a test would silently shift indices.
- `contractRequest` does **not** throw on schema mismatch in the usual vitest sense; it returns the parsed/normalized body so the subsequent `toEqual` comparison is the actual assertion. If the schema rejects the shape, expect a less intuitive failure at the `toEqual` line.
- The `Idempotency-Key` checks assert presence only (`expect.any(String)`); they do not pin a specific value or format.
