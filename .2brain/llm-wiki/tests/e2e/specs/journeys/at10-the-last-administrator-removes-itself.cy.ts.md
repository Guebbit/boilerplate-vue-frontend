---
source: tests/e2e/specs/journeys/at10-the-last-administrator-removes-itself.cy.ts
sha256: 8166ca0d224662d60599d00c181a9705f0d5049d122c5a00b63802a7fe313e4e
generated_at: 2026-10-17T02:07:22.299072+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at10-the-last-administrator-removes-itself.cy.ts

## Purpose

End-to-end (Cypress) journey test that pins the behaviour when a shop's sole administrator deactivates their own account. It verifies the intentional lock-out: the session ends immediately, the login is refused with the correct credentials, admin-only pages become inaccessible to remaining staff, the admin role cannot be re-assigned, and the account cannot be reactivated through the application (repair is a database-level technician task by design).

## Key elements

- **`isTurnedBack(path)`** — Local helper that visits a locale-prefixed path and asserts the user is redirected to `/en` (Home) with a `.v-alert` notice, confirming access was denied.
- **`describe('AT10 · The last administrator removes itself')`** — Single test suite with one test case.
- **`beforeEach`** — Calls `cy.restore()` to reset the test database, then re-visits `/en`.
- **`it('the administrator switches itself off…')`** — The sole test, structured as a sequence of `cy.step()` blocks:
  1. Admin opens their own user page, unchecks "active", confirms the self-lockout warning, PATCH succeeds (200).
  2. Next navigation lands on the login page (session gone).
  3. Logging back in with the same credentials shows a login error.
  4. Moderator is redirected from `/en/api-keys` with an alert.
  5. Moderator's `PATCH` to assign `role: 'admin'` to a user returns **409**; the user's role stays `undefined`.
  6. Moderator's UI cannot open edit/manage-access for the deactivated admin; a `PATCH { active: true }` returns **403**; the admin stays `active: false`.

## Relationships

- **`tests/support/e2e/harness.ts`** — Provides `loginDevice` (obtain an authenticated API device for a role) and `requestAsDevice` (issue an HTTP request as that device). Used in steps 5 and 6 to exercise the API as the `moderator` role without a browser session, asserting the 409/403 responses.

## Notes

- The file header declares `requires-module: account, api-keys, users`; the test will fail if any of those modules are absent from the test environment.
- The design is explicitly "no in-app repair": the test asserts that the repair affordances are *missing* (`user-go-to-edit` and `user-manage-access` do not exist) rather than merely erroring.
- The self-warning UI (`user-access-self-warning`) must be present and acknowledged before the PATCH fires; the test does not skip the confirmation step.
- `uncheck({ force: true })` is used on the active checkbox, suggesting the element may be in a state where normal interaction is unreliable (e.g., partially disabled or obscured).
