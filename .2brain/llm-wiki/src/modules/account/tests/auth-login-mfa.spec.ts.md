---
source: src/modules/account/tests/auth-login-mfa.spec.ts
sha256: ddc4c853d47b97b07c9c9404da46dce6a3b522f5b8a211e13bd48f4eda050dbc
signature: 48bf47cd04ed5c2a35239f13dc3c261c77b8997234c0983b9c2d7bdeb03b8c8f
generated_at: 2026-11-10T03:30:01.989484+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-login-mfa.spec.ts

## Purpose

Unit tests for the **`mfa` branch** of `useAccountAuthStore().login()`. They verify that when the login endpoint returns an MFA challenge, the store resolves with the challenge payload **without** storing a token, fetching the profile, or mutating the session store — the exact regression (storing `undefined` as a token → 401 on profile fetch → 2FA accounts locked out) this narrowing was introduced to fix. A single contrast test for the `session` branch is included for completeness.

## Key elements

- **`MFA_CHALLENGE`** – Canned `POST /account/login` response representing a two-factor challenge (email method, claim-check token, expiry).
- **`responses`** – Per-test `Record<string, unknown>` of canned HTTP bodies keyed by `"METHOD /url"`, reset in `beforeEach` with a default token + `GET /account` profile.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a fake that looks up `responses[key]` and pipes it through `parseOrvalFixture`.
- **`requestedUrls()`** – Helper that reads the mock's call history to assert *which* endpoints were hit.
- **`describe('login — the mfa branch')`** – Three tests: (1) resolves `{ kind: 'mfa', challenge, … }`; (2) only `/account/login` is requested (no profile fetch); (3) session store remains untouched (`accessToken`, `viewer`, `isAuth` all falsy).
- **`describe('login — the session branch')`** – One test confirming the plain-login path still resolves `{ kind: 'session' }` and sets `isAuth`.

## Relationships

- **`src/modules/account/stores/auth.ts`** – Imports `useAccountAuthStore`; the class under test.
- **`src/infrastructure/http/index.ts`** – Mocks `orvalMutator` so no real HTTP occurs; the mock delegates to `parseOrvalFixture`.
- **`tests/support/unit/wire-modules.ts`** – Calls `wireModulesIntoCore()` at module scope to register DI bindings before any test runs.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` normalizes raw canned responses into the shapes the store expects.
- **`tests/support/unit/account-view.ts`** – `accountView()` builds the default `GET /account` profile body used in `beforeEach`.

## Notes

- `wireModulesIntoCore()` runs **once** at module top-level, not per test; mutating it in `beforeEach` would be redundant.
- The `beforeEach` default `responses` map includes a valid token for `POST /account/login`. MFA tests **overwrite** that key with `MFA_CHALLENGE`; the session-branch test relies on the default.
- The file deliberately includes a minimal session-branch test even though `auth-session.spec.ts` is the primary home for that path — it acts as a guard that the union discriminant hasn't been accidentally widened or renamed.
