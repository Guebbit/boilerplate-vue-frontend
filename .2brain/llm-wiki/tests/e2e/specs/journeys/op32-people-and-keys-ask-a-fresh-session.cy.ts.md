---
source: tests/e2e/specs/journeys/op32-people-and-keys-ask-a-fresh-session.cy.ts
sha256: b87d6aed9d1980a3f7696dad3e90d97dda4a29d7e20d9cfc337d4cb6058f0c70
signature: b9c482a4234c0d99ec8cb0d80a9616347a76c64bb99e8692a3850effff4f2863
generated_at: 2026-11-10T07:16:38.903051+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op32-people-and-keys-ask-a-fresh-session.cy.ts

## Purpose

E2E journey (OP32) verifying that sensitive admin actions—role grant/removal, account creation with a role, and API-key minting—trigger a re-authentication password dialog once the sign-in exceeds the 5-minute critical window, while less sensitive actions (phone edit, key revocation) do not. It also confirms the dialog stays open on a wrong password and carries the action forward exactly once with the correct one.

## Key elements

- **`PAST_CRITICAL_MS` (400 000)** – Time constant: past the 300 s critical window but inside the 600 s access-token lifetime; used with `cy.travel()`.
- **`DAY_MS`** – One day in ms; sets the expiry for the minted API key.
- **`UserLike`** – Minimal `{ role?: string }` shape for API response assertions.
- **`wrongThenRight()`** – Drives the re-auth dialog: types a wrong password (verifies error + dialog persists), then types the admin's real password (fetched via `cy.accountOf('admin')`) and verifies the dialog dismisses.
- **`pickRole(userId, label)`** – Visits a user page, opens the access dialog, selects a role by label, and confirms.
- **`describe` / single `it`** – The full journey in one test: sign-in → stale → grant role (asks) → phone edit (does not ask) → remove role (asks) → create account with role (asks) → mint key (asks, secret shown once) → revoke key (does not ask).

## Relationships

- **`tests/support/e2e/integrator.ts`** – Provides `datetimeLocalIn(ms)`, used to fill the API-key expiry date input as a local datetime string.
- **`tests/support/e2e/steps.ts`** – Provides `eventually(fn, predicate)`, a retrying polling wrapper used to assert that role changes are reflected in the API before proceeding.

## Notes

- **Demo-only:** the test calls `cy.skipUnlessDemo()`; time travel (`cy.travel`) is only available against the demo backend clock.
- **Re-auth dialog contract:** a wrong password keeps the dialog open (no action taken); the correct password both closes the dialog *and* re-executes the pending action exactly once.
- **No explicit `cy.travel()` before the role-removal step:** the comment explains the admin's last successful password is already >400 s old from the grant step, so the removal must still trigger re-auth without an additional clock jump.
- **`cy.restore()` in `beforeEach`** resets demo state between runs; the journey is self-contained in a single `it`.
- The `requires-module` directive at the top (`account, api-keys, users`) signals which feature modules this journey depends on.
