---
source: src/modules/account/tests/auth-login-mfa.spec.ts
sha256: e939b46717211546c80b9772d12ee0b52081712be907cd1e09697c710cca7d8b
generated_at: 2026-10-17T00:20:49.448308+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-login-mfa.spec.ts

## Purpose

Unit tests for the **MFA branch** of `useAuthStore().login()`. The critical contract under test: when the server responds with a `mfaRequired` challenge, the Promise must resolve with the challenge payload and must **not** write anything into the session store or trigger a profile fetch. A single minimal session-branch test is included only as a contrast assertion; the full session flow lives in `auth-session.spec.ts`.

## Key elements

- **`responses`** (module-level `Record<string, unknown>`) — mutable bag of canned HTTP responses keyed by `"METHOD /url"`. Each test sets its specific key before invoking `login()`.
- **`requestedUrls()`** — reads `vi.mocked(orvalMutator).mock.calls` and returns the URL of every transport call in order. Used to assert no extra requests were made.
- **`MFA_CHALLENGE`** — canned fixture mirroring a real 2FA response (challenge token, expiry, email method).
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that looks up `responses` by method+URL and wraps the raw body via `parseOrvalFixture`.
- **`beforeEach`** — resets Pinia, clears mocks, and seeds the three default endpoints every login spec needs (`/account/abilities`, `POST /account/login`, `GET /account`).
- **`describe('login — the mfa branch')`** — three tests: (1) resolves with the full challenge object, (2) only `/account/login` was called (no profile fetch), (3) session store remains completely unauthed.
- **`describe('login — the session branch')`** — one test confirming `kind: 'session'` resolution and `isAuth === true`.

## Relationships

- **`src/modules/account/stores/auth.ts`** — the system under test; `useAuthStore().login(email, password)` is the only production code exercised.
- **`src/infrastructure/http/index.ts`** — the sole import mocked. `orvalMutator` is spied on to both supply responses and verify call order/count.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register the stores so Pinia can resolve them outside a component tree.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the project's standard `{ data, meta }` shape) and `parseOrvalFixture` (extracts the payload back out inside the mock).

## Notes

- The mock is registered **once at import time**; tests mutate `responses` rather than re-mocking, so ordering of the `beforeEach` reset matters.
- `useSessionStore` is imported from `@/infrastructure/session.ts` (not in the listed graph neighbors) purely for read-only assertions that the store was *not* touched.
- The file deliberately does **not** test MFA code entry (submitting the challenge code back); that is a separate flow owned elsewhere.
- The session-branch test is intentionally thin — it exists only to confirm the discriminated union shape (`kind: 'session'` vs. `kind: 'mfa'`) so regressions in the `if/else` are caught here, not in the full session spec.
