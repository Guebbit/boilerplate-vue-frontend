---
source: src/modules/account/tests/oauth-links-store.spec.ts
sha256: 6ec58dd840f8938759e091725b892408a6b9cf4516e88b77ab7d9058c2f9d84d
generated_at: 2026-10-17T00:23:02.453353+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-links-store.spec.ts

## Purpose

Unit tests for the `useOAuthLinksStore` Pinia store. Verifies that fetching the connected-provider list populates the store correctly, that unlinking a provider issues a DELETE and then reloads the list, and that a payload missing the `links` array degrades to an empty list. Only the HTTP transport layer is mocked; the store logic under test runs for real.

## Key elements

- **`responses`** (module-level `Record<string, unknown>`) — URL-keyed response map consulted by the mocked transport. Reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a function that looks up `responses` by `"METHOD /path"` key and runs the raw body through `parseOrvalFixture` before resolving.
- **`requests()`** (helper) — Returns every transport call as an ordered `"METHOD url"` string array, used to assert request sequences.
- **`beforeEach`** — Resets Pinia, clears mocks, and re-seeds `responses` with a Google link (GET) and an empty DELETE envelope.
- **`describe('useOAuthLinksStore')`** — Three `it` blocks:
  - *fetchLinks keeps the providers and when each was connected* — asserts `store.links` matches the fixture.
  - *unlinkProvider deletes the one link and reloads the list it changed* — asserts the last three transport calls are GET → DELETE → GET.
  - *a payload without the list reads as no links* — uses `mockImplementationOnce` to return a `data: {}` envelope and asserts `store.links` is `[]`.

## Relationships

- **`src/modules/account/stores/oauth-links.ts`** — The module under test; provides `useOAuthLinksStore`.
- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`, mocked via `vi.mock` so no real HTTP occurs.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level (outside any hook) to register store/service bindings before tests run.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `orvalEnvelope` (build a response wrapper) and `parseOrvalFixture` (validate/normalize a raw body) used to shape mock responses.

## Notes

- `wireModulesIntoCore()` runs once at import time, not per-test; all `beforeEach` does is swap Pinia and reset mocks.
- The mock pattern (URL-keyed `responses` map + `parseOrvalFixture`) is explicitly documented as the same convention used by `sessions.spec.ts`.
- The third test overrides the URL-keyed lookup with `mockImplementationOnce`; after that one call the original mock resumes, so it only works because it's the sole request in that test.
- Request-order assertions rely on `vi.mocked(orvalMutator).mock.calls` order, which is only reliable because the tests run single-threaded within one `it` block.
