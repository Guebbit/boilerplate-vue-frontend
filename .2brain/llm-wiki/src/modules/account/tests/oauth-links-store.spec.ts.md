---
source: src/modules/account/tests/oauth-links-store.spec.ts
sha256: 0a48040d610442be6b3c449083b0bc410ba9892199a6cf90b43d2b7cf916bb82
signature: 215a72d3ef0384cffa74422d549a986573531c27aadbc8b25e0dce9ef98c20ac
generated_at: 2026-11-10T03:35:47.251895+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-links-store.spec.ts

## Purpose

Unit tests for the OAuth linked-providers store (`useAccountOAuthLinksStore`) and the `startProviderLink` helper. Verifies that fetching lists providers with their connected-at timestamps, unlinking a provider issues a single DELETE without a follow-up reload, and starting a link flow returns the consent URL (or rejects when the server omits it). Only the HTTP transport is mocked; the store logic under test is exercised for real.

## Key elements

- **`responses`** — mutable `Record<string, unknown>` holding fixture payloads keyed by `"METHOD /path"`. Reset in `beforeEach`; the mock transport looks up this map on every call.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that formats the key, resolves via `parseOrvalFixture`, and returns the matching fixture. This is the sole external boundary mocked.
- **`requests()`** — helper that maps recorded `orvalMutator` calls into `"METHOD url"` strings in order, used to assert exact call sequences.
- **`describe('useAccountOAuthLinksStore')`** — covers `fetchLinks` (populates `store.links`) and `unlinkProvider` (issues one DELETE, keeps the response body, no second GET).
- **`describe('startProviderLink')`** — covers the happy path (POST returns `authorizeUrl`, params `continue`/`locale` are forwarded) and the error path (empty response → rejects with `'no consent URL'`).

## Relationships

- **`src/modules/account/stores/oauth-links.ts`** — the module under test; imports `useAccountOAuthLinksStore` and `startProviderLink`.
- **`src/infrastructure/http/index.ts`** — the HTTP transport module; fully mocked here so no real network calls occur.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture`, which validates/shapes raw fixture objects before they are returned as resolved responses.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, called once at module scope to establish the dependency-wiring context the store expects.

## Notes

- The mocking pattern (transport mocked by `METHOD url` key) is intentionally shared with `sessions.spec.ts` for consistency across account-module tests.
- `unlinkProvider` is tested to issue **exactly two** requests (GET then DELETE) and **no** follow-up GET; the store trusts the DELETE response body rather than refetching.
- `startProviderLink` maps its `continueTo` argument to a `continue` query param in the outgoing request — the field rename is easy to overlook when reading the assertion.
- The `beforeEach` resets both the Pinia instance *and* `responses`, so tests are fully isolated.
