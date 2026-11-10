---
source: src/modules/account/tests/two-factor-store.spec.ts
sha256: 75a97790c12914f68adcb2cd6c3989ef32796674b15275806b7932bd4fdade7b
signature: cbd7816eed493bd55903db8d424b64993c0c2c61957878e1d40658f324f31ee1
generated_at: 2026-11-10T03:43:16.649410+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-store.spec.ts

## Purpose

Unit tests for the `useAccountTwoFactorStore` Pinia store, covering the enrollment machine (setup → confirm → backup codes), the login-time challenge flow, the `resendAfter` countdown, 429 rejection handling, and the guarantee that every write operation hits the transport each time (no client-side caching). Only the HTTP transport is mocked; the store logic under test runs for real.

## Key elements

- **`RejectWith` / `isRejectWith`** — A marker interface and type guard: a canned response entry shaped `{ __reject: unknown }` tells the mocked transport to reject (e.g. 429, 400) instead of resolve.
- **`responses`** — A `Record<string, unknown>` keyed by `` `${METHOD} ${url}` `` (e.g. `POST /account/2fa/methods/email/setup`). Set in `beforeEach` and overridden per-test to script the API.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a stub that looks up `responses` by the outgoing request's method + URL, returning either a parsed fixture (`parseOrvalFixture`) or a `Promise.reject`.
- **`requestedUrls()`** — Collects the `url` from every `orvalMutator` call in order; used to assert call sequencing and absence of caching.
- **`STATUS_OFF`** — The default canned response for `GET /account/2fa` (two-factor disabled), needed because the session store fetches it for every identified viewer.
- **`gateNextCall()`** — Holds the next transport call behind an unresolved promise so a test can read a loading flag mid-flight, then release.
- **`describe('fetchStatus')`** — Verifies basic status loading.
- **`describe('the enrollment machine')`** — Covers: setup (delivered vs. non-delivered methods, resend countdown start), confirm (first factor returns backup codes + refreshes status; second factor does not), `clearSetup`, 429 rejection with `retryAfter` seeding the cooldown, 400 rejection leaving cooldown untouched, `regenerateBackupCodes`, `removeMethod`, `disableAll`, and post-write status refetch.
- **`describe('every write reaches the API each time')`** — Repeats setup, confirm, remove, regenerate, and disable calls and asserts the transport saw each one (no store-level memoization).

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — The store under test; all assertions target its state and method returns.
- **`src/modules/account/stores/deletion-restore.ts`** — Imported (`useAccountDeletionRestoreStore`); likely exercised indirectly when session/account-view wiring triggers deletion-restore checks.
- **`src/infrastructure/http/index.ts`** — Its `orvalMutator` export is the sole transport mock target; no other HTTP layer is stubbed.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register DI providers so the store's internal dependencies resolve in tests.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `parseOrvalFixture` (validates canned entries against Orval-generated schemas) and `contractRequest` (helper for building request fixtures).
- **`tests/support/unit/fixtures.ts`** — `aProblem()` builds RFC 7807 problem objects used as rejection payloads (429, 400 cases).
- **`tests/support/unit/account-view.ts`** — `accountView` helper for setting up the account/session context that the store depends on.

## Notes

- The mock key format is strictly `` `${METHOD.toUpperCase()} ${url}` ``; a mismatch in casing or path will cause an unhandled `undefined` response.
- Every test that logs a user in must provide a `GET /account/2fa` entry in `responses`, because the session store fetches it unconditionally for identified viewers.
- The 429 test asserts the countdown starts from the server's `retryAfter` value (12 s) even though the call was *rejected*—the cooldown must seed on failure, not only on success.
- `gateNextCall` temporarily swaps the mock implementation once; it will interfere with other in-flight assertions if misused.
- The file follows the same transport-only mocking pattern as `sessions.spec.ts` and `auth-session.spec.ts` (noted in the module doc comment).
