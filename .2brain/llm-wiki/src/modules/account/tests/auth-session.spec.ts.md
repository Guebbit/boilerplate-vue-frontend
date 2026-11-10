---
source: src/modules/account/tests/auth-session.spec.ts
sha256: be412a86a5d4a3f45f05b7c0d9d05bdb3c54ef9d90a236c70905ba170a753bf6
signature: ba3470457805688bb255cdbe4d44be87283638dbc4afcca51901e065e79fafb8
generated_at: 2026-11-10T03:30:46.022036+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-session.spec.ts

## Purpose

Unit tests for the auth store's session flows — login, logout, logoutEverywhere, and password-reset request. The file mocks **only** the HTTP transport (`orvalMutator`) and lets every layer above it (generated client, session/profile/observability stores) execute for real, so assertions hit the same state the router guards read. `signup` is excluded and lives in `auth-signup.spec.ts`.

## Key elements

- **`USER`** — a representative user record (`id: 'u1'`, role `customer`) reused across login/session assertions.
- **`responses: Record<string, unknown>`** — per-endpoint answer table keyed by `"METHOD /path"`. Rebuilt in `beforeEach`; a test overrides one entry rather than re-mocking the module.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that looks up `responses` by URL. Unknown endpoints resolve to `undefined` (several actions ignore their body).
- **`requestedUrls()`** — helper returning the ordered list of URLs handed to the transport, used to assert call counts and sequencing.
- **`beforeEach`** — creates a fresh Pinia, calls `resetConfig()`, clears all mocks, and seeds the default `responses` table (login, GET /account, password reset, logout, DELETE sessions).
- **`describe('login')`** — tests: token storage, cookie-mode sign-in, boot-time mode loading, `remember` → `long` tier mapping, viewer projection shape, published ability rules, rules cleared on session end, fallback `GET /account` when the login body lacks an account view, and anonymous session when the response carries no token.
- **`describe('logout')`** — tests: single-session logout clears token/viewer/isAuth while other devices persist; fallback to guest answer (content truncated in source).

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/infrastructure/http/index.ts` | The sole mock target. `orvalMutator` is replaced; no other export from this module is exercised directly. |
| `src/modules/account/stores/auth.ts` | Primary subject under test via `useAccountAuthStore()`. |
| `src/modules/account/stores/profile.ts` | Imported (`useAccountProfileStore`); the store runs for real and its state is indirectly asserted through the session store. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is called at module scope to register Pinia plugin wiring before any test runs. |
| `tests/support/unit/orval-fixture-schema.ts` | `parseOrvalFixture` validates and shapes mock responses against the orval-generated contract; `contractRequest` is imported for request-body assertions. |
| `tests/support/unit/account-view.ts` | `accountView(user, rules?)` builds the account-view fixture shape expected by the stores. |
| `tests/support/unit/config-answer.ts` | `configAnswer({ session: { mode, lifetimeSeconds } })` builds a `GET /config` response for the boot-mode test. |

## Notes

- **One mock, everything real.** The design intent is explicit: asserting against the real session store is equivalent to asserting what the router guards read, so no store-level mocks are introduced.
- **Unknown endpoints resolve to `undefined`, not throw.** Several auth actions discard their response body; the `responses` table therefore lists only endpoints whose *answer* matters, not every URL that gets called.
- **Cookie mode vs. JWT mode.** Cookie-mode tests set `useSessionStore().mode = 'cookie'` and assert that no `accessToken` is stored — sign-in is indicated solely by a loaded viewer. The frontend never writes an `isAuth` cookie itself.
- **Ability rules are concrete keys, not wildcards.** The admin-rules test publishes explicit `[action, resource]` pairs; a fixture containing a `manage` rule would test a shape the server cannot send.
- **`vi.mockImplementationOnce`** is used in one login test (the "no token" case) to bypass the keyed `responses` table entirely, because the malformed body would be rejected by `parseOrvalFixture`'s contract validation.
- The file calls `resetConfig()` from `@/infrastructure/config.ts` in `beforeEach` to prevent config state leaking between tests.
