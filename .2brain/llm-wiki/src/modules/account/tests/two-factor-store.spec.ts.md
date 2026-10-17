---
source: src/modules/account/tests/two-factor-store.spec.ts
sha256: 1614d9cdca0f0b4978aef47784fd02c88efeaf6881ce2d60eff4e6ff51886710
generated_at: 2026-10-17T00:27:44.246223+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-store.spec.ts

## Purpose

Unit tests for `useTwoFactorStore()`, covering the full enrollment flow (setup → confirm → backup codes), the login-time challenge, the `resendAfter` countdown behaviour, and 429 / wrong-code rejections. Only the HTTP transport is mocked; the store logic itself runs for real.

## Key elements

- **`RejectWith` / `isRejectWith`** — a marker shape (`{ __reject: unknown }`) and its type guard. A `responses` entry shaped this way makes the mocked `orvalMutator` call reject instead of resolve, simulating API error envelopes (e.g. 429 resend-too-soon, 400 invalid method).
- **`responses`** — a per-test `Record<"METHOD /url", unknown>` table that the mocked `orvalMutator` reads. Populated in `beforeEach` with defaults (`GET /account/abilities`, `GET /account/2fa`) and overridden per test.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by `METHOD url` and either resolves via `parseOrvalFixture` or rejects with the raw error object.
- **`requestedUrls()`** — helper that maps `orvalMutator` mock calls to their URL strings, used to assert call order and that no request is served from a local cache.
- **`gateNextCall()`** — suspends the next transport call behind a manual `Promise`, allowing assertions on loading flags mid-flight. Returns a `release()` function.
- **`STATUS_OFF`** — a shared canned `orvalEnvelope` representing 2FA disabled, reused as the default `GET /account/2fa` response.
- **Test suites (`describe` blocks):**
  - *fetchStatus* — basic load.
  - *the enrollment machine* — device vs. delivered setup, first vs. second confirm (backup codes present vs. absent), `clearSetup`, 429 cooldown start, non-retry rejections, `regenerateBackupCodes`, `removeMethod` / `disableAll` status refetch.
  - *every write reaches the API each time* — verifies that repeated setup / remove / regenerate / confirm / disable calls each hit the transport (no client-side caching).
  - *(truncated section)* — login-time challenge and 429 surfacing.

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — the module under test; `useTwoFactorStore()` is imported and exercised directly.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is imported (and then fully mocked) as the sole transport boundary the store calls through.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register test doubles with the app's module registry before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wrap a payload in the API's success envelope), `parseOrvalFixture` (validate/shape a canned response), and `contractRequest` (build request assertions) used throughout the spec.

## Notes

- The `beforeEach` defaults include a `GET /account/abilities` response; the session store (`@/infrastructure/session.ts`, a transitive dependency) fetches this for every identified viewer, so omitting it causes unrelated failures.
- 429 rejections carry a `retryAfter` inside the error's `details` array; the store is expected to start its own countdown from that value even though the call *failed*. Rejections without `retryAfter` must leave `secondsUntilResend` at 0.
- Setup/confirm payloads are intentionally **not** persisted on the store (tests assert `store.setup`, `store.confirmed` are absent) — they are returned to the caller only, preventing accidental secret leakage into reactive state.
- The pattern mirrors `sessions.spec.ts` and `auth-session.spec.ts`: mock only the transport, let Pinia state run for real.
