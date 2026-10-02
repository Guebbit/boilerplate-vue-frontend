---
source: src/modules/account/tests/auth-login-mfa.spec.ts
sha256: e406fd3fe4ff1ff05b46fcf6629b7a57652d393a3a89da4f439edfa62739ca40
generated_at: 2026-10-02T12:20:39.445960+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-login-mfa.spec.ts

## Purpose

Unit tests for the `mfa` branch of `useAuthStore().login()`. Verifies that when the login endpoint returns an MFA challenge, the store resolves with the challenge payload and does **not** write to the session store or fetch the profile — the regression this narrowing was introduced to fix (storing `undefined` as a token, causing 401s that locked out every 2FA account). The companion file `auth-session.spec.ts` covers the plain `session` branch; this file only asserts the two are kept apart.

## Key elements

- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a stub that looks up responses in a module-level `responses` map keyed by `"METHOD /url"`.
- **`wireModulesIntoCore()`** – called once at module scope to register test module wiring so the store can resolve its dependencies.
- **`MFA_CHALLENGE`** – fixture object describing an MFA-required response (challenge token, expiry, delivery methods).
- **`requestedUrls()`** – helper that extracts the `url` field from each recorded `orvalMutator` call, used to assert no extra HTTP requests were made.
- **`describe('login — the mfa branch')`** – three tests: (1) resolves with `{ kind: 'mfa', … }` echoing the challenge, (2) only hits `/account/login` (no profile fetch), (3) session store remains in its initial unauthenticated state.
- **`describe('login — the session branch')`** – single smoke test confirming a plain login still resolves `{ kind: 'session' }` and sets `session.isAuth` to `true`.
- **`beforeEach`** – resets Pinia, clears mocks, and pre-populates `responses` with default fixtures for `/account/abilities`, `/account/login` (token), and `/account` (profile).

## Relationships

- **`src/infrastructure/http/index.ts`** – the module under mock. `orvalMutator` is the sole HTTP entry point the auth store calls; this spec stubs it so no real network I/O occurs and responses are controlled per-test.
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, which must run before any test so the DI/module graph is available to the Pinia stores.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – provides `orvalEnvelope()` (builds a typed API response envelope around a payload) and `parseOrvalFixture()` (deserializes the envelope back into a plain object), both used to keep fixture construction and the mock's return value consistent.

## Notes

- The `responses` map is mutated per-test (e.g., swapping in `MFA_CHALLENGE`) rather than parameterised via a helper; tests override `responses['POST /account/login']` inline.
- The session-branch test here is intentionally minimal (one assertion pair) — its full contract lives in `auth-session.spec.ts`. This file only guards the *boundary* between the two branches.
- `orvalMutator` is mocked with a factory that inspects `config.method` and `config.url` at call time, so the same mock serves both the auth store's login call and the session store's abilities/profile calls without needing separate interceptors.
