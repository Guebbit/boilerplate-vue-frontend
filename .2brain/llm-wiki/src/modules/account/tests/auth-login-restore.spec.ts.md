---
source: src/modules/account/tests/auth-login-restore.spec.ts
sha256: beda299064c51ee5e332bc7a371aaf8f1e6c158a2c7b892c70480ca08b3cf67e
signature: 6067a943d1619a24c0d63b4d016bcb5b38498887280c8a91895be6d726a95779
generated_at: 2026-11-10T03:30:28.718622+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-login-restore.spec.ts

## Purpose

Unit tests for the deletion-grace sign-in branch: `login()` resolves with a `deletion-pending` outcome (no session issued), and the deletion-restore store later redeems the claim check to adopt the session. Covers the happy path, the OAuth variant (cookie-based claim check), the remember-me tier mapping, and the error path where the API rejects the claim check.

## Key elements

- **`DELETION_PENDING`** — Canned `POST /account/login` response carrying `deletionPending: true`, a challenge token, and expiry/purge dates.
- **`responses`** — Mutable per-test map (`METHOD /url → payload`) that the mocked transport consults; tests override entries to simulate failures.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a function that resolves `parseOrvalFixture(method, url, responses[key])`, so every HTTP call goes through orval schema validation.
- **`requestedUrls()`** — Returns the ordered list of URLs the mocked transport received, used to assert call sequences.
- **`openOffer(remember)`** — Helper that calls `useAccountAuthStore().login(…)`, asserts the outcome is `deletion-pending`, then calls `useAccountDeletionRestoreStore().begin(outcome, remember)` — mirroring what `Login.vue` does.
- **`describe('login — the deletion-pending branch')`** — Verifies `useAccountAuthStore().login()` resolves with the claim-check outcome, hits only `/account/login`, and does **not** start a session.
- **`describe('the deletion-restore store')`** — Verifies `useAccountDeletionRestoreStore().restoreAndSignIn()`: hits `/account/login/restore`, adopts the JWT into the session store, clears `pending`; sends `remember: 'long'` when the checkbox was ticked; omits `challenge` for the OAuth branch; rejects with `NO_ACTIVE_RESTORE` when no offer exists; preserves the offer when the API returns 401.

## Relationships

- **`src/modules/account/stores/auth.ts`** — Calls `useAccountAuthStore().login()` to trigger the deletion-pending code path.
- **`src/modules/account/stores/deletion-restore.ts`** — Exercises `useAccountDeletionRestoreStore().begin`, `.beginOAuth`, and `.restoreAndSignIn`; asserts `pending` state transitions.
- **`src/infrastructure/http/index.ts`** — Mocked in its entirety; `orvalMutator` is the single HTTP seam under test.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` bootstraps module wiring so stores can resolve their dependencies.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` deserialises canned responses; `contractRequest` validates outgoing request bodies against orval schemas.
- **`tests/support/unit/account-view.ts`** — `accountView(…)` builds a typed account fixture for the `GET /account` canned response.

## Notes

- The file header notes it shares the same transport-mock pattern as `auth-login-mfa.spec.ts`; if that pattern changes, update both.
- `responses` is a module-level `let`, not a `const`; tests mutate it (e.g., setting a rejected promise) to simulate API failures. `beforeEach` resets it to the happy-path defaults.
- The OAuth test (`beginOAuth`) intentionally asserts `call.data.challenge` is **undefined** — in that flow the claim check travels as a cookie, not a body field.
- `remember: true` (UI checkbox) maps to the wire value `'long'` in the restore body; this mapping lives in the store, not the test.
