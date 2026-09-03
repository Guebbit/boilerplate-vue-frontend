# src/modules/account/tests/oauth.spec.ts

## Purpose

Unit tests for the OAuth provider store (`useOAuthProvidersStore`) and its two pure helpers (`providerLabel`, `oauthStartUrl`). Only the HTTP transport is mocked; everything else runs against the real Pinia store, mirroring the pattern established in `sessions.spec.ts`.

## Key elements

- **`responses`** – module-level `Record<string, unknown>` mapping `"METHOD /path"` keys to canned payloads (or an `Error` to simulate failure). Reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a fn that looks up `responses` by the incoming request's method+URL, resolving or rejecting accordingly.
- **`providerLabel` suite** – verifies display-name overrides (e.g. `github` → `GitHub`) and the fallback capitalization path.
- **`oauthStartUrl` suite** – asserts the URL is built from `import.meta.env.VITE_API_URL` + `/account/oauth/<provider>`.
- **`useOAuthProvidersStore` suite** – covers:
  - successful fetch populating the store's `providers` array,
  - second call short-circuits (no extra HTTP call),
  - a `data: undefined` payload yields `[]`,
  - a rejected request resolves to `[]` **and** the store remains retryable (next call hits the network again).

## Relationships

No graph neighbors are tracked for this file. It imports from `@/modules/account/stores/oauth.ts` (system under test) and `@/infrastructure/http` (mocked transport); both are the only external code under exercise.

## Notes

- The mock keys responses by `METHOD URL` (e.g. `'GET /account/oauth/providers'`), so adding a new endpoint test just means adding a key to `responses` in `beforeEach`.
- The "retryable after failure" test intentionally overwrites `responses` mid-assertion to simulate recovery; `orvalMutator` is expected to be called **twice** total, confirming the store did not cache the failure.
- Store instances are fresh per test via `setActivePinia(createPinia())` in `beforeEach`; do not rely on state leaking between `it` blocks.
