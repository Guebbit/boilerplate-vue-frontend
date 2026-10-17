---
source: src/modules/account/tests/auth-session.spec.ts
sha256: 92e2ec133ebf3279adcd8a211a3744f14f5fe35fe4d58b93bbc0be5064345d18
generated_at: 2026-10-17T00:21:03.242841+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-session.spec.ts

## Purpose

Unit tests for the auth store's session flows (login, logout, logoutEverywhere, password-reset request). The file mocks only the HTTP transport (`orvalMutator`) and keys canned responses by `METHOD /path`, so every layer above it — the generated API client, session/profile/observability stores — runs for real. This lets the tests assert against the same session state that router guards actually read, rather than against a mock of the store itself. `signup` is covered separately in `auth-signup.spec.ts`.

## Key elements

- **`responses` table** — a `Record<string, unknown>` rebuilt in `beforeEach`, keyed by `` `${METHOD} ${path}` ``. The single place where the default answer per endpoint lives; individual tests overwrite one entry rather than re-mocking the module.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a spy that looks up `responses[key]` and pipes the result through `parseOrvalFixture`. Unknown endpoints resolve to `undefined` (not a throw) so actions that ignore their body don't force the table to enumerate every call.
- **`requestedUrls()`** — helper that extracts the ordered list of URLs handed to the transport from the mock's call history; used to assert call order (e.g. login → profile → abilities).
- **`USER`** — representative user record reused across login/session assertions.
- **`login` describe block** — covers: JWT token storage and profile load order; cookie-mode login (no token, `isAuth` cookie); fresh-tab boot in cookie mode; `remember` checkbox → `'medium'` tier mapping; viewer projection (only `id`, `email`, `role`, `verified`); CASL ability rules for admin vs. customer; session clearing drops rules; anonymous fallback when response has no token.
- **`logout` describe block** — asserts the single-session endpoint is called, session state is cleared, Umami identity is reset, and the guest fallback is used.

## Relationships

- **`src/modules/account/stores/auth.ts`** — the primary subject under test; `useAuthStore().login / logout / logoutEverywhere` are the actions exercised.
- **`src/modules/account/stores/profile.ts`** — imported as `useProfileStore`; exercised indirectly when login populates profile data.
- **`src/infrastructure/http/index.ts`** — the module that is `vi.mock`-ed; its `orvalMutator` export is the sole transport seam.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope before any test runs, wiring the Pinia/observability modules into the app core so the real stores are reachable.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the API response shape), `parseOrvalFixture` (validates and unwraps the keyed response), and `contractRequest` (used to assert request bodies against the OpenAPI schema).

## Notes

- The mock's unknown-endpoint fallback (resolving `undefined`) is deliberate: it keeps the `responses` table a list of *meaningful* answers rather than a call log.
- `login` is described as **coordination**, not computation — the test asserts against the real session store because the router guards read from it, not from the auth store directly.
- The `remember` checkbox maps to the literal string `'medium'`; when omitted the field is `undefined` (not absent) in the request body.
- In cookie mode the login response carries no token; "signed in" means the viewer loaded and `isAuth` is `true`, never that a token exists.
- The viewer projection test pins exactly four fields (`id`, `email`, `role`, `verified`) to ensure the shell never receives the full `User` record.
- CASL fixtures must use the *packed* tuple format (`[action, subject, condition?]`) because the store unpacks them with CASL's own reader — an unpacked fixture would be a shape no real server sends.
