---
source: src/modules/account/tests/auth-session.spec.ts
sha256: dc5e79a8aa66d87ed8612c7b006b1f820319111bee0bad5e28e48456b01c5872
generated_at: 2026-10-02T14:49:04.169858+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-session.spec.ts

## Purpose

Unit tests for the auth store's session flows (login, logout, logoutEverywhere, password reset). The strategy is to mock **only** the HTTP transport (`orvalMutator`) and let every layer above it—the generated client, the session/profile/observability stores, the CASL ability reader—run for real. This means assertions target the same state the router guards actually read, rather than an isolated store in isolation. `signup` is deliberately excluded and lives in a sibling spec.

## Key elements

- **`responses` table** – A mutable `Record<string, unknown>` keyed by `"METHOD /path"`. Each test overwrites individual entries rather than re-mocking the module, keeping the default response shape in one place.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a function that looks up `responses` by URL+method, wraps the lookup in `parseOrvalFixture`, and resolves `undefined` for unknown endpoints (many actions ignore their body).
- **`requestedUrls()`** – Convenience accessor over `orvalMutator` mock calls; returns the ordered list of URLs hit. Used to assert call ordering (e.g. login → profile → abilities).
- **`USER`** – A representative user record reused across login/session assertions.
- **`describe('login')`** – Covers token storage, request ordering, `remember` tier mapping, viewer projection (only `id`, `email`, `role`, `verified`), CASL ability evaluation for customer and admin roles, ability clearing on session end, and the no-token fallback.
- **`describe('logout')`** – Covers single-session endpoint (`/account/logout`), state reset (`accessToken`, `viewer`, `isAuth`), Umami identity reset (`identify({id:null})` + `umami.disabled` flag), and profile cache invalidation.
- **`describe('the password reset flow')`** – Covers `requestPasswordReset` and `confirmPasswordReset` endpoint calls and payloads.
- **`wireModulesIntoCore()`** – Called once at module scope; wires the dependency-injection graph so the real stores resolve their collaborators without a running app.

## Relationships

- **`src/infrastructure/http/index.ts`** – The file under mock. `orvalMutator` (the transport the generated orval client calls) is replaced with a URL-keyed stub so the tests control responses without a network.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, invoked at the top of this spec to register real store implementations into the module graph before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a payload in the API's success envelope), `parseOrvalFixture` (validates/normalises the mocked response against the orval-generated schema), and `contractRequest` (request-contract helper used in the truncated portion).

## Notes

- The mock deliberately resolves `undefined` for endpoints not in the `responses` table rather than throwing—several auth actions fire-and-forget their response body, and forcing every URL into the table would conflate "called" with "matters."
- The no-token test (`leaves the session anonymous…`) bypasses the `responses` table entirely via `mockImplementationOnce`, because a `data: {}` body is impossible against the real orval contract; it exists to pin `getTokenFromResponse`'s own defensive branch.
- Ability fixtures use CASL's packed rule format (`[action, subject, conditions?]`). The comments emphasise that tests assert against **rules**, not role names—there is no wildcard, and the admin fixture stops at the tenant-scope boundary.
- `signup` is explicitly out of scope here; see `auth-signup.spec.ts`.
- The file is truncated in the snapshot; the password-reset describe block (confirm step) is cut off, so additional sub-tests may exist beyond what is visible.
