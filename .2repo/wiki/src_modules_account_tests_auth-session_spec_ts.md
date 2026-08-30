# src/modules/account/tests/auth-session.spec.ts

## Purpose

Unit tests for the auth store's session flows (`login`, `logout`, `logoutEverywhere`, `requestPasswordReset`, `confirmPasswordReset`). The file mocks **only** the transport layer (`orvalMutator`) so that every layer above it — the generated API client, the session store, the profile store, and the observability store — executes for real. This matters because `login` is a coordination action (store token → fetch profile) and would be meaningless to test against a fully mocked store.

## Key elements

- **`responses`** — a `Record<string, unknown>` rebuilt in `beforeEach`, keyed by `"METHOD /path"` (e.g. `"POST /account/login"`). Tests override a single entry rather than re-mocking the module.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a router that looks up `responses` by `${method} ${url}`. Unknown keys resolve to `undefined` (not a throw) because several actions ignore their response body.
- **`requestedUrls()`** — helper that extracts the ordered list of request URLs from `orvalMutator` call history; used to assert call ordering (e.g. token stored *before* profile fetch).
- **`describe('login')`** — five tests: token + profile ordering, `remember` checkbox mapping to `"medium"` tier, session `viewer` projection shape, admin flag propagation, and anonymous fallback when no token is returned.
- **`describe('logout')`** — two tests: single-session endpoint (`/account/logout`) clears guard state; profile cache is dropped.
- **`describe('the password reset flow')`** — two tests: `requestPasswordReset` hits `/account/reset`; `confirmPasswordReset` hits `/account/reset-confirm` with the token in the body.
- **`describe('logoutEverywhere')`** — one test: calls `/account/logout-all` and clears the session.
- **`USER`** — a constant representative user record used across assertions.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mocked module. The test imports `orvalMutator` from this path and replaces it with a URL-keyed router. No other symbol from that module is consumed. Because the real HTTP client and generated API calls run above this mock, the test implicitly exercises whatever `src/infrastructure/http/index.ts` wires up (orval config, interceptors) in its happy-path shape.

## Notes

- **Unknown endpoints resolve to `undefined`, not an error.** Several auth actions (e.g. `logout`, `logoutEverywhere`) discard their response body; the `responses` table therefore lists only endpoints whose *answer* matters, not every endpoint that gets called.
- **`remember` is a string tier, not a boolean.** Passing `true` maps to `"medium"` in the request body; omitting it sends `undefined`. The test asserts the wire shape explicitly.
- **`viewer` is a projection, not the raw `User`.** The test asserts that only `{ id, email, admin }` appear in `session.viewer` — a deliberate encapsulation boundary the test guards against regression.
- **`auth-signup.spec.ts`** covers the `signup` flow separately (referenced in the header comment); do not add signup cases here.
- **Pinia is re-instantiated in `beforeEach`** via `setActivePinia(createPinia())` to prevent store state leaking between tests.
