---
source: src/modules/example/tests/store.spec.ts
sha256: 3c56be80ec027fa20e2bd11d4cf04336b4a25c098a5beca99368f53bec5b3a1c
generated_at: 2026-10-17T00:54:11.135102+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/store.spec.ts

## Purpose

Unit tests for the `useExampleStore` Pinia store. They mock `orvalMutator` (the HTTP transport) and assert on the raw request config the store's actions produce—URL, method, params, and body. Every canned response is validated through the real Orval contract schema (`parseOrvalFixture`), so a fixture that drifts from `openapi.yaml` fails here rather than in a downstream integration test.

## Key elements

- **`EXAMPLE`** — a single canned record (id, title, body, status, userId, etc.) used as the default API response.
- **`defaultAnswer`** (hoisted via `vi.hoisted`) — mutable holder for the default transport response; referenced inside the `vi.mock` factory. Returns a one-item envelope for non-DELETE, an empty envelope for DELETE.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a `vi.fn` that delegates to `defaultAnswer.current`.
- **`lastRequest()`** — returns the config object (url, method, data, params) of the most recent `orvalMutator` call.
- **`lastBody(schema: ZodType)`** — extracts `lastRequest().data` and validates it against the given Orval request schema via `contractRequest`.
- **`answerWithPage(items)`** — temporarily overrides the mock to return a paginated envelope (items + meta) for any subsequent call.
- **`describe('useExampleStore')`** — top-level suite. Sub-suites: `search`, `fetchExample`, `createExample`, `updateExample`, `deleteExample`, `setCover`, `fetchPublished`.
- **`beforeEach`** — creates a fresh Pinia, clears all mocks, and restores the mock implementation to `defaultAnswer.current` (since `answerWithPage` overwrites it permanently).

## Relationships

- **`src/modules/example/store.ts`** — the module under test; `useExampleStore` is imported and exercised in every `it`.
- **`src/infrastructure/http/index.ts`** — provides `orvalMutator`, which is the single HTTP seam mocked in this file.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register example-module bindings before any store action runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `parseOrvalFixture` (validates envelopes against method/url schemas), `orvalEnvelope` (wraps payloads), and `contractRequest` (validates request bodies against Zod schemas).

## Notes

- **Return, don't await.** Every `it` returns its `.then(…)` chain instead of using `async/await`. Vitest treats a rejected returned promise as a test failure, so assertions inside `.then` are equally binding. See `docs/tools/unit-testing.md`.
- **`vi.hoisted` is required** for `defaultAnswer` because `vi.mock` factories execute before the surrounding module scope is available.
- **`answerWithPage` is destructive** to the mock; `beforeEach` restores the default implementation to keep tests isolated.
- **`wireModulesIntoCore()` runs at import time** (module-level side effect), not inside a `beforeAll`. Omitting it causes store actions to fail with a missing-module error.
- **`setCover` tests** assert `FormData` as the request body type and verify the server's response replaces the cached record.
- **`fetchPublished`** is explicitly tested to *not* write into the signed-in `examples` cache, guarding against accidental coupling between public and authenticated read paths.
