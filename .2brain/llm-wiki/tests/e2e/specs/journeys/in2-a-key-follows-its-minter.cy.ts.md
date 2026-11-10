---
source: tests/e2e/specs/journeys/in2-a-key-follows-its-minter.cy.ts
sha256: 36b067d134df4a3f3c84789d89f8a377d438b4ca802d1384b7d23945d4b786c2
signature: e428558312cb0a007acb9e97ff792c4f84c24db2b7119fd336a1ce27e7456a01
generated_at: 2026-11-10T07:08:48.016257+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in2-a-key-follows-its-minter.cy.ts

## Purpose

End-to-end journey test (IN2) that verifies the invariant "a key is only as good as its minter": an API key's effective permissions and liveness track the minter's current role and status in real time. It promotes a shopper to admin, mints a single-permission read key, then confirms that banning the minter yields 401, demoting yields 403 (floored to customer rules), and restoring either state brings the key back to 200.

## Key elements

- **`GIVEN`** — the sole permission minted on the key: `'read:WebhookSubscription'`.
- **`DAY_MS`** — key TTL (1 day), passed to `datetimeLocalIn` for the expiry field.
- **`AuditRowLike`** — local minimal interface (`action`, `actorRole`) used to assert the ban appears in the audit log.
- **`describe('IN2 · A key follows its minter')`** — single test case that walks the full lifecycle: mint → read → moderator denial → admin ban → 401 → unban → 200 → demote → 403 → re-promote → 200 → audit confirmation.
- **`enrolAuthenticatorApp()`** — armed during setup; without it a staff role grants no permissions and no key can be minted.

## Relationships

- **`tests/support/e2e/harness.ts`** — supplies `requestWithKey` (issues an API request authenticated by a minted secret) and `loginDevice` (obtains a device token for the moderator's `refusedWith` call).
- **`tests/support/e2e/integrator.ts`** — supplies `datetimeLocalIn(ms)` to produce the `datetime-local` string for the key-expiry input.
- **`tests/support/e2e/security-steps.ts`** — supplies `enrolAuthenticatorApp` (enrolls a TOTP authenticator so the promoted role actually takes effect).
- **`tests/support/e2e/steps.ts`** — supplies `eventually` (poll until the audit row appears) and `refusedWith` (assert a specific HTTP status + error code on a failed request).

## Notes

- The file header declares `requires-module: account, api-keys, users, webhooks`; the test will fail if any of those modules is absent.
- The moderator step verifies both the **UI** (no ban control rendered) and the **API** (403 `ROLE_MANAGEMENT_REQUIRED`)—a two-layer assertion.
- Ban/unban/demote transitions are exercised via `cy.apiAs` (direct API calls) except the ban itself, which goes through the UI access dialog to exercise that specific path.
- The audit-log check uses `eventually` (retry-until) because the audit write may be async relative to the ban response.
