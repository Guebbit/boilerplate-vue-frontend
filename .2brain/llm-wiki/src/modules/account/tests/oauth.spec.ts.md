---
source: src/modules/account/tests/oauth.spec.ts
sha256: f36810ba8ef6648e590f7f0bc7948a0f241d6cb951b645a2318f58ddc36ae459
signature: f36810ba8ef6648e590f7f0bc7948a0f241d6cb951b645a2318f58ddc36ae459
generated_at: 2026-11-10T03:36:11.014086+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth.spec.ts

## Purpose

Unit tests for the OAuth provider store (`useAccountOAuthProvidersStore`) and its two pure helpers (`oauthStartUrl`, `providerLabel`). The transport layer (`orvalMutator`) is fully mocked, with canned responses keyed by `METHOD URL` — the same pattern used in `sessions.spec.ts`. No real network calls are made.

## Key elements

- **`providerLabel` describe block** — Verifies that well-known providers get a display-name override (e.g. `github` → `GitHub`) and that unknown providers fall back to simple capitalization.
- **`oauthStartUrl` describe block** — Verifies URL construction: base-URL prefix, `/account/oauth/<provider>` path, optional `?continue=` query (encoded), optional `?locale=` query, and the ordering of both params when present.
- **`useAccountOAuthProvidersStore` describe block** — Verifies that `fetchProviders` populates the store, that a second call is a no-op (single HTTP request), and that a rejected request resolves to `[]` without caching the failure (a subsequent call re-fetches).
- **`orvalMutator` mock** — Intercepts all HTTP calls; looks up `responses` by `` `${method} ${url}` `` and either rejects (if the stored value is an `Error`) or resolves through `parseOrvalFixture`.
- **`beforeEach` setup** — Resets Pinia, config, mocks, and seeds `responses` with a `GET /config` answer listing `['google', 'github']`.

## Relationships

- **`src/modules/account/stores/oauth-providers.ts`** — The module under test. Provides `useAccountOAuthProvidersStore`, `oauthStartUrl`, and `providerLabel`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level to bootstrap the DI/module graph before any test runs.
- **`tests/support/unit/config-answer.ts`** — `configAnswer()` builds the fixture payload for the `GET /config` endpoint, including the `oauthProviders` array.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture()` normalizes/validates the raw response object before it is returned from the mock, ensuring the store receives a shape consistent with the real Orval client.

## Notes

- `instance.defaults.baseURL` is pinned to the literal string `'https://api.example.test'` rather than reading `VITE_API_URL`, because a CI runner may have no `.env` file. It is restored in `afterEach` to avoid leaking the pinned value into other suites.
- A failed `fetchProviders` deliberately does **not** cache the empty list; the test asserts a second call re-issues the HTTP request (i.e. the store treats failure as "not yet loaded," not as a permanent empty state).
- `wireModulesIntoCore()` is invoked at the top of the module (outside any `beforeEach`), so it executes exactly once when the file is imported by Vitest.
