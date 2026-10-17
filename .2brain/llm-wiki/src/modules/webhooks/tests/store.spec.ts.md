---
source: src/modules/webhooks/tests/store.spec.ts
sha256: beca11d0d22619cab834c7469b49174b37b9f34597290eec953c802ab5502d80
generated_at: 2026-10-17T01:52:05.609826+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/store.spec.ts

## Purpose

Unit tests for the webhooks Pinia store (`useWebhooksStore`). The HTTP transport (`orvalMutator`) is fully mocked at the module boundary, so every assertion inspects the raw request the store's actions emit and/or the shape of the cached state they write. The file also contains the project's only tests that verify plaintext secrets (`secret`, `newSecret`) are returned to the caller but never persisted in store state.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a stub that resolves `parseOrvalFixture` envelopes. A bare `DELETE` (subscription) returns an empty envelope; all other calls (including secret-removal `DELETE`) return the full `SUBSCRIPTION` record.
- **`SUBSCRIPTION`** — a fixed fixture object shaped like the API's subscription resource; used as the default mock payload.
- **`lastRequest()`** — returns the config object (`url`, `method`, `data`, `params`) from the most recent `orvalMutator` call.
- **`lastBody(schema)`** — extracts and validates the JSON body of the last call against a Zod schema via `contractRequest`.
- **`lastParameters()`** — extracts the `params` field of the last call, cast through `asStub`.
- **`respondWithItems(items)`** — re-points the mock to return a paginated envelope wrapping the given items (used for list/backfill scenarios).
- **`respondOnceWith(data)`** — makes the next single mock call return `data` verbatim inside an `orvalEnvelope`; necessary for secret-bearing responses that the schema-based fixture helper cannot express.
- **`flush()`** — chains `flushPromises()` then `nextTick()`; needed because `watchSubscription` fires its backfill with `void`, leaving no awaitable promise for the test to chain on.
- **`describe` blocks** — one per store action: `createSubscription`, `rotateSecret`, `removeSecret`, `updateSubscription`, `deleteSubscription`, `replayDelivery`, `watchSubscription`. Each asserts URL, method, body, and (where relevant) post-call cache state.

## Relationships

- **`src/modules/webhooks/store.ts`** — the unit under test; `useWebhooksStore` is the only import from here.
- **`src/infrastructure/http/index.ts`** — mocked via `vi.mock`; `orvalMutator` is the sole symbol consumed, so the real HTTP client and its dependencies never load.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the webhooks module with the shared core before any test runs.
- **`tests/support/stub.ts`** — provides `asStub`, a type-narrowing helper used by `lastParameters`.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractRequest`, `orvalEnvelope`, and `parseOrvalFixture`, the shared helpers for building and validating orval-shaped HTTP fixtures.

## Notes

- Tests **return** their promise chain instead of `await`-ing; vitest treats a rejected returned promise as a failure, so assertions inside `.then` are equally binding. This is a project-wide convention (see `docs/tools/unit-testing.md`).
- `respondOnceWith` exists specifically because the secret fields (`secret`, `newSecret`) appear only on create/rotate response schemas and are not part of the single-record fixture schema that `orvalEnvelope` validates against; the verbatim path bypasses that limitation.
- The `watchSubscription` tests use the `flush` helper rather than `await`ing a store call, because the backfill is fire-and-forget (`void`). A bare `nextTick` is insufficient—the cache write lands several microtask turns after the request resolves.
- `beforeEach` calls `vi.clearAllMocks()` so `mock.calls.at(-1)` always refers to the current test's call.
